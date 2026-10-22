import type { kAsyncContext } from '../utils/internal.mts';
import {
  withCapturedReferences,
  type GCCaptureProvider,
  type GCMarkable,
  type GCTrace,
} from '../gc.mts';
import { callable, record } from '../utils/language.mts';
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
  type PlainEvaluator,
  GetActiveScriptOrModule,
} from '#self';

/** https://tc39.es/ecma262/#job */
export class Job implements GCMarkable {
  readonly name: string;

  readonly queueName: string;

  readonly evaluate: () => PlainEvaluator<unknown>;

  readonly callerRealm: Realm | undefined;
  readonly callerScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue | null;

  constructor(options: CreateJobOptions) {
    if (options.captures === undefined) {
      throw new TypeError('Job requires a captures option');
    }
    this.name = options.name;
    this.queueName = options.queueName;
    this.evaluate = options.evaluate;
    this.callerRealm = options.callerRealm;
    this.callerScriptOrModule = options.callerScriptOrModule;
    if (options.captures) {
      withCapturedReferences(this, {
        name: options.name,
        kind: 'job',
        captures: options.captures,
      });
    }
  }

  mark(trace: GCTrace): void {
    trace.strong('run', this.evaluate, 'job');
    trace.strong('callerRealm', this.callerRealm, 'job');
    trace.strong('callerScriptOrModule', this.callerScriptOrModule, 'job');
  }
}

export interface CreateJobOptions {
  readonly name: string;
  readonly queueName: string;
  readonly evaluate: () => PlainEvaluator<unknown>;
  readonly callerRealm: Realm | undefined;
  readonly callerScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue | null;
  readonly captures?: GCCaptureProvider | null;
}

export type JobCallbackRecordInit = Omit<JobCallbackRecord, keyof GCMarkable>;
/** https://tc39.es/ecma262/#sec-jobcallback-records */ // @ts-expect-error
export function JobCallbackRecord(O: JobCallbackRecordInit): JobCallbackRecord
/** https://tc39.es/ecma262/#sec-jobcallback-records */ // @ts-expect-error
export @callable() @record class JobCallbackRecord implements GCMarkable {
  readonly Callback: FunctionObject & { [kAsyncContext]?: ExecutionContext; };

  readonly HostDefined: undefined;

  constructor(init: JobCallbackRecordInit) {
    if (new.target !== JobCallbackRecord) {
      throw new TypeError('JobCallbackRecord is a final class and cannot be subclassed');
    }
    this.Callback = init.Callback;
    this.HostDefined = init.HostDefined;
  }

  mark(trace: GCTrace): void {
    trace.strong('Callback', this.Callback, 'capture');
  }
}

/** https://tc39.es/ecma262/#sec-hostmakejobcallback */
export function HostMakeJobCallback(callback: FunctionObject): JobCallbackRecord {
  return JobCallbackRecord({ Callback: callback, HostDefined: undefined });
}

/** https://tc39.es/ecma262/#sec-hostcalljobcallback */
export function* HostCallJobCallback(jobCallback: JobCallbackRecord, V: Value, argumentsList: Arguments): ValueEvaluator {
  Assert(IsCallable(jobCallback.Callback));
  return Q(yield* Call(jobCallback.Callback, V, argumentsList));
}

// Atomics: HostEnqueueGenericJob

/** https://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export function HostEnqueuePromiseJob(
  job: () => PlainEvaluator,
  realm: Realm | null,
  captures: GCCaptureProvider,
) {
  if (surroundingAgent.debugger_isPreviewing) {
    return;
  }

  const callerRealm = realm || surroundingAgent.currentRealmRecord;
  const scriptOrModule = GetActiveScriptOrModule();
  surroundingAgent.jobQueue.enqueuePromiseJob(new Job({
    name: job.name || 'PromiseJob',
    queueName: 'PromiseJobs',
    evaluate: job,
    callerRealm,
    callerScriptOrModule: scriptOrModule,
    captures,
  }));
}

// Atomics: HostEnqueueTimeoutJob
