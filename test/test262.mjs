import fs from 'fs';
import yaml from 'yaml';
import glob from 'glob';
import {
  ExecutionContext,
  surroundingAgent,
  ScriptEvaluation,
  HostReportErrors,
} from '../lib/engine.mjs';
import {
  CreateRealm,
  SetRealmGlobalObject,
  SetDefaultGlobalBindings,
} from '../lib/realm.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  CreateDataProperty,
} from '../lib/abstract-ops/all.mjs';
import { ParseScript } from '../lib/parse.mjs';
import { New as NewValue } from '../lib/value.mjs';
import { AbruptCompletion } from '../lib/completion.mjs';

const testdir = new URL('./test262/', import.meta.url);

function createRealm() {
  const realm = CreateRealm();
  const newContext = new ExecutionContext();
  newContext.Function = NewValue(null);
  newContext.Realm = realm;
  newContext.ScriptOrModule = NewValue(null);
  surroundingAgent.executionContextStack.push(newContext);
  const global = NewValue(undefined);
  const thisValue = NewValue(undefined);
  SetRealmGlobalObject(realm, global, thisValue);
  const globalObj = SetDefaultGlobalBindings(realm);

  CreateDataProperty(globalObj, NewValue('print'), CreateBuiltinFunction((args) => {
    console.log('[GLOBAL PRINT]', ...args); // eslint-disable-line no-console
    return NewValue(undefined);
  }, [], realm));

  const $262 = ObjectCreate(realm.Intrinsics['%ObjectPrototype%']);

  function evalScript(sourceText, file = false) {
    if (file) {
      sourceText = fs.readFileSync(new URL(sourceText, testdir));
    }

    const callerContext = surroundingAgent.runningExecutionContext;
    const callerRealm = callerContext.Realm;
    const callerScriptOrModule = callerContext.ScriptOrModule;

    const context = new ExecutionContext();
    context.Function = NewValue(null);
    context.Realm = callerRealm;
    context.ScriptOrModule = callerScriptOrModule;

    surroundingAgent.executionContextStack.push(context);

    const s = ParseScript(sourceText, surroundingAgent.currentRealmRecord, undefined);
    const res = ScriptEvaluation(s);

    surroundingAgent.executionContextStack.pop();

    return res;
  }

  CreateDataProperty($262, NewValue('createRealm'), CreateBuiltinFunction(() => createRealm(), [], realm));
  CreateDataProperty($262, NewValue('evalScript'),
    CreateBuiltinFunction(([sourceText]) => evalScript(sourceText.stringValue()), [], realm));

  CreateDataProperty(globalObj, NewValue('$262'), $262);

  $262.evalScript = evalScript;

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

    while (true) { // eslint-disable-line no-constant-condition
      const nextQueue = surroundingAgent.jobQueue;

      // host specific behaviour
      if (nextQueue.length === 0) {
        break;
      }

      const nextPending = nextQueue.shift();
      const newContext = new ExecutionContext();
      newContext.Function = NewValue(null);
      newContext.Realm = nextPending.Realm;
      newContext.ScriptOrModule = nextPending.ScriptOrModule;
      surroundingAgent.executionContextStack.push(newContext);
      const result = nextPending.Job(...nextPending.Arguments);
      surroundingAgent.executionContextStack.pop();
      if (result instanceof AbruptCompletion) {
        HostReportErrors([result.Value]);
      }
    }
  });
}

// const tests = glob.sync('./test262/test/built-ins/**/*.js');
const tests = [
  'built-ins/Array/length.js',
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
