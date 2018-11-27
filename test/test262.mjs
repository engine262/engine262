import 'source-map-support/register';
import fs from 'fs';
import util from 'util';
import path from 'path';
import glob from 'glob';
import yaml from 'yaml';
import {
  Object as APIObject,
  AbruptCompletion,
  Abstract,
  Completion,
  inspect,
  Realm,
  Value,
  initializeAgent,
} from '..';

util.inspect.defaultOptions.depth = 2;

const hidePassing = process.argv.includes('--hide-passing');

const testdir = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'test262');

const files = glob.sync(path.resolve(testdir, 'test', process.argv[2] || '**/*.js'));

const excludedFeatures = new Set([
  'BigInt',
  'class-fields-private',
  'class-fields-public',
  'class-methods-private',
  'class-static-fields-private',
  'class-static-fields-public',
  'class-static-methods-private',
  'dynamic-import',
  'export-star-as-namespace-from-module',
  'RegExp',
  'caller',
  'WeakSet',
  'WeakMap',
]);

const excludedTests = new Set([
  'test/built-ins/Array/length/S15.4.5.2_A3_T4.js', // this test passes, but takes hours
  'test/built-ins/Proxy/getOwnPropertyDescriptor/result-type-is-not-object-nor-undefined.js',
]);

const PASS = Symbol('PASS');
const FAIL = Symbol('FAIL');
const SKIP = Symbol('SKIP');

function X(val) {
  if (val instanceof AbruptCompletion) {
    throw new Error();
  }
  if (val instanceof Completion) {
    return val.Value;
  }
  return val;
}

function createRealm() {
  const realm = new Realm();

  const $262 = new APIObject(realm);
  realm.global.$262 = $262;

  Abstract.CreateDataProperty($262, new Value(realm, 'global'), realm.global);
  Abstract.CreateDataProperty($262, new Value(realm, 'createRealm'), new Value(realm, () => createRealm()));
  Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'),
    new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);

  $262.realm = realm;
  $262.evalScript = (sourceText, file) => {
    if (file) {
      sourceText = fs.readFileSync(path.resolve(testdir, sourceText), 'utf8');
    }
    return realm.evaluateScript(sourceText);
  };

  return $262;
}

const agentOpt = { promiseRejectionTracker: undefined };
initializeAgent(agentOpt);

async function run({ source, meta, strict }) {
  const $262 = createRealm();

  X($262.evalScript('harness/assert.js', true));
  X($262.evalScript('harness/sta.js', true));

  if (meta.includes !== undefined) {
    meta.includes.forEach((n) => {
      X($262.evalScript(`harness/${n}`, true));
    });
  }

  let asyncPromise;
  let timeout;
  if (meta.flags.includes('async')) {
    X($262.evalScript('harness/doneprintHandle.js', true));
    asyncPromise = new Promise((resolve, reject) => {
      const tracked = new Set();
      timeout = setTimeout(() => {
        const failure = [...tracked][0];
        if (failure) {
          resolve({ status: FAIL, error: inspect(failure.PromiseResult, $262.realm) });
        } else {
          reject(new Error('timeout'));
        }
      }, 2500);
      agentOpt.promiseRejectionTracker = (promise, operation) => {
        if (operation === 'reject') {
          tracked.add(promise);
        } else if (operation === 'handle') {
          tracked.remove(promise);
        }
      };
      $262.realm.realm.HostDefined.handlePrint = (m) => {
        if (m === new Value($262.realm, 'Test262:AsyncTestComplete')) {
          resolve({ status: PASS });
        } else {
          resolve({ status: FAIL, error: inspect(m, $262.realm) });
        }
      };
    });
    asyncPromise.finally(() => {
      agentOpt.promiseRejectionTracker = undefined;
    });
  }

  const completion = $262.evalScript(strict ? `'use strict';\n${source}` : source);
  if (completion instanceof AbruptCompletion) {
    clearTimeout(timeout);
    if (meta.negative) {
      return { status: PASS };
    } else {
      return { status: FAIL, error: inspect(completion, $262.realm) };
    }
  }

  if (asyncPromise !== undefined) {
    return asyncPromise;
  }

  clearTimeout(timeout);

  return { status: PASS };
}

let passed = 0;
let failed = 0;
let skipped = 0;

/* eslint-disable no-console */

process.on('exit', () => {
  console.table({
    total: files.length,
    passed,
    failed,
    skipped,
  });

  if (passed + failed + skipped < files.length || failed > 0) {
    process.exitCode = 1;
  }
});

files.reduce((promise, filename) => promise.then(async () => {
  const short = path.relative(testdir, filename);
  const source = await fs.promises.readFile(filename, 'utf8');
  const meta = yaml.default.parse(source.slice(source.indexOf('/*---') + 5, source.indexOf('---*/')));

  if (meta.flags === undefined) {
    meta.flags = [];
  }
  if (meta.includes === undefined) {
    meta.includes = [];
  }

  if (filename.includes('annexB')
      || (meta.features && meta.features.some((feature) => excludedFeatures.has(feature)))
      || /date|reg ?exp?/i.test(meta.description) || /date|reg ?exp?/.test(source)
      || meta.includes.includes('nativeFunctionMatcher.js')
      || excludedTests.has(short)) {
    skipped += 1;
    console.log('\u001b[33mSKIP\u001b[39m', short);
    return;
  }

  let skip = false;
  let fail = false;
  if (!meta.flags.includes('onlyStrict')) {
    try {
      const { status, error } = await run({ source, meta, strict: false });
      if (status === SKIP) {
        skip = true;
      } else if (status === FAIL) {
        fail = true;
        failed += 1;
        console.error('\u001b[31mFAIL\u001b[39m (SLOPPY)', `${short} - ${meta.description.trim()}`);
        if (error) {
          console.error(error);
        }
      }
    } catch (err) {
      console.error(filename);
      throw err;
    }
  }
  if (!meta.flags.includes('noStrict')) {
    try {
      const { status, error } = await run({ source, meta, strict: true });
      if (status === SKIP) {
        skip = true;
      } else if (status === FAIL) {
        if (!fail) {
          fail = true;
          failed += 1;
        }
        console.error('\u001b[31mFAIL\u001b[39m (STRICT)', `${short} - ${meta.description.trim()}`);
        if (error) {
          console.error(error);
        }
      }
    } catch (err) {
      console.error(filename);
      throw err;
    }
  }

  if (skip) {
    skipped += 1;
    console.log('\u001b[33mSKIP\u001b[39m', short);
  }

  if (!skip && !fail) {
    passed += 1;
    if (!hidePassing) {
      console.log('\u001b[32mPASS\u001b[39m', meta.description ? meta.description.trim() : short);
    }
  }
}), Promise.resolve())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/* eslint-enable no-console */
