/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'node:path';
import fs from 'node:fs';
import util from 'node:util';
import { fork } from 'node:child_process';
import { globbySync, isDynamicPattern } from 'globby';
import YAML from 'js-yaml';
import {
  pass, fail, skip, incr_total, NUM_WORKERS, type WorkerToSupervisor, type Test, type SupervisorToWorker, run, startTestPrinter, setSlowTestThreshold,
  readList,
} from '../base.mts';

const TEST262 = process.env.TEST262 || path.resolve(import.meta.dirname, 'test262');
const TEST262_TESTS = path.join(TEST262, 'test');
const LAST_FAILED_LIST = path.resolve(import.meta.dirname, 'last-failed-list');
const LAST_FAILED_LOG = path.resolve(import.meta.dirname, 'last-failed.log');
const SKIP_LIST = path.resolve(import.meta.dirname, 'skiplist');
const FEATURES = path.resolve(import.meta.dirname, 'features');
const SLOW_LIST = path.resolve(import.meta.dirname, 'slowlist');

const disabledFeatures = new Set<string>();
readList(FEATURES).forEach((f) => {
  if (f.startsWith('-')) {
    disabledFeatures.add(f.slice(1));
  }
});

// Read everything in argv after node and this file.
const ARGV = util.parseArgs({
  args: process.argv.slice(2),
  allowNegative: true,
  allowPositionals: true,
  strict: true,
  options: {
    'help': { type: 'boolean', short: 'h' },
    'update-slow-tests': { type: 'string' },
    'update-failed-tests': { type: 'boolean' },
    'run-slow-tests': { type: 'boolean' },
    'run-failed-only': { type: 'boolean' },
  },
});
if (ARGV.values.help) {
  // eslint-disable-next-line prefer-template
  const usage = `
    Usage: node --experimental-strip-types ${path.relative(
    process.cwd(),
    import.meta.filename,
  )} [TEST-PATTERN]...
    Run test262 tests against engine262.

    TEST-PATTERN supports glob syntax, and is interpreted relative to
    the test262 "test" subdirectory or (if that fails for any pattern)
    relative to the working directory. If no patterns are specified,
    all tests are run.

    Environment variables:
    TEST262
        The test262 directory, which contains the "test" subdirectory.
        If empty, it defaults to the "test262" sibling of this file.
    NUM_WORKERS
        The count of child processes that should be created to run tests.
        If empty, it defaults to a reasonable value based on CPU count.

    Flags:
    --run-slow-tests
        Run slow tests that are listed in the slowlist file.
    --run-failed-only
        Run only the tests that failed in the previous run.
    --update-slow-tests=<number>
        Append tests that take longer than <number> seconds to the slowlist.
    --update-failed-tests
        Append failed tests to the skiplist.

    Files:
    features
        Specifies handling of test262 features, notably which ones to skip.
    skiplist
        Includes patterns of test files to skip.
    slowlist
        Includes patterns of test files to skip in the absence of
        --run-slow-tests.
`.slice(1);
  const indent = usage.match(/^\s*/)![0];
  process.stdout.write(
    `${usage
      .trimEnd()
      .split('\n')
      .map((line) => line.replace(indent, ''))
      .join('\n')}\n`,
  );
  process.exit(64);
}

if (ARGV.values['update-slow-tests']) {
  const second = parseInt(ARGV.values['update-slow-tests'], 10);
  if (Number.isNaN(second)) {
    throw new RangeError('--update-slow-tests must be a number');
  }
  const slowTests = new Set<string>();
  let lastSize = 0;
  const stream = fs.createWriteStream(SLOW_LIST, { encoding: 'utf-8', flags: 'a' });
  stream.write(`\n# Slow tests appended by --update-slow-tests=${second}\n`);
  setSlowTestThreshold(second, (f) => {
    slowTests.add(f);
    if (slowTests.size !== lastSize) {
      lastSize = slowTests.size;
      stream.write(`${f}\n`);
    }
  });
}
if (ARGV.values['run-failed-only']) {
  ARGV.positionals = fs.readFileSync(LAST_FAILED_LIST, { encoding: 'utf-8' }).split('\n');
}

startTestPrinter();

const workers = Array.from({ length: NUM_WORKERS }, (_, index) => createWorker(index));

const RUN_SLOW_TESTS = ARGV.values['run-slow-tests'];

const slowlist = new Set(readListPaths(SLOW_LIST));
const skiplist = new Set(readListPaths(SKIP_LIST));
const failedTests_list = fs.createWriteStream(LAST_FAILED_LIST, { encoding: 'utf-8' });
const failedTests_log = fs.createWriteStream(LAST_FAILED_LOG, { encoding: 'utf-8' });
const skiplist_stream = ARGV.values['update-failed-tests'] ? fs.createWriteStream(SKIP_LIST, { encoding: 'utf-8', flags: 'a' }) : undefined;
if (skiplist_stream) {
  skiplist_stream.write('\n# Failed tests appended by --update-failed-tests\n');
}
const failedTests = new Set<string>();
const isDisabled = (feature: string) => disabledFeatures.has(feature);

let workerIndex = 0;
function handleTest(test: Test) {
  incr_total();

  if (test.attrs.features?.some(isDisabled) || skiplist.has(test.file) || (slowlist.has(test.file) && !RUN_SLOW_TESTS)) {
    skip();
    return;
  }

  workers[workerIndex].send(test satisfies SupervisorToWorker);
  workerIndex += 1;
  if (workerIndex >= workers.length) {
    workerIndex = 0;
  }
}

let files: AsyncGenerator<string> | Iterable<string> = [];
const visited = new Set<string>();
if (ARGV.positionals.length === 0) {
  files = readdir(TEST262_TESTS);
} else {
  // Interpret pattern arguments relative to the tests directory,
  // falling back on the working directory if there are no matches
  // or a non-glob pattern fails to match.
  for (const arg of ARGV.positionals) {
    const matches = globbySync(arg, { cwd: TEST262_TESTS, absolute: true });
    if (matches.length === 0 && !isDynamicPattern(arg)) {
      files = [];
      break;
    }
    files = matches;
  }
  if (!Array.isArray(files)) {
    throw new Error('unreachable');
  }
  if (files.length === 0) {
    const cwd = process.cwd();
    for (const arg of ARGV.positionals) {
      const matches = globbySync(arg, { cwd, absolute: true });
      if (matches.length === 0 && !isDynamicPattern(arg)) {
        fs.accessSync(path.resolve(cwd, arg), fs.constants.R_OK);
      }
      files = matches;
    }
  }
}

const promises = [];

for await (const file of files) {
  if (visited.has(file) || /annexB|intl402|_FIXTURE|README\.md|\.py/.test(file)) {
    continue;
  }

  visited.add(file);
  promises.push(fs.promises.readFile(file, 'utf8').then((contents) => {
    const frontmatterYaml = contents.match(/\/\*---(.*?)---\*\//s)?.[1];
    const attrs: any = frontmatterYaml ? YAML.load(frontmatterYaml) : {};

    attrs.flags = (attrs.flags || []).reduce((acc: any, c: any) => {
      acc[c] = true;
      return acc;
    }, {});
    attrs.includes = attrs.includes || [];

    const test: Test = {
      file: path.relative(TEST262_TESTS, file),
      attrs,
      contents,
      flags: '',
    };

    if (test.attrs.flags.module) {
      test.flags = 'module';
      handleTest(test);
    } else {
      if (!test.attrs.flags.onlyStrict) {
        handleTest(test);
      }

      if (!test.attrs.flags.noStrict && !test.attrs.flags.raw) {
        test.contents = `'use strict';\n${test.contents}`;
        test.flags = 'strict';
        handleTest(test);
      }
    }
  }));
}

await Promise.all(promises);

workers.forEach((worker) => {
  worker.send('DONE' satisfies SupervisorToWorker);
});

function readListPaths(file: string) {
  return readList(file)
    .flatMap((t) => globbySync(path.resolve(TEST262, 'test', t), { absolute: true }))
    .map((f) => path.relative(TEST262_TESTS, f));
}

async function* readdir(dir: string): AsyncGenerator<string> {
  for await (const dirent of await fs.promises.opendir(dir)) {
    const p = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdir(p);
    } else {
      yield p;
    }
  }
}

function createWorker(workerId: number) {
  const c = fork(path.resolve(import.meta.dirname, './test262-worker.mts'));
  c.on('message', (message: WorkerToSupervisor) => {
    switch (message.status) {
      case 'RUNNING':
        return run(workerId, message.file, message.flags);
      case 'PASS':
        return pass(workerId);
      case 'FAIL': {
        const skipReport = failedTests.has(message.file);
        const err = message.error.split('\n').map(message.description ? (l) => `    ${l}` : (l) => `  ${l}`).join('\n');
        failedTests_log.write(`${message.file}\n  ${message.flags ? `[${message.flags}] ` : ''}${message.description}\n${err}\n\n`);
        if (skipReport) {
          return skip();
        }

        failedTests.add(message.file);
        failedTests_list.write(`${message.file}\n`);
        if (skiplist_stream) {
          skiplist_stream.write(`${message.file}\n`);
        }
        return fail(workerId, message.file, message.description, err);
      }
      case 'SKIP':
        return skip();
      default:
        throw new RangeError(JSON.stringify(message));
    }
  });
  c.on('exit', (code) => {
    if (code !== 0) {
      process.exit(1);
    }
  });
  return c;
}
