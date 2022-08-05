'use strict';

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const path = require('path');
const globby = require('globby');
const {
  pass, fail, skip, total,
} = require('../base');
const {
  Agent,
  setSurroundingAgent,
  ManagedRealm,
  AbruptCompletion,
  inspect,
} = require('../..');

const BASE_DIR = path.resolve(__dirname, 'JSONTestSuite');

const agent = new Agent();
setSurroundingAgent(agent);

function test(filename) {
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
      pass();
    } else if (testName.startsWith('i_')) {
      skip();
    } else {
      fail(testName, inspect(result));
    }
  } else {
    if (testName.startsWith('n_')) {
      fail(testName, 'JSON parsed but should have failed!');
    } else {
      pass();
    }
  }
}

const tests = globby.sync(
  'test_{parsing,transform}/**/*.json',
  { cwd: BASE_DIR, absolute: true },
);

tests.forEach((t) => {
  total();
  test(t);
});
