/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import path from 'node:path';
import { globbySync } from 'globby';
import {
  pass, fail, skip, incr_total, startTestPrinter,
} from '../base.mts';
import {
  Agent,
  setSurroundingAgent,
  ManagedRealm,
  AbruptCompletion,
  inspect,
} from '#self';

startTestPrinter();
const BASE_DIR = path.resolve(import.meta.dirname, 'JSONTestSuite');

const agent = new Agent();
setSurroundingAgent(agent);

function test(filename: string) {
  const realm = new ManagedRealm();

  const source = fs.readFileSync(filename, 'utf8');

  let result;
  try {
    result = realm.evaluateScript(`'use strict';
const source = ${JSON.stringify(source)};
JSON.parse(source);
`);
  } catch {
    // ...
  }

  const testName = path.basename(filename);

  if (!result || result instanceof AbruptCompletion) {
    if (testName.startsWith('n_')) {
      pass(0);
    } else if (testName.startsWith('i_')) {
      skip();
    } else {
      fail(0, testName, '', inspect(result!));
    }
  } else {
    if (testName.startsWith('n_')) {
      fail(0, testName, '', 'JSON parsed but should have failed!');
    } else {
      pass(0);
    }
  }
}

const tests = globbySync(
  'test_{parsing,transform}/**/*.json',
  { cwd: BASE_DIR, absolute: true },
);

tests.forEach((t) => {
  incr_total();
  test(t);
});
