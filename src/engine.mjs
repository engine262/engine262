/* @flow */

/* ::
import type {
  Value,
  PrimitiveValue,
  StringValue,
  SymbolValue,
  ObjectValue,
  FunctionValue,
} from './value.mjs';
import type {
  List,
} from './abstract-ops/spec-types.mjs';
import type {
  Realm,
} from './realm.mjs';
*/

import {
  UndefinedValue,
  NullValue,
  wellKnownSymbols,
  New as NewValue,
  Type,
} from './value.mjs';

import { ParseScript, ParseModule } from './parse.mjs';

import {
  AbruptCompletion,
  ThrowCompletion,
  NormalCompletion,
  Q,
} from './completion.mjs';
import {
  EnvironmentRecord,
} from './environment.mjs';
import {
  CreateRealm,
  SetRealmGlobalObject,
  SetDefaultGlobalBindings,
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
  LexicallyDeclaredNames_ScriptBody,
  LexicallyScopedDeclarations_ScriptBody,
  VarDeclaredNames_ScriptBody,
  VarScopedDeclarations_ScriptBody,
} from './static-semantics/all.mjs';
import {
  EvaluateScript,
} from './evaluator.mjs';


/* ::
declare type Job = {
  Job: function,
  Arguments: List<any>,
  Realm: Realm,
  ScriptOrModule: ?Object,
  HostDefined: ?Object,
};
*/

export class Agent {
  /* ::
  static Increment: number
  LittleEndian: boolean
  CanBlock: boolean
  Signifier: number
  IsLockFree1: boolean
  IsLockFree2: boolean
  CandidateExecution: ?Object
  executionContextStack: List<ExecutionContext>
  jobQueues: Map<string, List<Job>>
  */
  constructor() {
    this.LittleEndian = false;
    this.CanBlock = true;
    this.Signifier = Agent.Increment;
    Agent.Increment += 1;
    this.IsLockFree1 = true;
    this.IsLockFree2 = true;
    this.CandidateExecution = undefined;

    this.executionContextStack = [];

    this.jobQueues = new Map([
      ['ScriptJobs', []],
    ]);
  }

  get runningExecutionContext() {
    return this.executionContextStack[this.executionContextStack.length - 1];
  }

  get currentRealmRecordOrUndefined() /* : Realm | void */ {
    const currentCtx = this.runningExecutionContext;
    if (currentCtx !== undefined) {
      return currentCtx.Realm;
    }
    return undefined;
  }

  get currentRealmRecord() /* : Realm */ {
    const currentRealmRecord = this.currentRealmRecordOrUndefined;
    Assert(currentRealmRecord !== undefined);
    return currentRealmRecord;
  }

  get activeFunctionObject() {
    return this.runningExecutionContext.Function;
  }

  pickQueue() {
    for (const queue of this.jobQueues.values()) {
      if (queue.length > 0) {
        return queue;
      }
    }
    return undefined;
  }

  intrinsic(name /* : string */) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  Throw(type /* : string */, args /* : ?List<Value> */) {
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    const error = Construct(cons, args);
    throw new ThrowCompletion(error);
  }
}
Agent.Increment = 0;

export const surroundingAgent = new Agent();

export class ExecutionContext {
  /* ::
  codeEvaluationState: ?boolean
  Function: ?FunctionValue
  Realm: Realm
  ScriptOrModule: ?Object
  LexicalEnvironment: LexicalEnvironment
  VariableEnvironment: LexicalEnvironment
  */
  constructor() {
    this.codeEvaluationState = undefined;
    this.Function = undefined;
    // $FlowFixMe
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
  }
}

export function isArrayIndex(P /* : Value */) {
  Assert(IsPropertyKey(P));
  const type = Type(P);
  if (type === 'Symbol') {
    return false;
  }
  /* :: P = ((P: any): StringValue); */
  const index = Number.parseInt(P.stringValue(), 10);
  if (index >= 0 && index < (2 ** 32) - 1) {
    return true;
  }
  return false;
}

// 8.4.1 EnqueueJob
export function EnqueueJob(queueName /* : string */, job /* : function */, args /* : List<any> */) {
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

  surroundingAgent.jobQueues.get(queueName).push(pending);
}

// 8.6 InitializeHostDefinedRealm
export function InitializeHostDefinedRealm() {
  const realm = CreateRealm();
  const newContext = new ExecutionContext();
  newContext.Function = null;
  newContext.Realm = realm;
  surroundingAgent.executionContextStack.push(newContext);
  const global = NewValue(undefined);
  const thisValue = NewValue(undefined);
  SetRealmGlobalObject(realm, global, thisValue);
  const globalObj = SetDefaultGlobalBindings(realm);
  // Create any implementation-defined global object properties on globalObj.
}

// 8.6 RunJobs
export function RunJobs() {
  InitializeHostDefinedRealm();

  // In an implementation-dependent manner, obtain the ECMAScript source texts

  const scripts = [
    { sourceText: 'Object.keys(this)[0];', hostDefined: undefined },
  ];

  const modules = [];

  scripts.forEach(({ sourceText, hostDefined }) => {
    EnqueueJob('ScriptJobs', ScriptEvaluationJob, [sourceText, hostDefined]);
  });

  modules.forEach(({ sourceText, hostDefined }) => {
    EnqueueJob('ScriptJobs', TopLevelModuleEvaluationJob, [sourceText, hostDefined]);
  });

  while (true) { // eslint-disable-line no-constant-condition
    surroundingAgent.executionContextStack.pop();
    const nextQueue = surroundingAgent.pickQueue();
    // host specific behaviour
    if (!nextQueue) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.Function = null;
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    surroundingAgent.executionContextStack.push(newContext);
    try {
      const res = nextPending.Job(...nextPending.Arguments);
      console.log(res);
    } catch (result) {
      if (result instanceof AbruptCompletion) {
        HostReportErrors(result.Value);
      } else {
        throw result;
      }
    }
  }
}

// 8.7.1 AgentSignifier
export function AgentSignifier() {
  const AR = surroundingAgent;
  return AR.Signifier;
}

// 15.1.10 ScriptEvaluation
export function ScriptEvaluation(scriptRecord /* : Object */) {
  const globalEnv = scriptRecord.Realm.GlobalEnv;
  const scriptCtx = new ExecutionContext();
  scriptCtx.Function = null;
  scriptCtx.Realm = scriptRecord.Realm;
  scriptCtx.ScriptOrModule = scriptRecord;
  scriptCtx.VariableEnvironment = globalEnv;
  scriptCtx.LexicalEnvironment = globalEnv;
  // Suspend runningExecutionContext
  surroundingAgent.executionContextStack.push(scriptCtx);
  const scriptBody = scriptRecord.ECMAScriptCode.body;
  let result = GlobalDeclarationInstantiation(scriptBody, globalEnv);
  if (result.Type === 'normal') {
    result = EvaluateScript(scriptBody, globalEnv);
  }

  if (result.Type === 'normal' && !result.Value) {
    result = new NormalCompletion(NewValue(undefined));
  }
  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop();
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

// 15.1.11 GlobalDeclarationInstantiation
export function GlobalDeclarationInstantiation(script /* : Object */, env /* : Object */) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof EnvironmentRecord);

  const lexNames = LexicallyDeclaredNames_ScriptBody(script);
  const varNames = VarDeclaredNames_ScriptBody(script);

  lexNames.forEach((name) => {
    if (envRec.HasVarDeclaration(name)) {
      return surroundingAgent.Throw('SyntaxError');
    }
    if (envRec.HasLexicalDeclaration(name)) {
      return surroundingAgent.Throw('SyntaxError');
    }
    const hasRestrictedGlobal = envRec.HasRestrictedGlobalProperty(name);
    if (hasRestrictedGlobal) {
      return surroundingAgent.Throw('SyntaxError');
    }
  });

  varNames.forEach((name) => {
    if (envRec.HasLexicalDeclaration(name)) {
      envRec.Realm.execption.SyntaxError();
    }
  });

  const varDeclarations = VarScopedDeclarations_ScriptBody(script);

  const functionsToInitialize = [];
  // const declaredFunctionNames = [];

  varDeclarations.reverse().forEach(() => {
    // stuff
  });

  const declaredVarNames = [];

  varDeclarations.forEach(() => {
    // stuff
  });

  const strict = script.IsStrict;
  if (strict === false) {
    // annex b
  }

  const lexDeclarations = LexicallyScopedDeclarations_ScriptBody(script);
  lexDeclarations.forEach(() => {
    // stuff
  });

  functionsToInitialize.forEach(() => {
    // stuff
  });

  declaredVarNames.forEach((vn) => {
    envRec.CreateGlobalVarBinding(vn, false);
  });

  return new NormalCompletion();
}

// 15.1.12 ScriptEvaluationJob
export function ScriptEvaluationJob(sourceText /* : string */, hostDefined /* : any */) {
  const realm = surroundingAgent.currentRealmRecord;
  const s = ParseScript(sourceText, realm, hostDefined);
  return ScriptEvaluation(s);
}

// 15.2.1.19
export function TopLevelModuleEvaluationJob(sourceText /* : string */, hostDefined /* : any */) {
  const realm = surroundingAgent.currentRealmRecord;
  const m = ParseModule(sourceText, realm, hostDefined);
  m.Instantiate();
  m.Evaluate();
}

// 16.1 HostReportErrors
export function HostReportErrors(errorList /* : any[] */) {
  errorList.forEach((error) => {
    console.log(error);
  });
}

export function HostPromiseRejectionTracker(promise, type) {}

// 19.4.3.2.1 SymbolDescriptiveString
export function SymbolDescriptiveString(sym /* : SymbolValue */) {
  Assert(Type(sym) === 'Symbol');
  let desc = sym.Description;
  if (desc instanceof UndefinedValue) {
    desc = NewValue('');
  }
  return NewValue(`Symbol(${desc.stringValue()})`);
}

// 22.1.3.1 IsConcatSpreadable
export function IsConcatSpreadable(O /* : Value */) {
  if (Type(O) !== 'Object') {
    return NewValue(false);
  }
  const spreadable = Get(O, wellKnownSymbols.isConcatSpreadable);
  if (spreadable.value !== undefined) {
    return ToBoolean(spreadable);
  }
  return IsArray(O);
}

// 24.4.1.9 Suspend
export function Suspend(WL, W) {
  // Assert: The calling agent is in the critical section for WL.
  Assert(W === AgentSignifier());
  // LeaveCriticalSection(WL);
  // suspend W for up to timeout milliseconds, performing the
  // combined operation in such a way that a wakeup that arrives
  // after the critical section is exited but before the suspension
  // takes effect is not lost. W can wake up either because the
  // timeout expired or because it was woken explicitly by another
  // agent calling WakeWaiter(WL, W), and not for any other reasons at all.
  // EnterCriticalSection(WL);
  // If W was woken explicitly by another agent calling WakeWaiter(WL, W), return true.
  return false;
}

// #sec-getthisenvironment
export function GetThisEnvironment() {
  let lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  while (true) {
    const envRec = lex.EnvironmentRecord;
    const exists = envRec.HasThisBinding();
    if (exists) {
      return envRec;
    }
    const outer = envRec.outerEnvironment;
    Assert(!(outer instanceof NullValue));
    lex = outer;
  }
}

// #sec-resolvethisbinding
export function ResolveThisBinding() {
  const envRec = GetThisEnvironment();
  return Q(envRec.GetThisBinding());
}
