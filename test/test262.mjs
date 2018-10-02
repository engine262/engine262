import 'source-map-support/register';
import fs from 'fs';
import path from 'path';
import glob from 'glob';
import yaml from 'yaml';
import {
  Realm,
  Value,
  Object as APIObject,
  Abstract,
  Completion,
  AbruptCompletion,
} from '../lib/api.mjs';

const testdir = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'test262');

const files = glob.sync(path.resolve(testdir, 'test', process.argv[2] || '**/*.js'));

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

function createRealm() {
  const realm = new Realm();

  const $262 = new APIObject(realm);

  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), new Value(realm, (args) => {
    if ($262.handlePrint) {
      $262.handlePrint(...args);
    }
    return new Value(realm, undefined);
  }));

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

async function run({ source, meta }) {
  const $262 = createRealm();

  X($262.evalScript('harness/assert.js', true));
  X($262.evalScript('harness/sta.js', true));

  if (meta.includes !== undefined) {
    meta.includes.forEach((n) => {
      X($262.evalScript(`harness/${n}`, true));
    });
  }

  let asyncPromise;
  if (meta.flags.includes('async')) {
    X($262.evalScript('harness/doneprintHandle.js', true));
    asyncPromise = new Promise((resolve) => {
      $262.handlePrint = (m) => {
        if (m === new Value($262.realm, 'Test262:AsyncTestComplete')) {
          resolve({ status: PASS });
        } else {
          resolve({ status: FAIL, error: m });
        }
      };
    });
  }

  const completion = $262.evalScript(meta.flags.includes('strict') ? `'use strict';\n${source}` : source);
  if (completion instanceof AbruptCompletion) {
    if (meta.negative) {
      return { status: PASS };
    } else {
      return { status: FAIL, error: inspect($262.realm, completion) };
    }
  }

  if (asyncPromise !== undefined) {
    return asyncPromise;
  }

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

  if (filename.includes('annexB')) {
    skipped += 1;
    console.log('\u001b[33mSKIP\u001b[39m', short);
    return;
  }

  if (meta.flags === undefined) {
    meta.flags = [];
  }

  const { status, error } = await run({ source, meta });

  switch (status) {
    case SKIP:
      skipped += 1;
      console.log('\u001b[33mSKIP\u001b[39m', short);
      break;
    case PASS:
      passed += 1;
      console.log('\u001b[32mPASS\u001b[39m', meta.description ? meta.description.trim() : short);
      break;
    case FAIL:
      failed += 1;
      console.error('\u001b[31mFAIL\u001b[39m', `${short} - ${meta.description.trim()}`);
      if (error) {
        console.error(error);
      }
      break;
    default:
      throw new RangeError('whoops');
  }
}), Promise.resolve())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

/* eslint-enable no-console */
