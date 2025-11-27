/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-multi-assign */
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as util from 'node:util';
import {
  readList, type SupervisorToWorker, type Test, type WorkerToSupervisor,
} from '../base.mts';
import { createRealm, createAgent } from '../base.mts';
import {
  AbruptCompletion, ObjectValue, evalQ,
  setSurroundingAgent,
  inspect,
  Value,
  IsCallable,
  IsDataDescriptor,
  JSStringValue,
  Throw,
  skipDebugger,
  boostTest262Harness,
} from '#self';

const TEST262 = process.env.TEST262 || path.resolve(import.meta.dirname, 'test262');
const TEST262_TESTS = path.join(TEST262, 'test');

const featureMap: Record<string, string> = Object.create(null);
readList(path.resolve(import.meta.dirname, 'features')).forEach((f) => {
  if (f.includes('=')) {
    const [k, v] = f.split('=');
    featureMap[k.trim()] = v.trim();
  }
});

const includeCache: Record<string, undefined | { source: string, specifier: string }> = {};

process.on('message', (test: SupervisorToWorker) => {
  try {
    process.send!({ status: 'RUNNING', testId: test.id } satisfies WorkerToSupervisor, handleSendError);
    const result = run(test);
    if (result.status === 'PASS') {
      process.send!({
        status: 'PASS', file: test.file, flags: test.currentTestFlag, testId: test.id,
      } satisfies WorkerToSupervisor, handleSendError);
    } else {
      process.send!(result satisfies WorkerToSupervisor, handleSendError);
    }
  } catch (e) {
    process.send!(fails(test, util.inspect(e)), handleSendError);
  }
});

function run(test: Test): WorkerToSupervisor {
  const features = [...test.engineFeatures];
  if (test.attrs.features) {
    test.attrs.features.forEach((f) => {
      if (featureMap[f]) {
        features.push(featureMap[f]);
      }
    });
  }
  const agent = createAgent({ features });
  setSurroundingAgent(agent);
  agent.hostDefinedOptions.errorStackAttachNativeStack = true;

  const { realm, resolverCache, setPrintHandle } = createRealm({ specifier: test.specifier });
  const r = realm.scope((): WorkerToSupervisor => {
    test.attrs.includes.unshift('assert.js', 'sta.js');
    if (test.attrs.flags.async) {
      test.attrs.includes.unshift('doneprintHandle.js');
    }

    for (const include of test.attrs.includes) {
      if (includeCache[include] === undefined) {
        const p = path.resolve(TEST262, `harness/${include}`);
        includeCache[include] = {
          source: fs.readFileSync(p, 'utf8'),
          specifier: p,
        };
      }
      const entry = includeCache[include];
      const completion = realm.evaluateScript(entry.source, { specifier: entry.specifier });
      if (completion instanceof AbruptCompletion) {
        return fails(test, inspect(completion));
      }
    }
    boostTest262Harness(realm);

    {
      const DONE = `
function $DONE(error) {
  if (error) {
    if (typeof error === 'object' && error !== null && 'stack' in error) {
      __consolePrintHandle__('Test262:AsyncTestFailure:' + error.stack);
    } else {
      __consolePrintHandle__('Test262:AsyncTestFailure:Test262Error: ' + error);
    }
  } else {
    __consolePrintHandle__('Test262:AsyncTestComplete');
  }
}`;
      const completion = realm.evaluateScript(`\
var Test262Error = class Test262Error extends Error {};
Test262Error.thrower = (...args) => {
  throw new Test262Error(...args);
};
${test.attrs.flags.async ? DONE : ''}`);
      if (completion instanceof AbruptCompletion) {
        return fails(test, inspect(completion));
      }
    }

    let asyncResult: WorkerToSupervisor | undefined;
    if (test.attrs.flags.async) {
      setPrintHandle((m) => {
        if (m === 'Test262:AsyncTestComplete') {
          asyncResult = {
            status: 'PASS', flags: test.currentTestFlag, testId: test.id, file: test.file,
          };
        } else {
          asyncResult = fails(test, m);
        }
        setPrintHandle(undefined);
      });
    }

    const specifier = path.resolve(TEST262_TESTS, test.file);

    const completion = evalQ((Q) => {
      if (test.attrs.flags.module) {
        const module = Q(realm.compileModule(test.content, { specifier }));
        resolverCache.set(specifier, module);
        const loadModuleCompletion = module.LoadRequestedModules();
        if (loadModuleCompletion.PromiseState === 'rejected') {
          Q(Throw(loadModuleCompletion.PromiseResult!, 'Raw', 'Module load failed'));
        } else if (loadModuleCompletion.PromiseState === 'pending') {
          throw new Error('Internal error: .LoadRequestedModules() returned a pending promise');
        }
        Q(module.Link());
        const evaluateCompletion = Q(skipDebugger(module.Evaluate()));
        if (evaluateCompletion.PromiseState === 'rejected') {
          Q(Throw(evaluateCompletion.PromiseResult!, 'Raw', 'Module evaluation failed'));
        }
      } else {
        Q(realm.evaluateScript(test.content, { specifier }));
      }
    });

    if (completion.Type === 'throw') {
      if (test.attrs.negative && isError(test.attrs.negative.type, completion.Value)) {
        return {
          status: 'PASS', flags: test.currentTestFlag, testId: test.id, file: test.file,
        };
      } else {
        return fails(test, inspect(completion));
      }
    }

    if (test.attrs.flags.async) {
      if (!asyncResult) {
        throw new Error('missing async result');
      }
      return asyncResult;
    }

    if (test.attrs.negative) {
      return fails(test, `Expected ${test.attrs.negative.type} during ${test.attrs.negative.phase}`);
    } else {
      return {
        status: 'PASS', flags: test.currentTestFlag, testId: test.id, file: test.file,
      };
    }
  });

  return r;
}

function handleSendError(e: any) {
  if (e) {
    console.error(e);
    process.exit(1);
  }
}

function isError(type: string, value: unknown) {
  if (!(value instanceof ObjectValue)) {
    return false;
  }
  const proto = (value as any).Prototype;
  if (!proto || !(proto instanceof ObjectValue)) {
    return false;
  }
  const ctorDesc = proto.properties.get(Value('constructor'));
  if (!ctorDesc || !IsDataDescriptor(ctorDesc)) {
    return false;
  }
  const ctor = ctorDesc.Value;
  if (!(ctor instanceof ObjectValue) || !IsCallable(ctor)) {
    return false;
  }
  const namePropDesc = ctor.properties.get(Value('name'));
  if (!namePropDesc || !IsDataDescriptor(namePropDesc)) {
    return false;
  }
  const nameProp = namePropDesc.Value;
  return nameProp instanceof JSStringValue && nameProp.stringValue() === type;
}

function fails(test: Test, error: string): WorkerToSupervisor {
  return {
    status: 'FAIL',
    file: test.file,
    flags: test.currentTestFlag,
    testId: test.id,
    description: test.attrs.description,
    error,
  };
}
