// @ts-nocheck
import { Value } from './value.mjs';
import {
  EnsureCompletion,
  NormalCompletion,
  ThrowCompletion,
  Q, X,
} from './completion.mjs';
import {
  IsCallable,
  Call, Construct, Assert,
  GetActiveScriptOrModule,
  CleanupFinalizationRegistry,
  CreateArrayFromList,
  FinishLoadingImportedModule,
} from './abstract-ops/all.mjs';
import { GlobalDeclarationInstantiation } from './runtime-semantics/all.mjs';
import { Evaluate } from './evaluator.mjs';
import { CallSite, unwind } from './helpers.mjs';
import { runJobQueue } from './api.mjs';
import * as messages from './messages.mjs';

export const FEATURES = Object.freeze([
  {
    name: 'FinalizationRegistry.prototype.cleanupSome',
    flag: 'cleanup-some',
    url: 'https://github.com/tc39/proposal-cleanup-some',
  },
  {
    name: 'Well-Formed Unicode Strings',
    flag: 'is-usv-string',
    url: 'https://github.com/tc39/proposal-is-usv-string',
  },
].map(Object.freeze));

class ExecutionContextStack extends Array {
  // This ensures that only the length taking overload is supported.
  // This is necessary to support `ArraySpeciesCreate`, which invokes
  // the constructor with argument `length`:
  constructor(length = 0) {
    super(+length);
  }

  pop(ctx) {
    if (!ctx.poppedForTailCall) {
      const popped = super.pop();
      Assert(popped === ctx);
    }
  }
}

let agentSignifier = 0;
/** https://tc39.es/ecma262/#sec-agents */
export class Agent {
  AgentRecord;
  // #execution-context-stack
  executionContextStack = new ExecutionContextStack();
  // NON-SPEC
  jobQueue = [];
  scheduledForCleanup = new Set();
  hostDefinedOptions;
  constructor(options = {}) {
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

    this.hostDefinedOptions = {
      ...options,
      features: FEATURES.reduce((acc, { flag }) => {
        if (options.features) {
          acc[flag] = options.features.includes(flag);
        } else {
          acc[flag] = false;
        }
        return acc;
      }, {}),
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
  intrinsic(name) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  // Generate a throw completion using message templates
  Throw(type, template, ...templateArgs) {
    if (type instanceof Value) {
      return ThrowCompletion(type);
    }
    const message = messages[template](...templateArgs);
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    let error;
    if (type === 'AggregateError') {
      error = X(Construct(cons, [
        X(CreateArrayFromList([])),
        Value(message),
      ]));
    } else {
      error = X(Construct(cons, [Value(message)]));
    }
    return ThrowCompletion(error);
  }

  queueJob(queueName, job) {
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
  feature(name) {
    return this.hostDefinedOptions.features[name];
  }

  // NON-SPEC
  mark(m) {
    this.AgentRecord.KeptAlive.forEach((v) => {
      m(v);
    });
    this.executionContextStack.forEach((e) => {
      m(e);
    });
    this.jobQueue.forEach((j) => {
      m(j.callerRealm);
      m(j.callerScriptOrModule);
    });
  }
}

export let surroundingAgent;
export function setSurroundingAgent(a) {
  surroundingAgent = a;
}

/** https://tc39.es/ecma262/#sec-execution-contexts */
export class ExecutionContext {
  codeEvaluationState;
  Function;
  Realm;
  ScriptOrModule;
  VariableEnvironment;
  LexicalEnvironment;
  PrivateEnvironment;
  // NON-SPEC
  callSite = new CallSite(this);
  promiseCapability;
  poppedForTailCall = false;

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
  mark(m) {
    m(this.Function);
    m(this.Realm);
    m(this.ScriptOrModule);
    m(this.VariableEnvironment);
    m(this.LexicalEnvironment);
    m(this.PrivateEnvironment);
    m(this.promiseCapability);
  }
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-scriptevaluation */
export function ScriptEvaluation(scriptRecord) {
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
  let result = EnsureCompletion(GlobalDeclarationInstantiation(scriptBody, globalEnv));

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

/** https://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export function HostEnqueuePromiseJob(job, _realm) {
  surroundingAgent.queueJob('PromiseJobs', job);
}

/** https://tc39.es/ecma262/#sec-agentsignifier */
export function AgentSignifier() {
  // 1. Let AR be the Agent Record of the surrounding agent.
  const AR = surroundingAgent.AgentRecord;
  // 2. Return AR.[[Signifier]].
  return AR.Signifier;
}

export function HostEnsureCanCompileStrings(callerRealm, calleeRealm) {
  if (surroundingAgent.hostDefinedOptions.ensureCanCompileStrings !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.ensureCanCompileStrings(callerRealm, calleeRealm));
  }
  return NormalCompletion(undefined);
}

export function HostPromiseRejectionTracker(promise, operation) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm && realm.HostDefined.promiseRejectionTracker) {
    X(realm.HostDefined.promiseRejectionTracker(promise, operation));
  }
}

export function HostHasSourceTextAvailable(func) {
  if (surroundingAgent.hostDefinedOptions.hasSourceTextAvailable) {
    return X(surroundingAgent.hostDefinedOptions.hasSourceTextAvailable(func));
  }
  return Value.true;
}

// #sec-HostLoadImportedModule
export function HostLoadImportedModule(referrer, specifier, hostDefined, payload) {
  if (surroundingAgent.hostDefinedOptions.loadImportedModule) {
    const executionContext = surroundingAgent.runningExecutionContext;
    let result;
    let sync = true;
    surroundingAgent.hostDefinedOptions.loadImportedModule(referrer, specifier.stringValue(), hostDefined, (res) => {
      result = EnsureCompletion(res);
      if (!sync) {
        // If this callback has been called asynchronously, restore the correct execution context and enqueue a job.
        surroundingAgent.executionContextStack.push(executionContext);
        surroundingAgent.queueJob('FinishLoadingImportedModule', () => {
          FinishLoadingImportedModule(referrer, specifier, result, payload);
        });
        surroundingAgent.executionContextStack.pop(executionContext);
        runJobQueue();
      }
    });
    sync = false;
    if (result !== undefined) {
      FinishLoadingImportedModule(referrer, specifier, result, payload);
    }
  } else {
    FinishLoadingImportedModule(referrer, specifier, surroundingAgent.Throw('Error', 'CouldNotResolveModule', specifier), payload);
  }
}

/** https://tc39.es/ecma262/#sec-hostgetimportmetaproperties */
export function HostGetImportMetaProperties(moduleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.getImportMetaProperties) {
    return X(realm.HostDefined.getImportMetaProperties(moduleRecord.HostDefined.public));
  }
  return [];
}

/** https://tc39.es/ecma262/#sec-hostfinalizeimportmeta */
export function HostFinalizeImportMeta(importMeta, moduleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.finalizeImportMeta) {
    return X(realm.HostDefined.finalizeImportMeta(importMeta, moduleRecord.HostDefined.public));
  }
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-host-cleanup-finalization-registry */
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

/** https://tc39.es/ecma262/#sec-hostmakejobcallback */
export function HostMakeJobCallback(callback) {
  // 1. Assert: IsCallable(callback) is true.
  Assert(IsCallable(callback));
  // 2. Return the JobCallback Record { [[Callback]]: callback, [[HostDefined]]: empty }.
  return { Callback: callback, HostDefined: undefined };
}

/** https://tc39.es/ecma262/#sec-hostcalljobcallback */
export function HostCallJobCallback(jobCallback, V, argumentsList) {
  // 1. Assert: IsCallable(jobCallback.[[Callback]]) is true.
  Assert(IsCallable(jobCallback.Callback));
  // 1. Return ? Call(jobCallback.[[Callback]], V, argumentsList).
  return Q(Call(jobCallback.Callback, V, argumentsList));
}
export type GCMarker = (value: unknown) => void;
