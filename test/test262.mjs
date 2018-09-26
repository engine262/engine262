import fs from 'fs';
import yaml from 'yaml';
// import glob from 'glob';
import {
  Realm,
  Value,
  Object as APIObject,
  Abstract,
} from '../lib/api.mjs';

const testdir = new URL('./test262/', import.meta.url);

function createRealm() {
  const realm = new Realm();

  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), new Value(realm, (args) => {
    console.log('[GLOBAL PRINT]', ...args); // eslint-disable-line no-console
    return new Value(realm, undefined);
  }));

  const $262 = new APIObject(realm);

  Abstract.CreateDataProperty($262, new Value(realm, 'createRealm'), new Value(realm, () => createRealm()));
  Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'),
    new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);

  $262.evalScript = (sourceText, file) => {
    if (file) {
      sourceText = fs.readFileSync(new URL(sourceText, testdir));
    }
    return realm.evaluateScript(sourceText);
  };

  return $262;
}

function run(test, strict) {
  return new Promise((resolve, reject) => {
    let options = { description: test };

    const { evalScript } = createRealm((m) => {
      if (m === 'Test262:AsyncTestComplete') {
        resolve(options);
      } else {
        reject(m);
      }
    });

    evalScript('harness/assert.js', true);
    evalScript('harness/sta.js', true);

    const source = fs.readFileSync(test, 'utf8');

    const yamls = /\/\*---\n((.|\n)+?)\n---\*\//.exec(source)[1];
    options = yaml.default.parse(yamls);

    if (options.includes) {
      options.includes.forEach((n) => {
        evalScript(`harness/${n}`, true);
      });
    }

    let sync = true;
    if (options.flags) {
      if (options.flags.includes('async')) {
        evalScript('harness/doneprintHandle.js', true);
        sync = false;
      }
      if (strict && options.flags.includes('noStrict')) {
        resolve(options);
        return;
      }

      if (!strict && options.flags.includes('onlyStrict')) {
        resolve(options);
        return;
      }
    }

    try {
      evalScript(strict ? `"use strict";\n${source}` : source);
      if (sync) {
        resolve(options);
      }
    } catch (err) {
      if (options.negative) {
        resolve(options);
      } else {
        reject(err);
      }
    }
  });
}

// const tests = glob.sync('test/test262/test/built-ins/**/*.js').map(p => p.slice(18));
const tests = [
  'built-ins/Array/length.js',
  'built-ins/Array/S15.4.1_A1.1_T1.js',
  'built-ins/Array/S15.4.1_A1.1_T2.js',
  'built-ins/Array/S15.4.1_A1.1_T3.js',
  'built-ins/Array/S15.4.1_A1.2_T1.js',
  'built-ins/Array/S15.4.1_A1.3_T1.js',
  'built-ins/Array/S15.4.1_A2.1_T1.js',
  'built-ins/Array/S15.4.1_A2.2_T1.js',
  'built-ins/Array/S15.4.1_A3.1_T1.js',
];
const skip = [];

let passed = 0;
let skipped = 0;
let failed = 0;

/* eslint-disable no-console */
const promises = tests.map(async (t) => {
  t = new URL(`test/${t}`, testdir);
  const short = `${t}`;

  if (skip.includes(t)) {
    console.log('\u001b[33mSKIP\u001b[39m', short);
    skipped += 1;
    return;
  }

  try {
    const { description } = await run(t, false);
    console.log('\u001b[32mPASS\u001b[39m [SLOPPY]', description.trim());
  } catch (e) {
    console.error('\u001b[31mFAIL\u001b[39m [SLOPPY]', short);
    console.error(e);
    failed += 1;
    return;
  }

  try {
    const { description } = await run(t, true);
    console.log('\u001b[32mPASS\u001b[39m [STRICT]', description.trim());
  } catch (e) {
    console.error('\u001b[31mFAIL\u001b[39m [STRICT]', short);
    console.error(e);
    failed += 1;
    return;
  }

  passed += 1;
});

Promise.all(promises)
  .then((x) => {
    console.table({
      passed,
      failed,
      skipped,
      total: x.length,
    });
    if (failed > 0) {
      process.exit(1);
    }
  });

/* eslint-enable no-console */
