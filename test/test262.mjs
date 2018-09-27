import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import glob from 'glob';
import {
  Realm,
  Value,
  Object as APIObject,
  Abstract,
  Completion,
  AbruptCompletion,
} from '../lib/api.mjs';

const testdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'test262');

function createRealm(printer) {
  const realm = new Realm();

  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), new Value(realm, (args) => printer(...args)));

  const $262 = new APIObject(realm);

  Abstract.CreateDataProperty($262, new Value(realm, 'global'), realm.global);
  Abstract.CreateDataProperty($262, new Value(realm, 'createRealm'), new Value(realm, () => createRealm()));
  Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'),
    new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);

  $262.realm = realm;
  $262.evalScript = (sourceText, file) => {
    if (file) {
      sourceText = fs.readFileSync(path.resolve(testdir, sourceText));
    }
    return realm.evaluateScript(sourceText);
  };

  return $262;
}

function X(val) {
  if (val instanceof AbruptCompletion) {
    throw new Error();
  }
  if (val instanceof Completion) {
    return val.Value;
  }
  return val;
}

function inspect(realm, value) {
  const type = Abstract.Type(value);
  if (type === 'Undefined') {
    return 'undefined';
  } else if (type === 'Null') {
    return 'null';
  } else if (type === 'String' || type === 'Number' || type === 'Boolean') {
    return X(Abstract.ToString(value)).stringValue();
  } else if (type === 'Symbol') {
    return `Symbol(${value.Description.stringValue()})`;
  } else if (type === 'Object') {
    const funcToString = realm.realm.Intrinsics['%FunctionPrototype%'].properties.get(new Value(realm, 'toString')).Value;
    const errorToString = realm.realm.Intrinsics['%ErrorPrototype%'].properties.get(new Value(realm, 'toString')).Value;
    const objectToString = realm.realm.Intrinsics['%ObjProto_toString%'];
    const toString = X(Abstract.Get(value, new Value(realm, 'toString')));
    if (toString.nativeFunction === errorToString.nativeFunction
        || toString.nativeFunction === objectToString.nativeFunction
        || toString.nativeFunction === funcToString.nativeFunction) {
      const s = X(toString.Call(value, [])).stringValue();
      if (value.hostTrace) {
        return `${s}\n${value.hostTrace}`;
      }
      return s;
    } else {
      const ctor = X(Abstract.Get(value, new Value(realm, 'constructor')));
      if (Abstract.Type(ctor) === 'Object') {
        const ctorName = X(Abstract.Get(ctor, new Value(realm, 'name'))).stringValue();
        if (ctorName !== '') {
          return `#<${ctorName}>`;
        } else {
          return '[object Unknown]';
        }
      } else {
        return '[object Unknown]';
      }
    }
  } else if (type === 'Completion') {
    return inspect(realm, value.Value);
  } else {
    throw new RangeError();
  }
}

function run(test, strict) {
  return new Promise((resolve) => {
    let options = { description: test };

    const { evalScript, realm } = createRealm((m) => {
      if (m === new Value(realm, 'Test262:AsyncTestComplete')) {
        resolve({ options });
      } else {
        console.log('[GLOBAL PRINT]', inspect(realm, m)); // eslint-disable-line no-console
        resolve({ options, error: m });
      }
      return new Value(realm, undefined);
    });

    evalScript('harness/assert.js', true);
    evalScript('harness/sta.js', true);

    const source = fs.readFileSync(test, 'utf8');

    const yamls = source.slice(source.indexOf('/*---') + 5, source.indexOf('---*/'));
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

    try {
      const completion = evalScript(strict ? `"use strict";\n${source}` : source);
      if (completion instanceof AbruptCompletion) {
        if (options.negative) {
          resolve({ options });
        } else {
          resolve({ error: inspect(realm, completion), options });
        }
      } else if (sync) {
        resolve({ options });
      }
    } catch (error) {
      resolve({ error, options });
    }
  });
}

const tests = [];
[
  'language/expressions/**/*.js',
  'built-ins/Promise/**/*.js',
  'built-ins/Symbol/**/*.js',
]
  .map((x) => path.resolve(testdir, 'test', x))
  .forEach((x) => {
    tests.push(...glob.sync(x));
  });

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
  'bigint',
  'yield',
  'await',
  'async',
  'matchall',
];

let passed = 0;
let skipped = 0;
let failed = 0;

let promise = Promise.resolve();

/* eslint-disable no-console */
tests.forEach((t) => {
  promise = promise.then(async () => {
    const short = path.relative(`${testdir}/test`, t);

    try {
      for (const s of skip) {
        if (short.toLowerCase().includes(s)) {
          console.log('\u001b[33mSKIP\u001b[39m', short);
          skipped += 1;
          return;
        }
      }

      /*
      {
        const { options: { description }, error } = await run(t, false);
        if (error) {
          console.error(short);
          console.error('\u001b[31mFAIL\u001b[39m [SLOPPY]', description.trim());
          console.error(error);
          failed += 1;
          return;
        } else {
          console.log('\u001b[32mPASS\u001b[39m [SLOPPY]', description.trim());
        }
      }
      */

      {
        const { options: { description }, error } = await run(t, true);
        if (error) {
          console.error(short);
          console.error('\u001b[31mFAIL\u001b[39m [STRICT]', description.trim());
          console.error(error);
          failed += 1;
          return;
        } else {
          console.log('\u001b[32mPASS\u001b[39m [STRICT]', description.trim());
        }
      }

      passed += 1;
    } catch (e) {
      console.error(short);
      console.error(e);
      process.exit(1);
    }
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
