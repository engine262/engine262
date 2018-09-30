import {
  Value,
  Type,
  wellKnownSymbols,
} from './value.mjs';
import { ParseModule, ParseScript } from './parse.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  ThrowCompletion,
} from './completion.mjs';
import {
  CreateRealm,
  SetDefaultGlobalBindings,
  SetRealmGlobalObject,
} from './realm.mjs';
import {
  Assert,
  Construct,
  Get,
  IsArray,
  IsPropertyKey,
  ToBoolean,
} from './abstract-ops/all.mjs';
import {
  GlobalDeclarationInstantiation,
} from './runtime-semantics/all.mjs';
import {
  Evaluate_Script,
} from './evaluator.mjs';

export class Agent {
  constructor() {
    this.LittleEndian = false;
    this.CanBlock = true;
    this.Signifier = Agent.Increment;
    Agent.Increment += 1;
    this.IsLockFree1 = true;
    this.IsLockFree2 = true;
    this.CandidateExecution = undefined;

    this.executionContextStack = [];

    this.jobQueue = [];
  }

  get isStrictCode() {
    // TODO(strict)
    return true;
  }

  get runningExecutionContext() {
    return this.executionContextStack[this.executionContextStack.length - 1];
  }

  get currentRealmRecord() {
    const currentCtx = this.runningExecutionContext;
    if (currentCtx !== undefined) {
      return currentCtx.Realm;
    }
    return undefined;
  }

  get activeFunctionObject() {
    return this.runningExecutionContext.Function;
  }

  intrinsic(name) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  Throw(type, message) {
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    const error = Construct(cons, message ? [new Value(message)] : []);
    error.hostTrace = new Error().stack;
    return new ThrowCompletion(error);
  }
}
Agent.Increment = 0;

export let surroundingAgent = new Agent();
export function setSurroundingAgent(a) {
  surroundingAgent = a;
}

export class ExecutionContext {
  constructor() {
    this.codeEvaluationState = undefined;
    this.Function = undefined;
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
    this.LexicalEnvironment = undefined;
  }
}

export function isArrayIndex(P) {
  Assert(IsPropertyKey(P));
  const type = Type(P);
  if (type === 'Symbol') {
    return false;
  }

  const index = Number.parseInt(P.stringValue(), 10);
  if (index >= 0 && index < (2 ** 32) - 1) {
    return true;
  }
  return false;
}

// 8.4.1 #sec-enqueuejob
export function EnqueueJob(queueName, job, args) {
  const callerContext = surroundingAgent.runningExecutionContext;
  const callerRealm = callerContext.Realm;
  const callerScriptOrModule = callerContext.ScriptOrModule;
  const pending = {
    Job: job,
    Arguments: args,
    Realm: callerRealm,
    ScriptOrModule: callerScriptOrModule,
    HostDefined: undefined,
  };
  surroundingAgent.jobQueue.push(pending);
}

// 8.5 #sec-initializehostdefinedrealm
export function InitializeHostDefinedRealm() {
  const realm = CreateRealm();
  const newContext = new ExecutionContext();
  newContext.Function = new Value(null);
  newContext.Realm = realm;
  newContext.ScriptOrModule = new Value(null);
  surroundingAgent.executionContextStack.push(newContext);
  const global = new Value(undefined);
  const thisValue = new Value(undefined);
  SetRealmGlobalObject(realm, global, thisValue);
  SetDefaultGlobalBindings(realm);
}

// 8.6 #sec-runjobs
export function RunJobs() {
  InitializeHostDefinedRealm();

  // In an implementation-dependent manner, obtain the ECMAScript source texts

  const scripts = [];

  const modules = [];

  scripts.forEach(({ sourceText, hostDefined }) => {
    EnqueueJob('ScriptJobs', ScriptEvaluationJob, [sourceText, hostDefined]);
  });

  modules.forEach(({ sourceText, hostDefined }) => {
    EnqueueJob('ScriptJobs', TopLevelModuleEvaluationJob, [sourceText, hostDefined]);
  });

  while (true) { // eslint-disable-line no-constant-condition
    surroundingAgent.executionContextStack.pop();
    const nextQueue = surroundingAgent.jobQueue;
    if (nextQueue.length === 0) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.Function = new Value(null);
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    surroundingAgent.executionContextStack.push(newContext);
    const result = nextPending.Job(...nextPending.Arguments);
    if (result instanceof AbruptCompletion) {
      HostReportErrors([result.Value]);
    }
  }
}

// 8.7.1 #sec-agentsignifier
export function AgentSignifier() {
  const AR = surroundingAgent;
  return AR.Signifier;
}

// 15.1.10 #sec-runtime-semantics-scriptevaluation
export function ScriptEvaluation(scriptRecord) {
  const globalEnv = scriptRecord.Realm.GlobalEnv;
  const scriptCtx = new ExecutionContext();
  scriptCtx.Function = new Value(null);
  scriptCtx.Realm = scriptRecord.Realm;
  scriptCtx.ScriptOrModule = scriptRecord;
  scriptCtx.VariableEnvironment = globalEnv;
  scriptCtx.LexicalEnvironment = globalEnv;
  // Suspend runningExecutionContext
  surroundingAgent.executionContextStack.push(scriptCtx);
  const scriptBody = scriptRecord.ECMAScriptCode.body;
  let result = GlobalDeclarationInstantiation(scriptBody, globalEnv);
  if (result.Type === 'normal') {
    result = Evaluate_Script(scriptBody, globalEnv);
  }
  if (result.Type === 'normal' && !result.Value) {
    result = new NormalCompletion(new Value(undefined));
  }
  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop();
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

// 15.1.12 #sec-scriptevaluationjob
export function ScriptEvaluationJob(sourceText, hostDefined) {
  const realm = surroundingAgent.currentRealmRecord;
  const s = ParseScript(sourceText, realm, hostDefined);
  if (Array.isArray(s)) {
    HostReportErrors(s);
    return new NormalCompletion(undefined);
  }
  return ScriptEvaluation(s);
}

// 15.2.1.19 #sec-toplevelmoduleevaluationjob
export function TopLevelModuleEvaluationJob(sourceText, hostDefined) {
  const realm = surroundingAgent.currentRealmRecord;
  const m = ParseModule(sourceText, realm, hostDefined);
  m.Instantiate();
  m.Evaluate();
}

// 16.1 #sec-host-report-errors
export function HostReportErrors(errorList) {
  errorList.forEach((error) => {
    console.log('[HostReportErrors]', error); // eslint-disable-line no-console
  });
}

export function HostEnsureCanCompileStrings() {
  return new NormalCompletion(undefined);
}

export function HostPromiseRejectionTracker() {}

// 22.1.3.1 #sec-isconcatspreadable
export function IsConcatSpreadable(O) {
  if (Type(O) !== 'Object') {
    return new Value(false);
  }
  const spreadable = Get(O, wellKnownSymbols.isConcatSpreadable);
  if (spreadable.value !== undefined) {
    return ToBoolean(spreadable);
  }
  return IsArray(O);
}

// 24.4.1.9 #sec-suspend
export function Suspend() {}
