import fs from 'fs';
import yaml from 'yaml';
import glob from 'glob';
import {
  Realm,
  Value,
  Object as APIObject,
  Abstract,
  AbruptCompletion,
} from '../lib/api.mjs';

const testdir = new URL('./test262/', import.meta.url);

function createRealm(printer) {
  const realm = new Realm();

  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), new Value(realm, (args) => printer(...args)));

  const $262 = new APIObject(realm);

  Abstract.CreateDataProperty($262, new Value(realm, 'createRealm'), new Value(realm, () => createRealm()));
  Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'),
    new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);

  $262.realm = realm;
  $262.evalScript = (sourceText, file) => {
    if (file) {
      sourceText = fs.readFileSync(new URL(sourceText, testdir));
    }
    return realm.evaluateScript(sourceText);
  };

  return $262;
}

function run(test, strict) {
  return new Promise((resolve) => {
    let options = { description: test };

    const { evalScript, realm } = createRealm((m) => {
      if (m === new Value(realm, 'Test262:AsyncTestComplete')) {
        resolve({ options });
      } else {
        console.log('[GLOBAL PRINT]', m); // eslint-disable-line no-console
        resolve({ options, error: m });
      }
      return new Value(realm, undefined);
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
        resolve({ options });
        return;
      }

      if (!strict && options.flags.includes('onlyStrict')) {
        resolve({ options });
        return;
      }
    }

    const completion = evalScript(strict ? `"use strict";\n${source}` : source);
    if (completion instanceof AbruptCompletion) {
      if (options.negative) {
        resolve({ options });
      } else {
        resolve({ error: completion, options });
      }
    } else if (sync) {
      resolve({ options });
    }
  });
}

const tests = glob.sync('test/test262/test/language/expressions/**/*.js').map((p) => p.slice(18));

const skip = [
  'language/expressions/tco-pos.js',
  'language/expressions/conditional/tco-pos.js',
  'language/expressions/conditional/tco-cond.js',
  'language/expressions/logical-and/tco-right.js',
  'language/expressions/comma/tco-final.js',
  'language/expressions/tagged-template/tco-member.js',
  'language/expressions/call/tco-member-args.js',
  'language/expressions/tagged-template/tco-call.js',
  'language/expressions/call/tco-call-args.js',
  'language/expressions/logical-or/tco-right.js',
];

let passed = 0;
let skipped = 0;
let failed = 0;

let promise = Promise.resolve();

/* eslint-disable no-console */
tests.forEach((t) => {
  promise = promise.then(async () => {
    const short = t;
    t = new URL(`test/${t}`, testdir);

    if (skip.includes(short) || short.toLowerCase().includes('bigint')) {
      console.log('\u001b[33mSKIP\u001b[39m', short);
      skipped += 1;
      return;
    }

    {
      const { options: { description }, error } = await run(t, false);
      if (error) {
        console.error('\u001b[31mFAIL\u001b[39m [SLOPPY]', description.trim());
        console.error(error);
        failed += 1;
        return;
      } else {
        console.log('\u001b[32mPASS\u001b[39m [SLOPPY]', description.trim());
      }
    }

    {
      const { options: { description }, error } = await run(t, true);
      if (error) {
        console.error('\u001b[31mFAIL\u001b[39m [STRICT]', description.trim());
        console.error(error);
        failed += 1;
        return;
      } else {
        console.log('\u001b[32mPASS\u001b[39m [STRICT]', description.trim());
      }
    }

    passed += 1;
  });
});

promise.then(() => {
  console.table({
    passed,
    failed,
    skipped,
    total: tests.length,
  });
  if (failed > 0) {
    process.exit(1);
  }
}).catch((e) => {
  console.error(e);
  process.exit(1);
});

/* eslint-enable no-console */
