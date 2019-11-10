'use strict';

/* eslint-disable no-await-in-loop */

const childProcess = require('child_process');
const path = require('path');
const glob = require('glob');
const {
  pass, fail, skip, total,
} = require('./base');

const BASE_DIR = path.resolve(__dirname, 'JSONTestSuite');
const TEST_CASES_DIR_PATH = path.resolve(BASE_DIR, 'test_parsing');
const ENGINE262 = path.resolve(__dirname, '../bin/engine262.js');
const RUNNER = path.resolve(__dirname, 'json_runner.js');

(async () => {
  for (const filename of glob.sync(`${TEST_CASES_DIR_PATH}/**/*.json`)) {
    total();

    const testName = path.basename(filename);

    const r = await new Promise((resolve) => {
      const c = childProcess.spawn(process.execPath, [ENGINE262, RUNNER, filename], {
        timeout: 5000,
        encoding: 'utf8',
      });
      const v = {
        stdout: '',
        stderr: '',
        status: undefined,
        signal: undefined,
        error: undefined,
      };
      c.stdout.on('data', (chunk) => {
        v.stdout += chunk;
      });
      c.stderr.on('data', (chunk) => {
        v.stderr += chunk;
      });
      c.on('error', (e) => {
        v.error = e;
        resolve(v);
      });
      c.on('exit', (code, signal) => {
        v.code = code;
        v.signal = signal;
        resolve(v);
      });
    });

    switch (r.stdout) {
      case '0\n':
        if (testName.startsWith('n_')) {
          fail(testName, 'JSON parsed but should have failed!');
        } else {
          pass();
        }
        break;
      case '1\n':
        if (testName.startsWith('n_')) {
          pass();
        } else if (testName.startsWith('i_')) {
          skip();
        } else {
          fail(testName, r.stdout || r.error || '');
        }
        break;
      default:
        fail(testName, r.stdout || r.error || '');
        break;
    }
  }
})();
