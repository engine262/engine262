/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-multi-assign */
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as util from 'node:util';
import {
  readList, type Stack, type SupervisorToWorker, type Test, type WorkerToSupervisor,
} from '../base.mts';
import { createRealm, createAgent } from '../base.mts';
import {
  AbruptCompletion, ObjectValue,
  setSurroundingAgent,
  inspect,
  Value,
  IsCallable,
  IsDataDescriptor,
  JSStringValue,
  boostTest262Harness,
  ThrowCompletion,
  getHostDefinedErrorDetails,
  CallSite,
  CreateBuiltinFunction,
  PerformPromiseThen,
  runJobQueue,
  type PlainCompletion,
  NormalCompletion,
  Descriptor,
  Throw,
  captureStack,
  CallFrame,
  getCurrentStack,
  ValueOfNormalCompletion,
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

process.on('message', async (test: SupervisorToWorker) => {
  try {
    process.send!({ status: 'RUNNING', testId: test.id } satisfies WorkerToSupervisor, handleSendError);
    const result = await run(test);
    if (result.status === 'PASS') {
      process.send!({
        status: 'PASS', file: test.file, flags: test.currentTestFlag, testId: test.id,
      } satisfies WorkerToSupervisor, handleSendError);
    } else {
      process.send!(result satisfies WorkerToSupervisor, handleSendError);
    }
  } catch (e) {
    process.send!(fails(test, util.inspect(e), []), handleSendError);
  }
});

function log(test: Test | undefined, stack: Stack[], ...args: unknown[]) {
  process.send!({
    status: 'LOG', file: test?.file, testId: test?.id, message: args.join(' '), stack,
  } satisfies WorkerToSupervisor, handleSendError);
}

async function run(test: Test): Promise<WorkerToSupervisor> {
  const features = [...test.engineFeatures];
  if (test.attrs.features) {
    test.attrs.features.forEach((f) => {
      if (featureMap[f]) {
        features.push(featureMap[f]);
      }
    });
  }
  const agent = createAgent({ features, asyncModuleLoader: test.asyncModuleLoader });
  const parsedScripts = new Map<string, string>();
  setSurroundingAgent(agent);
  agent.hostDefinedOptions.errorStackAttachNativeStack = true;
  agent.hostDefinedOptions.onScriptParsed = (script, id) => {
    parsedScripts.set(id, script.ECMAScriptCode.sourceText);
  };

  function toDisplayStack(stack: readonly (CallSite | CallFrame)[] | undefined) {
    const reportStack: Stack[] = [];
    for (const site of stack || []) {
      if (!(site instanceof CallSite)) {
        continue;
      }
      const scriptId = site.getScriptId();
      if (!scriptId || site.columnNumber === null || site.lineNumber === null) {
        continue;
      }
      const source = parsedScripts.get(scriptId);
      const record = agent.parsedSources.get(scriptId);
      if (record?.HostDefined?.specifier?.includes('harness')) {
        continue;
      }
      reportStack.push({
        column: site.columnNumber,
        line: site.lineNumber,
        source: source === test.content ? undefined : source,
        specifier: site.getSpecifier(),
      });
    }
    return reportStack;
  }

  function fail(test: Test, error: Value): WorkerToSupervisor {
    const { message, callStack } = getHostDefinedErrorDetails(error);
    const reportStack = toDisplayStack(callStack);
    let msg = '';
    for (const part of message || [realm.scope(() => inspect(error))]) {
      if (typeof part === 'string') msg += part;
      else if (part instanceof Value) msg += realm.scope(() => inspect(part));
    }
    return {
      status: 'FAIL',
      file: test.file,
      flags: test.currentTestFlag,
      testId: test.id,
      description: test.attrs.description,
      message: msg,
      stack: reportStack,
    };
  }

  const { realm, resolverCache } = createRealm({
    specifier: test.specifier,
    log: (...args) => log(test, toDisplayStack(captureStack().stack), ...args),
  });
  console.log = (...args: unknown[]) => log(test, toDisplayStack(captureStack().stack), ...args);
  async function untilFinished() {
    while (resolverCache.hasUnfinishedRequests()) {
      // eslint-disable-next-line no-await-in-loop
      await resolverCache.untilAllRequestFinished();
      runJobQueue();
    }
  }

  const finishTest = Promise.withResolvers<PlainCompletion<unknown>>();
  const result = Promise.withResolvers<WorkerToSupervisor>();
  realm.scope(() => {
    test.attrs.includes.unshift('assert.js');
    const asyncTestPromise = Promise.withResolvers<WorkerToSupervisor>();
    let asyncTestCompleted = false;

    // doneprintHandle.js
    if (test.attrs.flags.async) {
      const $DONE = CreateBuiltinFunction.from(function* $DONE(error = Value.undefined) {
        if (asyncTestCompleted) {
          log(test, toDisplayStack(getCurrentStack()), '$DONE called after test completion');
          return;
        }
        asyncTestCompleted = true;
        if (error !== Value.undefined) {
          asyncTestPromise.resolve(fail(test, error));
        } else {
          asyncTestPromise.resolve({
            status: 'PASS', flags: test.currentTestFlag, testId: test.id, file: test.file,
          });
        }
      });
      realm.GlobalObject.properties.set(Value('$DONE'), Descriptor({ Value: $DONE }));
    }

    // sta.js
    {
      const completion = realm.evaluateScriptSkipDebugger([
        'var Test262Error = class Test262Error extends Error {};',
        'Test262Error.thrower = (...args) => { throw new Test262Error(...args); };'].join('\n'));
      if (completion instanceof AbruptCompletion) {
        result.resolve(fail(test, completion.Value));
        return;
      }
      const $DONOTEVALUATE = CreateBuiltinFunction.from(() => Throw.EvalError('Test262: This statement should not be evaluated.'));
      realm.GlobalObject.properties.set(Value('$DONOTEVALUATE'), Descriptor({ Value: $DONOTEVALUATE }));
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
      const completion = realm.evaluateScriptSkipDebugger(entry.source, { specifier: entry.specifier });
      if (completion instanceof AbruptCompletion) {
        result.resolve(fail(test, completion.Value));
        return;
      }
    }
    boostTest262Harness(realm);


    const specifier = path.resolve(TEST262_TESTS, test.file);

    finishTest.promise.then<WorkerToSupervisor>((completion) => {
      if (completion instanceof ThrowCompletion) {
        if (test.attrs.negative && isError(test.attrs.negative.type, completion.Value)) {
          return {
            status: 'PASS', flags: test.currentTestFlag, testId: test.id, file: test.file,
          };
        } else {
          return fail(test, completion.Value);
        }
      }

      if (test.attrs.flags.async) return asyncTestPromise.promise;

      if (test.attrs.negative) {
        return fails(test, `Expected ${test.attrs.negative.type} during ${test.attrs.negative.phase}`, []);
      } else {
        return {
          status: 'PASS', flags: test.currentTestFlag, testId: test.id, file: test.file,
        };
      }
    }).then(result.resolve, result.reject);

    if (test.attrs.flags.module) {
      realm.evaluateModule(test.content, specifier, (completion) => {
        if (completion instanceof ThrowCompletion) {
          finishTest.resolve(completion);
          return;
        }
        const promise = ValueOfNormalCompletion(completion);
        PerformPromiseThen(promise, CreateBuiltinFunction.from(function* waitIO() {
          untilFinished().then(() => finishTest.resolve(NormalCompletion(undefined)));
          return Value.undefined;
        }), CreateBuiltinFunction.from((err = Value.undefined) => {
          finishTest.resolve(ThrowCompletion(err));
        }));
        runJobQueue();
      });
    } else {
      const completion = realm.evaluateScriptSkipDebugger(test.content, { specifier });
      if (completion instanceof AbruptCompletion) {
        finishTest.resolve(completion);
      }
    }
  });
  await untilFinished();
  finishTest.resolve(NormalCompletion(undefined));

  return result.promise;
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

function fails(test: Test, error: string, stack: Stack[]): WorkerToSupervisor {
  return {
    status: 'FAIL',
    file: test.file,
    flags: test.currentTestFlag,
    testId: test.id,
    description: test.attrs.description,
    message: error,
    stack,
  };
}
