/* eslint-disable @typescript-eslint/no-explicit-any */
import { join, resolve, relative } from 'node:path';
import { createWriteStream, mkdirSync, writeFileSync } from 'node:fs';
import {
  mkdir, opendir, readFile, stat,
} from 'node:fs/promises';
import { stripVTControlCharacters, styleText, type InspectColor } from 'node:util';
import { fork } from 'node:child_process';
import { cpus } from 'node:os';
import { glob, isDynamicPattern } from 'tinyglobby';
import YAML from 'js-yaml';
import { highlight } from 'cli-highlight';
import {
  type WorkerToSupervisor, type SupervisorToWorker, Test,
  readList,
  type WorkerToSupervisor_Failed,
  type Stack,
  type WorkerToSupervisor_Log,
} from '../base.mts';
import { annotateFileWithURL, isCI } from '../tui.mts';
import {
  createTestReporter,
  supportColor,
  type SkipReason,
} from '../tui.mts';
import { fatal_exit } from '../base.mts';
import { args } from './test262.mts';

const abort = new AbortController();
const inputs = {
  Test262TestsPath: join(process.env.TEST262 || resolve(import.meta.dirname, 'test262'), 'test'),
  AllTests: async (signal: AbortSignal) => {
    const files: string[] = [];
    for await (const file of readdir(inputs.Test262TestsPath, signal)) {
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

if (args.values['failed-only']) {
  args.positionals = (await readFile(outputs.LastRunFailedList, { encoding: 'utf-8' })).split('\n');
}

if (args.values.fyi) {
  const target = resolve(process.cwd(), args.values.fyi);
  await stat(target).then(((f) => {
    if (!f.isDirectory()) {
      fatal_exit(`The path provided by --fyi is not a directory: ${args.values.fyi}`);
    }
  }), () => mkdir(target));
}

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
  readListPaths(inputs.SlowList, false, abort.signal),
  readListPaths(inputs.SlowListCI, true, abort.signal),
  readListPaths(inputs.SkipList, false, abort.signal),
  readListPaths(inputs.AssertToBeFailedList, false, abort.signal),
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
  abort.abort();
});
reporter.onExit.promise.then(() => {
  if (!(args.values.verbose || args.values.vv || args.values.fyi)) return;
  const skip: Record<SkipReason, Set<string>> = {
    'feature-disabled': new Set<string>(),
    'skip-list': new Set<string>(),
    'slow-list': new Set<string>(),
  };
  const passed: Set<string> = new Set<string>();
  const skipByFeature: Record<string, Set<string>> = {};
  const failed: Set<string> = new Set<string>();
  for (const test of reporter.tests.values()) {
    // do not call annotateFileWithURL here, too much links will freeze the terminal
    const t = `${test.file} ${test.currentTestFlag ? `[${test.currentTestFlag}]` : ''}`;
    if (test.status === 'skipped') {
      if (test.skipFeature) {
        (skipByFeature[test.skipFeature] ??= new Set()).add(t);
      } else if (test.skipReason) {
        skip[test.skipReason].add(t);
      }
    } else if (test.status === 'failed') {
      failed.add(t);
    } else if (args.values.vv && test.status === 'passed') {
      passed.add(t);
    }
  }
  if (args.values.verbose || args.values.vv) {
    if (args.values.vv && passed.size > 0) {
      reporter.stdout(styleText('green', 'The following tests passed:\n'));
      for (const test of passed) {
        reporter.stdout(`- ./test/test262/test262/test/${test}\n`);
      }
    }
    let skipPrint = () => {
      reporter.stdout(styleText('yellow', 'The following tests were skipped:\n'));
      skipPrint = () => { };
    };
    for (const [reason, tests] of Object.entries(skip)) {
      if (tests.size === 0) {
        continue;
      }
      skipPrint();
      reporter.stdout(`- Reason: ${styleText('yellow', reason)} (${tests.size} tests)\n`);
      for (const test of tests) {
        reporter.stdout(`    - ./test/test262/test262/test/${test}\n`);
      }
    }
    for (const [feature, tests] of Object.entries(skipByFeature)) {
      skipPrint();
      reporter.stdout(`- Reason: ${styleText('yellow', `feature-disabled (${feature})`)} (${tests.size} tests)\n`);
      for (const test of tests) {
        reporter.stdout(`    - ./test/test262/test262/test/${test}\n`);
      }
    }
    if (failed.size > 0) {
      reporter.stdout(styleText('red', '\nThe following tests failed:\n'));
      for (const test of failed) {
        reporter.stdout(`- ./test/test262/test262/test/${test}\n`);
      }
    }
  }
  if (args.values.fyi) {
    type test = {
      total: number;
      engines: Record<string, number>;
      files: Record<string, {
        total: number;
        engines: Record<string, number>;
      }>;
    }
    type features = Record<string, {
        total: number;
        engines: Record<string, number>;
    }>
    // type editions = features;

    const all: test = {
      total: 0,
      engines: { engine262: 0 },
      files: Object.create(null),
    };
    const files = new Map<string, test>([['index.json', all]]);
    const features: features = Object.create(null);
    // eslint-disable-next-line no-inner-declarations
    function getPaths(test: string): [file: string, test: test][] {
      const parts = test.split('/');
      const paths: [string, test][] = [[parts[0], all]];
      for (let index = 1; index < parts.length; index += 1) {
        const reportFile = `${parts.slice(0, index).join('/')}.json`;
        if (!files.has(reportFile)) {
          files.set(reportFile, {
            total: 0,
            engines: { engine262: 0 },
            files: Object.create(null),
          });
        }
        paths.push([parts.slice(0, index + 1).join('/'), files.get(reportFile)!]);
      }
      return paths;
    }
    const testsByFileName = Map.groupBy(reporter.tests.values(), (test) => test.file);
    for (const tests of testsByFileName.values()) {
      let passed = 0;
      if (tests.every((test) => test.status === 'passed')) passed = 1;
      else if (args.values['fyi-slow-as-passed'] && tests.every((test) => test.status === 'passed' || (test.status === 'skipped' && test.skipReason === 'slow-list'))) passed = 1;

      for (const feature of tests[0].attrs.features || []) {
        features[feature] ??= { total: 0, engines: { engine262: 0 } };
        features[feature].total += 1;
        features[feature].engines.engine262 += passed;
      }
      for (const [file, t] of getPaths(tests[0].file)) {
        t.files[file] ??= { total: 0, engines: { engine262: 0 } };
        t.total += 1;
        t.engines.engine262 += passed;
        t.files[file].total += 1;
        t.files[file].engines.engine262 += passed;
      }
    }

    for (const [path, data] of files) {
      const target = resolve(process.cwd(), args.values.fyi!, path);
      mkdirSync(resolve(target, '..'), { recursive: true });
      writeFileSync(target, JSON.stringify(data));
    }

    const featuresTarget = resolve(process.cwd(), args.values.fyi!, 'features.json');
    writeFileSync(featuresTarget, JSON.stringify(features));
  }
});

const engineFeatures = [...args.values['engine-features'] || []];

const promises = [];
for await (const file of parsePositionals(args.positionals, true, abort.signal)) {
  if (visited.has(file) || /_FIXTURE|README\.md|\.py|\.map|\.mts/.test(file)) {
    continue;
  }
  if (abort.signal.aborted) break;

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

    const test = new Test(relative(inputs.Test262TestsPath, file), file, engineFeatures, attrs, '', contents);

    const useModuleLoader = test.attrs.features?.some((feature) => feature.includes('import') || feature.includes('export'));
    if (test.attrs.flags.module) {
      const t = test.withDifferentTestFlag('module');
      discoverTest(t);
      discoverTest(t.withAsyncModuleLoader());
    } else {
      if (!test.attrs.flags.onlyStrict && !args.values['strict-only'] && !args.values.fast) {
        discoverTest(test);
        if (useModuleLoader) {
          discoverTest(test.withAsyncModuleLoader());
        }
      }

      if (!test.attrs.flags.noStrict && !test.attrs.flags.raw) {
        const t = test.withDifferentTestFlag('strict', `'use strict';${test.content}`);
        discoverTest(t);
        if (useModuleLoader) {
          discoverTest(t.withAsyncModuleLoader());
        }
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

async function readListPaths(file: string, defaults: boolean, signal: AbortSignal) {
  const list = readList(file);
  const files = new Set<string>();
  for await (const file of parsePositionals(list, defaults, signal)) {
    files.add(relative(inputs.Test262TestsPath, file));
  }
  return files;
}

async function* readdir(dir: string, signal: AbortSignal): AsyncGenerator<string> {
  for await (const dirent of await opendir(dir)) {
    if (signal.aborted) return;
    const p = join(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdir(p, signal);
    } else {
      yield p;
    }
  }
}

async function* parsePositional(pattern: string, signal: AbortSignal): AsyncGenerator<string> {
  if (!isDynamicPattern(pattern)) {
    const a_path = join(inputs.Test262TestsPath, pattern);
    const a = await stat(a_path).catch(() => undefined);
    if (a?.isDirectory()) {
      return yield* readdir(a_path, signal);
    } else if (a?.isFile()) {
      return yield a_path;
    }

    const b_path = join(process.cwd(), pattern);
    const b = await stat(b_path).catch(() => undefined);
    if (b?.isDirectory()) {
      return yield* readdir(b_path, signal);
    } else if (b?.isFile()) {
      return yield b_path;
    }

    const files = await inputs.AllTests(signal);
    const matched = files.filter((f) => f.toLowerCase().includes(pattern.toLowerCase()));
    if (matched.length) {
      return yield* matched;
    }
  }

  const files1 = await glob(pattern, { cwd: inputs.Test262TestsPath, absolute: true, caseSensitiveMatch: false });
  if (files1.length) {
    return yield* files1;
  }

  const files2 = await glob(pattern, { cwd: process.cwd(), absolute: true, caseSensitiveMatch: false });
  if (files2.length) {
    return yield* files2;
  }
  return undefined;
}

async function* parsePositionals(pattern: string[], defaults: boolean, signal: AbortSignal): AsyncGenerator<string> {
  if (!pattern.length) {
    if (defaults) {
      yield* readdir(inputs.Test262TestsPath, signal);
    }
    return;
  }
  for (const p of pattern) {
    if (p) {
      yield* parsePositional(p, signal);
    }
  }
}

function createWorker(workerId: number) {
  const c = fork(resolve(import.meta.dirname, './test262-worker.mts'));
  c.on('message', (message: WorkerToSupervisor) => {
    switch (message.status) {
      case 'LOG':
        return log(message, workerId);
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
              message: '',
              flags: message.flags,
              status: 'FAIL',
              testId: message.testId,
              stack: [],
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
        reporter.stdout(`Unknown message from worker: ${JSON.stringify(message)}\n`);
        throw new RangeError('Unknown message from worker');
    }
  });
  c.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      const test = reporter.workers[workerId];
      if (!test) {
        fatal_exit(`Worker ${workerId} exited with code ${code}, `);
      } else {
        currentRunFailedTestFiles.add(test.file);
        outputStreams.LastRunFailedList.write(`${test.file}\n`);
        workers[workerId] = createWorker(workerId);
        reporter.updateWorker(workerId, null);
        fail({
          file: test.file,
          description: 'Worker crashed',
          message: '',
          flags: test.currentTestFlag,
          status: 'FAIL',
          testId: test.id,
          stack: [],
        }, false);
        fatal_exit('');
      }
    }
  });
  return c;
}


function fail(message: WorkerToSupervisor_Failed, showSource: boolean) {
  const { description, testId, file } = message;
  let error = message.message;
  error = error.replaceAll(`${process.cwd()}/`, '');
  process.exitCode = 1;

  let flags = message.flags;
  flags = flags.replace('module,', '');

  const descText = (flags ? `[${flags}] ` : '') + description.trim();
  const desc = styleText('yellow', descText);
  const descNeedOwnLine = desc.includes('\n') || descText.length > (process.stdout.columns - file.length - 8);
  // FAILED filename.js
  const line1 = `${styleText(['bgRed', 'white', 'bold'], ' FAIL ')} ${annotateFileWithURL(file)}${descNeedOwnLine ? '' : ` ${desc}`}\n`;
  //   Test description in the header
  const line2 = descNeedOwnLine ? `${indent(desc, '   ')}\n` : '';
  //   Source code with error position annotated
  const line3 = showSource ? annotateSourceWithPosition(error, reporter.tests.get(testId)!.content, 'error', message.stack) : '';
  //   Error message
  const line4 = `${indent(error, '  ')}\n`;
  const line5 = styleText('red', `${'⎯'.repeat(process.stdout.columns)}\n`);
  const output = line1 + line2 + line3 + line4;
  reporter.stdout(output, line5);
  outputStreams.CurrentRunFailureLog.write(stripVTControlCharacters(output));
  reporter.testFailed(testId);
}

function log(message: WorkerToSupervisor_Log, workerId: unknown) {
  const { file, testId } = message;
  let log = message.message;
  log = log.replaceAll(`${process.cwd()}/`, '');

  // LOG filename.js
  const line1 = `${styleText(['bgYellowBright', 'white', 'bold'], ' LOG ')} ${file ? annotateFileWithURL(file) : `Worker ${workerId}`}\n`;
  //   Source code with log position annotated
  const line2 = testId ? annotateSourceWithPosition(log, reporter.tests.get(testId)!.content, 'warn', message.stack) : '';
  //   Log message
  const line3 = `${indent(log, '  ')}\n`;
  const line4 = styleText('yellowBright', `${'⎯'.repeat(process.stdout.columns)}\n`);
  const output = line1 + line2 + line3 + line4;
  reporter.stdout(output);
  outputStreams.CurrentRunFailureLog.write(stripVTControlCharacters(output));
}

function indent(string: string, space: string) {
  return string.split('\n').map((line) => space + line).join('\n');
}

function annotateSourceWithPosition(error: string, sourceCode: string, type: 'error' | 'warn', [stack]: Stack[]) {
  sourceCode = stack?.source || sourceCode;
  const color: InspectColor = type === 'error' ? 'red' : 'yellow';
  if (!stack) {
    return '';
  }
  if (sourceCode.endsWith('\n')) {
    sourceCode = sourceCode.slice(0, -1);
  }
  const highLightedLines = (supportColor ? highlight(sourceCode, { language: 'js' }) : sourceCode).split('\n');
  const linesPad = (highLightedLines.length + 1).toString().length;
  const decoratedLines = highLightedLines.map((line, index) => `  ${styleText(color, (index + 1).toString().padStart(linesPad))} | ${line}`);
  const LINES_BEFORE = 3;
  const LINES_AFTER = 2;
  const slicedLines = decoratedLines.slice(
    Math.max(0, Number(stack.line) - LINES_BEFORE),
    Math.min(decoratedLines.length, Number(stack.line)),
  );
  slicedLines.push(''.padStart(linesPad + 5) + styleText(color, `${'-'.repeat(Math.max(Number(stack.column) - 1, 0))}^ ${error.split('\n')[0].trim()}`));
  slicedLines.push(
    decoratedLines.slice(
      Number(stack.line),
      Math.min(decoratedLines.length, Number(stack.line) + LINES_AFTER),
    ).join('\n'),
  );

  sourceCode = `${slicedLines.join('\n')}`;
  sourceCode += '\n';
  return sourceCode;
}
