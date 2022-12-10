// @ts-nocheck
import {
  BooleanValue, JSStringValue, NullValue, ObjectValue, Value,
} from './value.mjs';
import {
  AbruptCompletion,
  EnsureCompletion,
  NormalCompletion,
  ThrowCompletion,
  Q, X, Completion,
} from './completion.mjs';
import {
  IsCallable,
  Call, Construct, Assert, GetModuleNamespace,
  PerformPromiseThen, CreateBuiltinFunction,
  GetActiveScriptOrModule,
  CleanupFinalizationRegistry,
  CreateArrayFromList,
  Realm,
  PromiseCapabilityRecord,
  FunctionObjectValue,
} from './abstract-ops/all.mjs';
import { GlobalDeclarationInstantiation } from './runtime-semantics/all.mjs';
import { Evaluate } from './evaluator.mjs';
import { AbstractModuleRecord, CyclicModuleRecord } from './modules.mjs';
import { CallSite, unwind } from './helpers.mjs';
import * as messages from './messages.mjs';
import type { ScriptRecord } from './parse.mjs';

export const FEATURES = [
  {
    name: 'Hashbang Grammar',
    flag: 'hashbang',
    url: 'https://github.com/tc39/proposal-hashbang',
  },
  {
    name: 'FinalizationRegistry.prototype.cleanupSome',
    flag: 'cleanup-some',
    url: 'https://github.com/tc39/proposal-cleanup-some',
  },
] as const;
export type FEATURES = typeof FEATURES[number]['flag'];
Object.freeze(FEATURES);
FEATURES.map((x) => Object.freeze(x));

class ExecutionContextStack extends Array<ExecutionContext> {
  // This ensures that only the length taking overload is supported.
  // This is necessary to support `ArraySpeciesCreate`, which invokes
  // the constructor with argument `length`:
  constructor(length = 0) {
    super(+length);
  }

  // @ts-ignore
  // TODO(TS): incompatible override
  override pop(ctx: ExecutionContext): void {
    if (!ctx.poppedForTailCall) {
      const popped = super.pop();
      Assert(popped === ctx);
    }
  }
}

let agentSignifier = 0;
export interface AgentOptions {
  readonly features?: any;
}
export interface HostDefinedOptions {
  cleanupFinalizationRegistry?(fg: any): Completion;
  hasSourceTextAvailable?(fn: FunctionObjectValue): NormalCompletion<void>;
  ensureCanCompileStrings?(callerRealm: Realm, calleeRealm: Realm): Completion;
  boost?: {
    evaluateScript?(record: ScriptRecord): void;
  }
  features: Record<FEATURES, boolean>;
}
export interface AgentJob {
  queueName?: string;
}

/** http://tc39.es/ecma262/#sec-agents */
export class Agent {
  readonly executionContextStack: ExecutionContextStack;
  readonly jobQueue: AgentJob[];
  readonly scheduledForCleanup: Set<any>;
  readonly hostDefinedOptions: HostDefinedOptions;
  readonly AgentRecord: {
    LittleEndian: BooleanValue; CanBlock: BooleanValue; Signifier: number; IsLockFree1: BooleanValue; IsLockFree2: BooleanValue; CandidateExecution: undefined; KeptAlive: Set<unknown>;
  };
  constructor(options: AgentOptions = {}) {
    // #table-agent-record
    const Signifier = agentSignifier;
    agentSignifier += 1;
    this.AgentRecord = {
      LittleEndian: Value.true,
      CanBlock: Value.true,
      Signifier,
      IsLockFree1: Value.true,
      IsLockFree2: Value.true,
      CandidateExecution: undefined,
      KeptAlive: new Set(),
    };

    // #execution-context-stack
    this.executionContextStack = new ExecutionContextStack();

    // NON-SPEC
    this.jobQueue = [];
    this.scheduledForCleanup = new Set();
    this.hostDefinedOptions = {
      ...options,
      features: FEATURES.reduce((acc, { flag }) => {
        if (options.features) {
          acc[flag] = options.features.includes(flag);
        } else {
          acc[flag] = false;
        }
        return acc;
      }, {} as Record<FEATURES, boolean>),
    };
  }

  // #running-execution-context
  get runningExecutionContext() {
    return this.executionContextStack[this.executionContextStack.length - 1];
  }

  // #current-realm
  get currentRealmRecord() {
    return this.runningExecutionContext.Realm;
  }

  // #active-function-object
  get activeFunctionObject() {
    return this.runningExecutionContext.Function;
  }

  // Get an intrinsic by name for the current realm
  intrinsic(name: string) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  // Generate a throw completion using message templates
  Throw<K extends messages.MessageTemplate>(type: string | ObjectValue, template: K, ...templateArgs: Parameters<messages.Messages[K]>): ThrowCompletion<ObjectValue> {
    if (type instanceof Value) {
      return ThrowCompletion(type);
    }
    const message = (messages[template] as any)(...templateArgs);
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    let error;
    if (type === 'AggregateError') {
      error = X(Construct(cons, [
        X(CreateArrayFromList([])),
        Value.of(message),
      ]));
    } else {
      error = X(Construct(cons, [Value.of(message)]));
    }
    return ThrowCompletion(error);
  }

  queueJob(queueName: string, job: () => void) {
    const callerContext = this.runningExecutionContext;
    const callerRealm = callerContext.Realm;
    const callerScriptOrModule = GetActiveScriptOrModule();
    const pending = {
      queueName,
      job,
      callerRealm,
      callerScriptOrModule,
    };
    this.jobQueue.push(pending);
  }

  // NON-SPEC: Check if a feature is enabled in this agent.
  feature(name: FEATURES) {
    return this.hostDefinedOptions.features[name];
  }

  // NON-SPEC
  mark(m: GCMarker) {
    this.AgentRecord.KeptAlive.forEach((v) => {
      m(v);
    });
    this.executionContextStack.forEach((e) => {
      m(e);
    });
    this.jobQueue.forEach((j) => {
      // @ts-expect-error
      m(j.callerRealm);
      // @ts-expect-error
      m(j.callerScriptOrModule);
    });
  }
}

export let surroundingAgent: Agent;
export function setSurroundingAgent(a: Agent) {
  surroundingAgent = a;
}

/** http://tc39.es/ecma262/#sec-execution-contexts */
export class ExecutionContext {
  codeEvaluationState: any;
  Function!: FunctionObjectValue | NullValue;
  Realm!: Realm;
  ScriptOrModule!: AbstractModuleRecord | ScriptRecord;
  VariableEnvironment: any;
  LexicalEnvironment: any;
  PrivateEnvironment: any;
  promiseCapability!: PromiseCapabilityRecord;
  HostDefined: any;
  // NON-SPEC
  callSite: CallSite;
  poppedForTailCall: boolean;
  constructor() {
    this.callSite = new CallSite(this);
    this.poppedForTailCall = false;
  }

  copy() {
    const e = new ExecutionContext();
    e.codeEvaluationState = this.codeEvaluationState;
    e.Function = this.Function;
    e.Realm = this.Realm;
    e.ScriptOrModule = this.ScriptOrModule;
    e.VariableEnvironment = this.VariableEnvironment;
    e.LexicalEnvironment = this.LexicalEnvironment;
    e.PrivateEnvironment = this.PrivateEnvironment;

    e.callSite = this.callSite.clone(e);
    e.promiseCapability = this.promiseCapability;
    return e;
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Function);
    m(this.Realm);
    m(this.ScriptOrModule);
    m(this.VariableEnvironment);
    m(this.LexicalEnvironment);
    m(this.PrivateEnvironment);
    m(this.promiseCapability);
  }
}

/** http://tc39.es/ecma262/#sec-runtime-semantics-scriptevaluation */
export function ScriptEvaluation(scriptRecord: ScriptRecord) {
  if (surroundingAgent.hostDefinedOptions.boost?.evaluateScript) {
    return surroundingAgent.hostDefinedOptions.boost.evaluateScript(scriptRecord);
  }

  const globalEnv = scriptRecord.Realm.GlobalEnv;
  const scriptContext = new ExecutionContext();
  scriptContext.Function = Value.null;
  scriptContext.Realm = scriptRecord.Realm;
  scriptContext.ScriptOrModule = scriptRecord;
  scriptContext.VariableEnvironment = globalEnv;
  scriptContext.LexicalEnvironment = globalEnv;
  scriptContext.PrivateEnvironment = Value.null;
  scriptContext.HostDefined = scriptRecord.HostDefined;
  // Suspend runningExecutionContext
  surroundingAgent.executionContextStack.push(scriptContext);
  const scriptBody = scriptRecord.ECMAScriptCode;
  let result: Completion = EnsureCompletion(GlobalDeclarationInstantiation(scriptBody, globalEnv));

  if (result.Type === 'normal') {
    result = EnsureCompletion(unwind(Evaluate(scriptBody)));
  }

  if (result.Type === 'normal' && !result.Value) {
    result = NormalCompletion(Value.undefined);
  }

  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop(scriptContext);
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

/** http://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export function HostEnqueuePromiseJob(job, _realm: Realm) {
  surroundingAgent.queueJob('PromiseJobs', job);
}

/** http://tc39.es/ecma262/#sec-agentsignifier */
export function AgentSignifier() {
  // 1. Let AR be the Agent Record of the surrounding agent.
  const AR = surroundingAgent.AgentRecord;
  // 2. Return AR.[[Signifier]].
  return AR.Signifier;
}

export function HostEnsureCanCompileStrings(callerRealm: Realm, calleeRealm: Realm) {
  if (surroundingAgent.hostDefinedOptions.ensureCanCompileStrings !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.ensureCanCompileStrings(callerRealm, calleeRealm));
  }
  return NormalCompletion(undefined);
}

export function HostPromiseRejectionTracker(promise: PromiseCapabilityRecord, operation: never) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm && realm.HostDefined.promiseRejectionTracker) {
    X(realm.HostDefined.promiseRejectionTracker(promise, operation));
  }
}

export function HostHasSourceTextAvailable(func: FunctionObjectValue) {
  if (surroundingAgent.hostDefinedOptions.hasSourceTextAvailable) {
    return X(surroundingAgent.hostDefinedOptions.hasSourceTextAvailable(func));
  }
  return Value.true;
}

export function HostResolveImportedModule(referencingScriptOrModule: AbstractModuleRecord, _specifier: JSStringValue) {
  const realm = referencingScriptOrModule.Realm || surroundingAgent.currentRealmRecord;
  const specifier = _specifier.stringValue();
  if (realm.HostDefined.resolveImportedModule) {
    if (referencingScriptOrModule !== Value.null) {
      if (!referencingScriptOrModule.HostDefined.moduleMap) {
        referencingScriptOrModule.HostDefined.moduleMap = new Map();
      }
      if (referencingScriptOrModule.HostDefined.moduleMap.has(specifier)) {
        return referencingScriptOrModule.HostDefined.moduleMap.get(specifier);
      }
    }
    const resolved = Q(realm.HostDefined.resolveImportedModule(referencingScriptOrModule, specifier));
    if (referencingScriptOrModule !== Value.null) {
      referencingScriptOrModule.HostDefined.moduleMap.set(specifier, resolved);
    }
    return resolved;
  }
  return surroundingAgent.Throw('Error', 'CouldNotResolveModule', specifier);
}

function FinishDynamicImport(referencingScriptOrModule, specifier: JSStringValue, promiseCapability: PromiseCapabilityRecord, completion: Completion) {
  // 1. If completion is an abrupt completion, then perform ! Call(promiseCapability.[[Reject]], undefined, « completion.[[Value]] »).
  if (completion instanceof AbruptCompletion) {
    X(Call(promiseCapability.Reject, Value.undefined, [completion.Value]));
  } else { // 2. Else,
    // a. Assert: completion is a normal completion and completion.[[Value]] is undefined.
    Assert(completion instanceof NormalCompletion);
    // b. Let moduleRecord be ! HostResolveImportedModule(referencingScriptOrModule, specifier).
    const moduleRecord = X(HostResolveImportedModule(referencingScriptOrModule, specifier));
    // c. Assert: Evaluate has already been invoked on moduleRecord and successfully completed.
    // d. Let namespace be GetModuleNamespace(moduleRecord).
    const namespace = EnsureCompletion(GetModuleNamespace(moduleRecord));
    // e. If namespace is an abrupt completion, perform ! Call(promiseCapability.[[Reject]], undefined, « namespace.[[Value]] »).
    if (namespace instanceof AbruptCompletion) {
      X(Call(promiseCapability.Reject, Value.undefined, [namespace.Value]));
    } else {
      // f. Else, perform ! Call(promiseCapability.[[Resolve]], undefined, « namespace.[[Value]] »).
      X(Call(promiseCapability.Resolve, Value.undefined, [namespace.Value]));
    }
  }
}

export function HostImportModuleDynamically(referencingScriptOrModule, specifier: JSStringValue, promiseCapability: PromiseCapabilityRecord) {
  surroundingAgent.queueJob('ImportModuleDynamicallyJobs', () => {
    const finish = (c: Completion) => FinishDynamicImport(referencingScriptOrModule, specifier, promiseCapability, c);
    // TODO(TS): ? and ! affects type inference
    const c = ((): Completion => {
      const module = Q(HostResolveImportedModule(referencingScriptOrModule, specifier));
      Q(module.Link());
      const maybePromise = Q(module.Evaluate());
      if (module instanceof CyclicModuleRecord) {
        const onFulfilled = CreateBuiltinFunction(([v = Value.undefined]) => {
          finish(NormalCompletion(v));
          return Value.undefined;
        }, 1, Value.of(''), []);
        const onRejected = CreateBuiltinFunction(([r = Value.undefined]) => {
          finish(ThrowCompletion(r));
          return Value.undefined;
        }, 1, Value.of(''), []);
        PerformPromiseThen(maybePromise, onFulfilled, onRejected);
      } else {
        finish(NormalCompletion(undefined));
      }
      return NormalCompletion(undefined);
    })();
    if (c instanceof AbruptCompletion) {
      finish(c);
    }
  });
  return NormalCompletion(Value.undefined);
}

/** http://tc39.es/ecma262/#sec-hostgetimportmetaproperties */
export function HostGetImportMetaProperties(moduleRecord: AbstractModuleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.getImportMetaProperties) {
    return X(realm.HostDefined.getImportMetaProperties(moduleRecord.HostDefined.public));
  }
  return [];
}

/** http://tc39.es/ecma262/#sec-hostfinalizeimportmeta */
export function HostFinalizeImportMeta(importMeta: ObjectValue, moduleRecord: AbstractModuleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.finalizeImportMeta) {
    return X(realm.HostDefined.finalizeImportMeta(importMeta, moduleRecord.HostDefined.public));
  }
  return Value.undefined;
}

/** http://tc39.es/ecma262/#sec-host-cleanup-finalization-registry */
export function HostEnqueueFinalizationRegistryCleanupJob(fg) {
  if (surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry(fg));
  } else {
    if (!surroundingAgent.scheduledForCleanup.has(fg)) {
      surroundingAgent.scheduledForCleanup.add(fg);
      surroundingAgent.queueJob('FinalizationCleanup', () => {
        surroundingAgent.scheduledForCleanup.delete(fg);
        CleanupFinalizationRegistry(fg);
      });
    }
  }
  return NormalCompletion(undefined);
}

export interface JobCallback {
  Callback: FunctionObjectValue;
  HostDefined: unknown;
}
/** http://tc39.es/ecma262/#sec-hostmakejobcallback */
export function HostMakeJobCallback(callback: FunctionObjectValue): JobCallback {
  // 1. Assert: IsCallable(callback) is true.
  Assert(IsCallable(callback) === Value.true);
  // 2. Return the JobCallback Record { [[Callback]]: callback, [[HostDefined]]: empty }.
  return { Callback: callback, HostDefined: undefined };
}

/** http://tc39.es/ecma262/#sec-hostcalljobcallback */
export function HostCallJobCallback(jobCallback: JobCallback, V: Value, argumentsList: readonly Value[]) {
  // 1. Assert: IsCallable(jobCallback.[[Callback]]) is true.
  Assert(IsCallable(jobCallback.Callback) === Value.true);
  // 1. Return ? Call(jobCallback.[[Callback]], V, argumentsList).
  return Q(Call(jobCallback.Callback, V, argumentsList));
}
export type GCMarker = (value: any) => void;
