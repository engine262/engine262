/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, resolve, relative } from 'node:path';
import { createWriteStream } from 'node:fs';
import { opendir, readFile, stat } from 'node:fs/promises';
import { stripVTControlCharacters, styleText } from 'node:util';
import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { globby, isDynamicPattern } from 'globby';
import YAML from 'js-yaml';
import { highlight } from 'cli-highlight';
import {
  type WorkerToSupervisor, type SupervisorToWorker, Test,
  readList,
  type WorkerToSupervisor_Failed,
} from '../base.mts';
import { annotateFileWithURL, isCI } from '../tui.mts';
import {
  createTestReporter,
  supportColor,
  type SkipReason,
} from '../tui.mts';
import { fatal_exit } from '../base.mts';
import { args } from './test262.mts';

const inputs = {
  Test262TestsPath: join(process.env.TEST262 || resolve(import.meta.dirname, 'test262'), 'test'),
  AllTests: async () => {
    const files: string[] = [];
    for await (const file of readdir(inputs.Test262TestsPath)) {
      files.push(file);
    }
    inputs.AllTests = async () => files;
    return files;
  },
  AssertToBeFailedList: resolve(import.meta.dirname, 'failed'),
  SkipList: resolve(import.meta.dirname, 'skip'),
  SlowList: resolve(import.meta.dirname, 'slow'),
  SlowListCI: resolve(import.meta.dirname, 'slow-ci'),
  Features: resolve(import.meta.dirname, 'features'),
};

const outputs = {
  LastRunFailedList: resolve(import.meta.dirname, 'last-failed-list'),
  CurrentRunFailureLog: resolve(import.meta.dirname, 'last-failed.log'),
};
const outputStreams = {
  SlowList: args.values['update-slow'] ? createWriteStream(inputs.SlowList, { encoding: 'utf-8', flags: 'a' }) : undefined,
  LastRunFailedList: createWriteStream(outputs.LastRunFailedList, { encoding: 'utf-8' }),
  CurrentRunFailureLog: createWriteStream(outputs.CurrentRunFailureLog, { encoding: 'utf-8' }),
  AssertToBeFailedList: args.values['update-failed'] ? createWriteStream(inputs.AssertToBeFailedList, { encoding: 'utf-8', flags: 'a' }) : undefined,
};

let allTestsDiscovered = false;

const disabledFeatures = new Set<string>();
readList(inputs.Features).forEach((feature) => {
  if (feature.startsWith('-')) {
    disabledFeatures.add(feature.slice(1));
  }
});
disabledFeatures.delete(args.values.features!);

if (args.values['failed-only']) {
  args.positionals = (await readFile(outputs.LastRunFailedList, { encoding: 'utf-8' })).split('\n');
}

const workersToStart = Math.max(
  1,
  process.env.NUM_WORKERS
    ? Number.parseInt(process.env.NUM_WORKERS, 10)
    : cpus().length - 2,
);
const workers = Array.from({ length: workersToStart }, (_, index) => createWorker(index));
/**
 * Do not replace this with reporter.workers.
 * This variable maintains the state in the main thread, but reporter.workers is updated asynchronously based on the feedback from workers.
 */
const workerHasPendingTask: boolean[] = new Array(workersToStart).fill(false);

const [
  slowList,
  slowListCI,
  skipList,
  assertToBeFailedList,
] = await Promise.all([
  readListPaths(inputs.SlowList, false),
  readListPaths(inputs.SlowListCI, true),
  readListPaths(inputs.SkipList, false),
  readListPaths(inputs.AssertToBeFailedList, false),
]);

if (outputStreams.AssertToBeFailedList) {
  outputStreams.AssertToBeFailedList.write('\n# Failed tests appended by --update-failed-tests\n');
}

/** This is for skipping the report of a test if it's variant (strict version) has already failed.  */
const currentRunFailedTestFiles = new Set<string>();
const pendingTests: Test[] = [];
const reporter = createTestReporter();

if (outputStreams.SlowList) {
  const second = parseInt(args.values['update-slow']!, 10);
  if (Number.isNaN(second)) {
    fatal_exit('--update-slow must be a number');
  }
  outputStreams.SlowList.write(`\n# Slow tests appended by --update-slow=${second}\n`);
  reporter.setSlowTestReporting(second, outputStreams.SlowList);
}

function discoverTest(test: Test) {
  reporter.addTest(test);
  const disabledFeature = test.attrs.features?.find((feature: string) => disabledFeatures.has(feature));
  if (disabledFeature) {
    return reporter.skipTest(test.id, 'feature-disabled', disabledFeature);
  }
  if (skipList.has(test.file)) {
    return reporter.skipTest(test.id, 'skip-list');
  }
  if (slowList.has(test.file) && !args.values['run-slow']) {
    return reporter.skipTest(test.id, 'slow-list');
  }
  if (isCI && slowListCI.has(test.file) && !args.values['run-slow']) {
    return reporter.skipTest(test.id, 'slow-list');
  }
  pendingTests.push(test);
  distributeTest();
  return undefined;
}

function distributeTest() {
  while (true) {
    const candidate = workerHasPendingTask.findIndex((work) => !work);
    if (candidate === -1) {
      return;
    }
    if (!pendingTests.length) {
      if (allTestsDiscovered && workerHasPendingTask.every((work) => !work)) {
        reporter.exit();
      }
      return;
    }
    workers[candidate].send(pendingTests.shift()! satisfies SupervisorToWorker);
    workerHasPendingTask[candidate] = true;
  }
}

const visited = new Set<string>();
reporter.start();
reporter.addEventListener('exit', () => {
  workers.forEach((worker) => worker.kill());
});
reporter.onExit.promise.then(() => {
  if (args.values.verbose || args.values.vv) {
    const skip: Record<SkipReason, Set<string>> = {
      'feature-disabled': new Set<string>(),
      'skip-list': new Set<string>(),
      'slow-list': new Set<string>(),
    };
    const passed: Set<string> = new Set<string>();
    const skipByFeature: Record<string, Set<string>> = {};
    const failed: Set<string> = new Set<string>();
    for (const test of reporter.tests.values()) {
      if (test.status === 'skipped') {
        if (test.skipFeature) {
          (skipByFeature[test.skipFeature] ??= new Set()).add(test.file);
        } else if (test.skipReason) {
          skip[test.skipReason].add(test.file);
        }
      } else if (test.status === 'failed') {
        failed.add(test.file);
      } else if (args.values.vv && test.status === 'passed') {
        passed.add(test.file);
      }
    }
    if (args.values.vv && passed.size > 0) {
      console.log(styleText('green', 'The following tests passed:'));
      for (const test of passed) {
        console.log(`- ./test/test262/test262/test/${test}`);
      }
    }
    let skipPrint = () => {
      console.log(styleText('yellow', 'The following tests were skipped:'));
      skipPrint = () => { };
    };
    for (const [reason, tests] of Object.entries(skip)) {
      if (tests.size === 0) {
        continue;
      }
      skipPrint();
      console.log(`- Reason: ${styleText('yellow', reason)} (${tests.size} tests)`);
      for (const test of tests) {
        console.log(`    - ./test/test262/test262/test/${test}`);
      }
    }
    for (const [feature, tests] of Object.entries(skipByFeature)) {
      skipPrint();
      console.log(`- Reason: ${styleText('yellow', `feature-disabled (${feature})`)} (${tests.size} tests)`);
      for (const test of tests) {
        console.log(`    - ./test/test262/test262/test/${test}`);
      }
    }
    if (failed.size > 0) {
      console.log(styleText('red', '\nThe following tests failed:'));
      for (const test of failed) {
        console.log(`- ./test/test262/test262/test/${test}`);
      }
    }
  }
});

const promises = [];
for await (const file of parsePositionals(args.positionals, true)) {
  if (visited.has(file) || /_FIXTURE|README\.md|\.py|\.map|\.mts/.test(file)) {
    continue;
  }

  visited.add(file);
  promises.push(readFile(file, 'utf8').then((contents) => {
    const frontmatterYaml = contents.match(/\/\*---(.*?)---\*\//s)?.[1];
    const attrs: any = frontmatterYaml ? YAML.load(frontmatterYaml) : {};

    if (args.values.features && (!attrs.features || !attrs.features.includes(args.values.features))) {
      // feature not match
      return;
    }

    attrs.flags = (attrs.flags || []).reduce((acc: any, c: any) => {
      acc[c] = true;
      return acc;
    }, {});
    attrs.includes = attrs.includes || [];

    const test = new Test(relative(inputs.Test262TestsPath, file), attrs, '', contents);

    if (test.attrs.flags.module) {
      discoverTest(test.withDifferentTestFlag('module'));
    } else {
      if (!test.attrs.flags.onlyStrict && !args.values['strict-only'] && !args.values.fast) {
        discoverTest(test);
      }

      if (!test.attrs.flags.noStrict && !test.attrs.flags.raw) {
        discoverTest(test.withDifferentTestFlag('strict', `'use strict';${test.content}`));
      }
    }
  }));
}
if (args.positionals.length && !promises.length) {
  fatal_exit(`No tests found based on the given globs: ${args.positionals.join(', ')}`);
}
await Promise.all(promises);

allTestsDiscovered = true;
reporter.allTestsDiscovered();
distributeTest();

async function readListPaths(file: string, defaults: boolean) {
  const list = readList(file);
  const files = new Set<string>();
  for await (const file of parsePositionals(list, defaults)) {
    files.add(relative(inputs.Test262TestsPath, file));
  }
  return files;
}

async function* readdir(dir: string): AsyncGenerator<string> {
  for await (const dirent of await opendir(dir)) {
    const p = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdir(p);
    } else {
      yield p;
    }
  }
}

async function* parsePositional(pattern: string): AsyncGenerator<string> {
  if (!isDynamicPattern(pattern)) {
    const a_path = join(inputs.Test262TestsPath, pattern);
    const a = await stat(a_path).catch(() => undefined);
    if (a?.isDirectory()) {
      return yield* readdir(a_path);
    } else if (a?.isFile()) {
      return yield a_path;
    }

    const b_path = join(process.cwd(), pattern);
    const b = await stat(b_path).catch(() => undefined);
    if (b?.isDirectory()) {
      return yield* readdir(b_path);
    } else if (b?.isFile()) {
      return yield b_path;
    }

    const files = await inputs.AllTests();
    const matched = files.filter((f) => f.toLowerCase().includes(pattern.toLowerCase()));
    if (matched.length) {
      return yield* matched;
    }
  }

  const files1 = await globby(pattern, { cwd: inputs.Test262TestsPath, absolute: true, caseSensitiveMatch: false });
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
      yield* readdir(inputs.Test262TestsPath);
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
  const c = fork(resolve(import.meta.dirname, './test262-worker.mts'));
  c.on('message', (message: WorkerToSupervisor) => {
    switch (message.status) {
      case 'RUNNING':
        return reporter.updateWorker(workerId, message.testId);
      case 'PASS':
        workerHasPendingTask[workerId] = false;
        reporter.updateWorker(workerId, null);
        distributeTest();
        if (assertToBeFailedList.has(message.file)) {
          if (currentRunFailedTestFiles.has(message.file)) {
            return reporter.testFailed(message.testId);
          } else {
            currentRunFailedTestFiles.add(message.file);
            return fail({
              file: message.file,
              description: 'The test is declared to be failed, but passed.',
              error: '',
              flags: message.flags,
              status: 'FAIL',
              testId: message.testId,
            }, false);
          }
        }
        return reporter.testPassed(message.testId);
      case 'FAIL': {
        workerHasPendingTask[workerId] = false;
        reporter.updateWorker(workerId, null);
        distributeTest();
        if (assertToBeFailedList.has(message.file)) {
          return reporter.assertFailedTestFails(message.testId);
        }
        if (currentRunFailedTestFiles.has(message.file)) {
          return reporter.testFailed(message.testId);
        }
        currentRunFailedTestFiles.add(message.file);
        outputStreams.LastRunFailedList.write(`${message.file}\n`);
        if (outputStreams.AssertToBeFailedList) {
          outputStreams.AssertToBeFailedList.write(`${message.file}\n`);
        }
        return fail(message, true);
      }
      default:
        console.error(message);
        throw new RangeError('Unknown message from worker');
    }
  });
  c.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      fatal_exit(`Worker ${workerId} exited with code ${code}`);
    }
  });
  return c;
}


function fail(message: WorkerToSupervisor_Failed, showSource: boolean) {
  const { description, testId, file } = message;
  let error = message.error;
  error = error.replaceAll(`${process.cwd()}/`, '');
  process.exitCode = 1;

  const desc = styleText('yellow', description.trim());
  const descNeedOwnLine = desc.includes('\n') || desc.length > (process.stdout.columns - file.length - 8);
  // FAILED filename.js
  const line1 = `${styleText(['bgRed', 'white', 'bold'], ' FAIL ')} ${annotateFileWithURL(file)}${descNeedOwnLine ? '' : ` ${desc}`}\n`;
  //   Test description in the header
  const line2 = descNeedOwnLine ? `${indent(desc, '   ')}\n` : '';
  //   Source code with error position annotated
  const line3 = showSource ? annotateSourceWithErrorPosition(error, message.file, reporter.tests.get(testId)!.content) : '';
  //   Error message
  const line4 = `${indent(error, '  ')}\n`;
  const line5 = styleText('red', `${'⎯'.repeat(process.stdout.columns)}\n`);
  const output = line1 + line2 + line3 + line4;
  reporter.stdout(output, line5);
  outputStreams.CurrentRunFailureLog.write(stripVTControlCharacters(output));
  reporter.testFailed(testId);
}

function indent(string: string, space: string) {
  return string.split('\n').map((line) => space + line).join('\n');
}

function annotateSourceWithErrorPosition(error: string, fileName: string, sourceCode: string) {
  const pos = error.indexOf(fileName);
  if (pos === -1) {
    return '';
  }
  const errorPosition = error.slice(pos).match(/:(\d+):(\d+)/);
  if (!errorPosition) {
    return '';
  }
  if (sourceCode.endsWith('\n')) {
    sourceCode = sourceCode.slice(0, -1);
  }
  const highLightedLines = (supportColor ? highlight(sourceCode, { language: 'js' }) : sourceCode).split('\n');
  const linesPad = (highLightedLines.length + 1).toString().length;
  const decoratedLines = highLightedLines.map((line, index) => `  ${styleText('red', (index + 1).toString().padStart(linesPad))} | ${line}`);
  const LINES_BEFORE = 3;
  const LINES_AFTER = 2;
  const slicedLines = decoratedLines.slice(
    Math.max(0, Number(errorPosition[1]) - LINES_BEFORE),
    Math.min(decoratedLines.length, Number(errorPosition[1])),
  );
  slicedLines.push(''.padStart(linesPad + 5) + styleText('red', `${'-'.repeat(Number(errorPosition[2]) - 1)}^ ${error.split('\n')[0].trim()}`));
  slicedLines.push(
    decoratedLines.slice(
      Number(errorPosition[1]),
      Math.min(decoratedLines.length, Number(errorPosition[1]) + LINES_AFTER),
    ).join('\n'),
  );

  sourceCode = `${slicedLines.join('\n')}`;
  sourceCode += '\n';
  return sourceCode;
}
