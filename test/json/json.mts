/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { globbySync } from 'globby';
import { createTestReporter, annotateFileWithURL } from '../tui.mts';
import { Test } from '../base.mts';
import {
  Agent,
  setSurroundingAgent,
  ManagedRealm,
  AbruptCompletion,
  inspect,
} from '#self';

const failed = [
  // stack overflow for us
  'n_structure_100000_opening_arrays.json',
  'n_structure_open_array_object.json',
];

const BASE_DIR = path.resolve(import.meta.dirname, 'JSONTestSuite');

const agent = new Agent();
setSurroundingAgent(agent);

const reporter = createTestReporter();
reporter.start();

function test(filename: string) {
  const realm = new ManagedRealm();

  const source = fs.readFileSync(filename, 'utf8');
  const test = new Test(filename, null!, '', source);
  reporter.addTest(test);

  if (failed.includes(path.basename(filename))) {
    reporter.skipTest(test.id, 'skip-list');
    return;
  }

  reporter.updateWorker(0, test.id);
  let result;
  try {
    result = realm.evaluateScript(`JSON.parse(${JSON.stringify(source)});`);
  } catch (error) {
    reporter.updateWorker(0, null);
    console.error(filename, error);
    fail(filename, test.id, '');
    return;
  }
  reporter.updateWorker(0, null);

  const testName = path.basename(filename);

  if (!result || result instanceof AbruptCompletion) {
    if (testName.startsWith('n_')) {
      reporter.testPassed(test.id);
    } else if (testName.startsWith('i_')) {
      reporter.testPassed(test.id);
    } else {
      console.error(inspect(result));
      fail(filename, test.id, '');
    }
  } else {
    if (testName.startsWith('n_')) {
      fail(filename, test.id, 'Expected failure but got success');
    } else {
      reporter.testPassed(test.id);
    }
  }
}

const tests = globbySync(
  'test_{parsing,transform}/**/*.json',
  { cwd: BASE_DIR, absolute: true },
);

for (const t of tests) {
  test(t);
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

reporter.allTestsDiscovered();
reporter.exit();
setTimeout(() => {
  process.exit();
});

function fail(file: string, testId: number, message: string) {
  process.exitCode = 1;

  // FAILED filename.js
  const line1 = `${styleText('red', `FAILED ${annotateFileWithURL(file)}`)}\n`;
  reporter.stdout(line1, message);
  reporter.testFailed(testId);
}
