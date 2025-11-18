/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'node:path';
import fs from 'node:fs';
import util from 'node:util';
import { fork } from 'node:child_process';
import { globby, isDynamicPattern } from 'globby';
import YAML from 'js-yaml';
import {
  pass, fail, skip, incr_total, NUM_WORKERS, type WorkerToSupervisor, type Test, type SupervisorToWorker, run, startTestPrinter, setSlowTestThreshold,
  readList,
  fatal,
  pendingWork,
  printStatusLine,
  failed,
} from '../base.mts';

const Test262Repo = process.env.TEST262 || path.resolve(import.meta.dirname, 'test262');
const Test262Tests = path.join(Test262Repo, 'test');
const LastRunFailedList = path.resolve(import.meta.dirname, 'last-failed-list');
const CurrentRunFailureLog = path.resolve(import.meta.dirname, 'last-failed.log');
const AssertToBeFailedList = path.resolve(import.meta.dirname, 'failed');
const SkipList = path.resolve(import.meta.dirname, 'skip');
const SlowList = path.resolve(import.meta.dirname, 'slow');
const Features = path.resolve(import.meta.dirname, 'features');

const test262TestPaths = (() => {
  let files: string[] | undefined;
  return async () => {
    if (!files) {
      files = [];
      for await (const file of readdir(Test262Tests)) {
        files.push(file);
      }
    }
    return files;
  };
})();
let mayExit = false;
const workerCanHoldTasks = 1;

// Read everything in argv after node and this file.
const ARGV = util.parseArgs({
  args: process.argv.slice(2),
  allowNegative: true,
  allowPositionals: true,
  strict: true,
  options: {
    'help': { type: 'boolean', short: 'h' },
    'feature': { type: 'string' },
    'list': { type: 'boolean' },
    'update-slow-tests': { type: 'string' },
    'update-failed-tests': { type: 'boolean' },
    'run-slow-tests': { type: 'boolean' },
    'run-failed-only': { type: 'boolean' },

    'strict-only': { type: 'boolean' },
    // alias for --strict-only
    'fast': { type: 'boolean' },
  },
});

const disabledFeatures = new Set<string>();
readList(Features).forEach((f) => {
  if (f.startsWith('-')) {
    disabledFeatures.add(f.slice(1));
  }
});
disabledFeatures.delete(ARGV.values.feature!);

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
    --feature [feature]
        Only run tests that has the specified feature.
    --list
        List all files found.
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
  const stream = fs.createWriteStream(SlowList, { encoding: 'utf-8', flags: 'a' });
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
  ARGV.positionals = fs.readFileSync(LastRunFailedList, { encoding: 'utf-8' }).split('\n');
}

const workers = Array.from({ length: NUM_WORKERS }, (_, index) => createWorker(index));

const [slowList, skipList, assertFailedList] = await Promise.all([readListPaths(SlowList, false), readListPaths(SkipList, false), readListPaths(AssertToBeFailedList, false)]);
const lastRunFailedListStream = fs.createWriteStream(LastRunFailedList, { encoding: 'utf-8' });
const currentRunFailureLogStream = fs.createWriteStream(CurrentRunFailureLog, { encoding: 'utf-8' });
const failedListStream = ARGV.values['update-failed-tests'] ? fs.createWriteStream(AssertToBeFailedList, { encoding: 'utf-8', flags: 'a' }) : undefined;
if (failedListStream) {
  failedListStream.write('\n# Failed tests appended by --update-failed-tests\n');
}
const currentRunFailedTests = new Set<string>();
const isDisabled = (feature: string) => disabledFeatures.has(feature);

const pendingTasks: Test[] = [];
function queueTest(test: Test) {
  incr_total();

  if (test.attrs.features?.some(isDisabled) || skipList.has(test.file) || (slowList.has(test.file) && !ARGV.values['run-slow-tests'])) {
    skip();
    return;
  }
  pendingTasks.push(test);
  distributeTest();
}

const postRunShowFiles: string[] = [];
async function onExit() {
  if (ARGV.values.list) {
    process.stdout.write('\n');
    process.stdout.clearLine(0);
    process.stdout.write(`${postRunShowFiles.length} tests found:\n`);
    for (const file of postRunShowFiles) {
      process.stdout.clearLine(0);
      process.stdout.write(`  ${file}\n`);
    }
  }
  clearInterval(stop);
  workers.forEach((x) => x.kill());

  process.stdout.write('\n');
  printStatusLine();
  process.stdout.write('\n');
  process.exitCode = failed ? 1 : 0;
}

function distributeTest() {
  while (true) {
    let candidate = pendingWork.findIndex((work) => work === 0);
    if (candidate === -1) {
      candidate = pendingWork.findIndex((work) => work < workerCanHoldTasks);
    }
    if (candidate === -1) {
      return;
    }
    if (!pendingTasks.length) {
      if (mayExit && pendingWork.every((work) => work === 0)) {
        onExit();
      }
      return;
    }
    workers[candidate].send(pendingTasks.shift()! satisfies SupervisorToWorker);
    pendingWork[candidate] += 1;
  }
}

const visited = new Set<string>();
const stop = startTestPrinter();

const promises = [];
for await (const file of parsePositionals(ARGV.positionals, true)) {
  if (visited.has(file) || /annexB|intl402|_FIXTURE|README\.md|\.py|\.map|\.mts/.test(file)) {
    continue;
  }

  if ((ARGV.positionals.length || ARGV.values.feature) && ARGV.values.list) {
    postRunShowFiles.push(path.relative(process.cwd(), file));
  }
  visited.add(file);
  promises.push(fs.promises.readFile(file, 'utf8').then((contents) => {
    const frontmatterYaml = contents.match(/\/\*---(.*?)---\*\//s)?.[1];
    const attrs: any = frontmatterYaml ? YAML.load(frontmatterYaml) : {};

    if (ARGV.values.feature) {
      if (!attrs.features || !attrs.features.includes(ARGV.values.feature)) {
        postRunShowFiles.splice(postRunShowFiles.indexOf(path.relative(process.cwd(), file)), 1);
        return;
      }
    }

    attrs.flags = (attrs.flags || []).reduce((acc: any, c: any) => {
      acc[c] = true;
      return acc;
    }, {});
    attrs.includes = attrs.includes || [];

    const test: Test = {
      file: path.relative(Test262Tests, file),
      attrs,
      contents,
      flags: '',
    };

    if (test.attrs.flags.module) {
      queueTest({ ...test, flags: 'module' });
    } else {
      if (!test.attrs.flags.onlyStrict && !ARGV.values['strict-only'] && !ARGV.values.fast) {
        queueTest(test);
      }

      if (!test.attrs.flags.noStrict && !test.attrs.flags.raw) {
        queueTest({ ...test, flags: 'strict', contents: `'use strict';\n${test.contents}` });
      }
    }
  }));
}

if (ARGV.positionals.length && !promises.length) {
  fatal(`No tests found based on the given globs: ${ARGV.positionals.join(', ')}`);
}

await Promise.all(promises);
mayExit = true;
distributeTest();

async function readListPaths(file: string, defaults: boolean) {
  const list = readList(file);
  const files = new Set<string>();
  for await (const file of parsePositionals(list, defaults)) {
    files.add(path.relative(Test262Tests, file));
  }
  return files;
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

async function* parsePositional(pattern: string): AsyncGenerator<string> {
  if (!isDynamicPattern(pattern)) {
    const a_path = path.join(Test262Tests, pattern);
    const a = await fs.promises.stat(a_path).catch(() => undefined);
    if (a?.isDirectory()) {
      return yield* readdir(a_path);
    } else if (a?.isFile()) {
      return yield a_path;
    }

    const b_path = path.join(process.cwd(), pattern);
    const b = await fs.promises.stat(b_path).catch(() => undefined);
    if (b?.isDirectory()) {
      return yield* readdir(b_path);
    } else if (b?.isFile()) {
      return yield b_path;
    }

    const files = await test262TestPaths();
    const matched = files.filter((f) => f.toLowerCase().includes(pattern.toLowerCase()));
    if (matched.length) {
      return yield* matched;
    }
  }

  const files1 = await globby(pattern, { cwd: Test262Tests, absolute: true, caseSensitiveMatch: false });
  if (files1.length) {
    return yield* files1;
  }

  const files2 = await globby(pattern, { cwd: process.cwd(), absolute: true, caseSensitiveMatch: false });
  if (files2.length) {
    return yield* files2;
  }
  return undefined;
}

async function* parsePositionals(pattern: string[], defaults: boolean): AsyncGenerator<string> {
  if (!pattern.length) {
    if (defaults) {
      yield* readdir(Test262Tests);
    }
    return;
  }
  for (const p of pattern) {
    if (p) {
      yield* parsePositional(p);
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
        pendingWork[workerId] -= 1;
        if (pendingWork[workerId] < workerCanHoldTasks) {
          distributeTest();
        }
        if (assertFailedList.has(message.file)) {
          if (currentRunFailedTests.has(message.file)) {
            return undefined;
          } else {
            currentRunFailedTests.add(message.file);
            return fail(workerId, message.file, 'The test is declared to be failed, but passed', '');
          }
        }
        return pass(workerId);
      case 'FAIL': {
        pendingWork[workerId] -= 1;
        if (pendingWork[workerId] < workerCanHoldTasks) {
          distributeTest();
        }
        if (assertFailedList.has(message.file)) {
          return skip(workerId);
        }
        const skipReport = currentRunFailedTests.has(message.file);
        const err = message.error.split('\n').map(message.description ? (l) => `    ${l}` : (l) => `  ${l}`).join('\n');
        currentRunFailureLogStream.write(`${message.file}\n  ${message.flags ? `[${message.flags}] ` : ''}${message.description}\n${err}\n\n`);
        if (skipReport) {
          return skip(workerId);
        }

        currentRunFailedTests.add(message.file);
        lastRunFailedListStream.write(`${message.file}\n`);
        if (failedListStream) {
          failedListStream.write(`${message.file}\n`);
        }
        return fail(workerId, message.file, message.description, err);
      }
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
