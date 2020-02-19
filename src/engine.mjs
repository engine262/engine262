import { Value } from './value.mjs';
import {
  AbruptCompletion,
  EnsureCompletion,
  NormalCompletion,
  ThrowCompletion,
  Q, X,
} from './completion.mjs';
import {
  CreateRealm,
  SetDefaultGlobalBindings,
  SetRealmGlobalObject,
} from './realm.mjs';
import {
  Call, Construct, Assert, GetModuleNamespace,
  PerformPromiseThen, CreateBuiltinFunction,
  GetActiveScriptOrModule,
  CleanupFinalizationRegistry,
} from './abstract-ops/all.mjs';
import { ParseScript } from './parse.mjs';
import { GlobalDeclarationInstantiation } from './runtime-semantics/all.mjs';
import { Evaluate } from './evaluator.mjs';
import { CyclicModuleRecord } from './modules.mjs';
import { CallSite, unwind } from './helpers.mjs';
import * as messages from './messages.mjs';

export const FEATURES = Object.freeze([
  {
    name: 'TopLevelAwait',
    url: 'https://github.com/tc39/proposal-top-level-await',
  },
  {
    name: 'WeakRefs',
    url: 'https://github.com/tc39/proposal-weakrefs',
  },
  {
    name: 'LogicalAssignment',
    url: 'https://github.com/tc39/proposal-logical-assignment',
  },
  {
    name: 'Promise.any',
    url: 'https://github.com/tc39/proposal-promise-any',
  },
  {
    name: 'RegExpMatchIndices',
    url: 'https://github.com/tc39/proposal-regexp-match-Indices',
  },
  {
    name: 'String.prototype.replaceAll',
    url: 'https://github.com/tc39/proposal-string-replaceall',
  },
].map(Object.freeze));

// #sec-agents
export class Agent {
  constructor(options = {}) {
    this.LittleEndian = Value.true;
    this.CanBlock = true;
    this.Signifier = Agent.Increment;
    Agent.Increment += 1;
    this.IsLockFree1 = true;
    this.IsLockFree2 = true;
    this.CandidateExecution = undefined;

    this.executionContextStack = [];
    const stackPop = this.executionContextStack.pop;
    this.executionContextStack.pop = function pop(ctx) {
      if (!ctx.poppedForTailCall) {
        const popped = stackPop.call(this);
        Assert(popped === ctx);
      }
    };

    this.jobQueue = [];

    this.hostDefinedOptions = {
      ...options,
      features: FEATURES.reduce((acc, { name }) => {
        if (options.features) {
          acc[name] = options.features.includes(name);
        } else {
          acc[name] = false;
        }
        return acc;
      }, {}),
    };

    if (this.feature('WeakRefs')) {
      this.KeptAlive = new Set();
    }
  }

  // #sec-running-execution-context
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
      return new ThrowCompletion(type);
    }
    const message = messages[template](...templateArgs);
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    let error;
    if (type === 'AggregateError') {
      error = X(Construct(cons, [
        Symbol.for('engine262.placeholder'),
        new Value(message),
      ]));
    } else {
      error = X(Construct(cons, [new Value(message)]));
    }
    return new ThrowCompletion(error);
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
    this.executionContextStack.forEach((e) => {
      m(e);
    });
    this.jobQueue.forEach((j) => {
      m(j.callerRealm);
      m(j.callerScriptOrModule);
    });
  }
}
Agent.Increment = 0;

export let surroundingAgent;
export function setSurroundingAgent(a) {
  surroundingAgent = a;
}

// #sec-execution-contexts
export class ExecutionContext {
  constructor() {
    this.codeEvaluationState = undefined;
    this.Function = undefined;
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
    this.VariableEnvironment = undefined;
    this.LexicalEnvironment = undefined;

    // NON-SPEC
    this.callSite = new CallSite(this);
    this.promiseCapability = undefined;
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
    m(this.promiseCapability);
  }
}

// 15.1.10 #sec-runtime-semantics-scriptevaluation
export function ScriptEvaluation(scriptRecord) {
  const globalEnv = scriptRecord.Realm.GlobalEnv;
  const scriptContext = new ExecutionContext();
  scriptContext.Function = Value.null;
  scriptContext.Realm = scriptRecord.Realm;
  scriptContext.ScriptOrModule = scriptRecord;
  scriptContext.VariableEnvironment = globalEnv;
  scriptContext.LexicalEnvironment = globalEnv;
  scriptContext.HostDefined = scriptRecord.HostDefined;
  // Suspend runningExecutionContext
  surroundingAgent.executionContextStack.push(scriptContext);
  const scriptBody = scriptRecord.ECMAScriptCode;
  let result = EnsureCompletion(GlobalDeclarationInstantiation(scriptBody, globalEnv));

  if (result.Type === 'normal') {
    result = EnsureCompletion(unwind(Evaluate(scriptBody)));
  }

  if (result.Type === 'normal' && !result.Value) {
    result = new NormalCompletion(Value.undefined);
  }

  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop(scriptContext);
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

export function evaluateScript(sourceText, realm, hostDefined) {
  const s = ParseScript(sourceText, realm, hostDefined);
  if (Array.isArray(s)) {
    return new ThrowCompletion(s[0]);
  }

  return EnsureCompletion(ScriptEvaluation(s));
}

// #sec-hostenqueuepromisejob
export function HostEnqueuePromiseJob(job, _realm) {
  surroundingAgent.queueJob('PromiseJobs', job);
}

// 8.5 #sec-initializehostdefinedrealm
export function InitializeHostDefinedRealm() {
  const realm = CreateRealm();
  const newContext = new ExecutionContext();
  newContext.Function = Value.null;
  newContext.Realm = realm;
  newContext.ScriptOrModule = Value.null;
  surroundingAgent.executionContextStack.push(newContext);
  const global = Value.undefined;
  const thisValue = Value.undefined;
  SetRealmGlobalObject(realm, global, thisValue);
  SetDefaultGlobalBindings(realm);
}

// 8.7.1 #sec-agentsignifier
export function AgentSignifier() {
  const AR = surroundingAgent;
  return AR.Signifier;
}

export function HostEnsureCanCompileStrings(callerRealm, calleeRealm) {
  if (surroundingAgent.hostDefinedOptions.ensureCanCompileStrings !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.ensureCanCompileStrings(callerRealm, calleeRealm));
  }
  return new NormalCompletion(undefined);
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

export function HostResolveImportedModule(referencingScriptOrModule, specifier) {
  const realm = referencingScriptOrModule.Realm || surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.resolveImportedModule) {
    specifier = specifier.stringValue();
    if (referencingScriptOrModule !== Value.null) {
      if (!referencingScriptOrModule.HostDefined.moduleMap) {
        referencingScriptOrModule.HostDefined.moduleMap = new Map();
      }
      if (referencingScriptOrModule.HostDefined.moduleMap.has(specifier)) {
        return referencingScriptOrModule.HostDefined.moduleMap.get(specifier);
      }
    }
    const publicModule = referencingScriptOrModule.HostDefined ? referencingScriptOrModule.HostDefined.public : null;
    const apiModule = Q(realm.HostDefined.resolveImportedModule(publicModule, specifier));
    if (referencingScriptOrModule !== Value.null) {
      referencingScriptOrModule.HostDefined.moduleMap.set(specifier, apiModule.module);
    }
    return apiModule.module;
  }
  return surroundingAgent.Throw('Error', 'CouldNotResolveModule', specifier);
}

function FinishDynamicImport(referencingScriptOrModule, specifier, promiseCapability, completion) {
  if (completion instanceof AbruptCompletion) {
    X(Call(promiseCapability.Reject, Value.undefined, [completion.Value]));
  } else {
    Assert(completion instanceof NormalCompletion);
    const onFulfilled = X(CreateBuiltinFunction(([v = Value.undefined]) => {
      Assert(v === Value.undefined);
      const moduleRecord = X(HostResolveImportedModule(referencingScriptOrModule, specifier));
      // Assert: Evaluate has already been invoked on moduleRecord and successfully completed.
      const namespace = EnsureCompletion(GetModuleNamespace(moduleRecord));
      if (namespace instanceof AbruptCompletion) {
        X(Call(promiseCapability.Reject, Value.undefined, [namespace.Value]));
      } else {
        X(Call(promiseCapability.Resolve, Value.undefined, [namespace.Value]));
      }
      return Value.undefined;
    }, []));
    const onRejected = X(CreateBuiltinFunction(([r = Value.undefined]) => {
      X(Call(promiseCapability.Reject, Value.undefined, [r]));
      return Value.undefined;
    }, []));
    X(PerformPromiseThen(completion.Value, onFulfilled, onRejected));
  }
}

export function HostImportModuleDynamically(referencingScriptOrModule, specifier, promiseCapability) {
  surroundingAgent.queueJob('ImportModuleDynamicallyJobs', () => {
    let completion = EnsureCompletion(HostResolveImportedModule(referencingScriptOrModule, specifier));
    if (!(completion instanceof AbruptCompletion)) {
      const module = completion.Value;
      if (module instanceof CyclicModuleRecord) {
        if (module.HostDefined.cachedCompletion) {
          completion = module.HostDefined.cachedCompletion;
        } else {
          if (module.Status !== 'linking' && module.Status !== 'evaluating') {
            completion = EnsureCompletion(module.Link());
          }
          if (!(completion instanceof AbruptCompletion)) {
            completion = EnsureCompletion(module.Evaluate());
            module.HostDefined.cachedCompletion = completion;
          }
        }
      } else {
        completion = EnsureCompletion(module.Link());
        if (!(completion instanceof AbruptCompletion)) {
          completion = EnsureCompletion(module.Evaluate());
        }
      }
    }
    FinishDynamicImport(referencingScriptOrModule, specifier, promiseCapability, completion);
  });
  return new NormalCompletion(Value.undefined);
}

// #sec-hostgetimportmetaproperties
export function HostGetImportMetaProperties(moduleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.getImportMetaProperties) {
    return X(realm.HostDefined.getImportMetaProperties(moduleRecord.HostDefined.public));
  }
  return [];
}

// #sec-hostfinalizeimportmeta
export function HostFinalizeImportMeta(importMeta, moduleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.finalizeImportMeta) {
    return X(realm.HostDefined.finalizeImportMeta(importMeta, moduleRecord.HostDefined.public));
  }
  return Value.undefined;
}

// https://tc39.es/proposal-weakrefs/#sec-host-cleanup-finalization-registry
const scheduledForCleanup = new Set();
export function HostCleanupFinalizationRegistry(fg) {
  if (surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry(fg));
  } else {
    if (!scheduledForCleanup.has(fg)) {
      scheduledForCleanup.add(fg);
      surroundingAgent.queueJob('FinalizationCleanup', () => {
        scheduledForCleanup.delete(fg);
        CleanupFinalizationRegistry(fg);
      });
    }
  }
  return new NormalCompletion(undefined);
}
