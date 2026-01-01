import type { kAsyncContext } from '../helpers.mts';
import {
  type Realm, type AbstractModuleRecord, type ScriptRecord, type NullValue, type ExecutionContext, type FunctionObject,
  Assert,
  Call,
  IsCallable,
  Q,
  Value,
  type Arguments,
  type ValueEvaluator,
  surroundingAgent,
} from '#self';

/** https://tc39.es/ecma262/#job */
export interface Job {
  readonly queueName: string;
  readonly job: () => void;
  readonly callerRealm: Realm;
  readonly callerScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue;
}

/** https://tc39.es/ecma262/#sec-jobcallback-records */
export interface JobCallbackRecord {
  Callback: FunctionObject & { [kAsyncContext]?: ExecutionContext; };
  HostDefined: undefined;
}

/** https://tc39.es/ecma262/#sec-hostmakejobcallback */
export function HostMakeJobCallback(callback: FunctionObject): JobCallbackRecord {
  // 1. Assert: IsCallable(callback) is true.
  Assert(IsCallable(callback));
  // 2. Return the JobCallback Record { [[Callback]]: callback, [[HostDefined]]: empty }.
  return { Callback: callback, HostDefined: undefined };
}

/** https://tc39.es/ecma262/#sec-hostcalljobcallback */
export function* HostCallJobCallback(jobCallback: JobCallbackRecord, V: Value, argumentsList: Arguments): ValueEvaluator {
  // 1. Assert: IsCallable(jobCallback.[[Callback]]) is true.
  Assert(IsCallable(jobCallback.Callback));
  // 1. Return ? Call(jobCallback.[[Callback]], V, argumentsList).
  return Q(yield* Call(jobCallback.Callback, V, argumentsList));
}

// Atomics: HostEnqueueGenericJob

/** https://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export function HostEnqueuePromiseJob(job: () => void, _realm: Realm | NullValue) {
  if (surroundingAgent.debugger_isPreviewing) {
    return;
  }
  surroundingAgent.queueJob('PromiseJobs', job);
}

// Atomics: HostEnqueueTimeoutJob
