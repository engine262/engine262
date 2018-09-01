import {
  New as NewValue,
  Type,
  wellKnownSymbols,
} from './value.mjs';
import { ParseModule, ParseScript } from './parse.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  Q,
  ThrowCompletion, X,
} from './completion.mjs';
import {
  GetIdentifierReference,
  LexicalEnvironment,
} from './environment.mjs';
import {
  CreateRealm,
  SetDefaultGlobalBindings,
  SetRealmGlobalObject,
} from './realm.mjs';
import {
  Assert,
  Construct,
  CreateBuiltinFunction,
  Get,
  IsArray,
  IsPropertyKey,
  ToBoolean,
  ToString,
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

    this.jobQueues = new Map([
      ['ScriptJobs', []],
      ['PromiseJobs', []],
    ]);

    // used for tracking strict mode
    this.nodeStack = [];
  }

  get isStrictCode() {
    return this.nodeStack[this.nodeStack.length - 1].IsStrict;
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

  pickQueue() {
    for (const queue of this.jobQueues.values()) {
      if (queue.length > 0) {
        return queue;
      }
    }
    return undefined;
  }

  intrinsic(name) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  Throw(type, message) {
    if (!message) {
      console.trace(type);
    }
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    const error = Construct(cons, message ? [NewValue(message)] : []);
    return new ThrowCompletion(error);
  }
}
Agent.Increment = 0;

export const surroundingAgent = new Agent();

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

// 8.4.1 EnqueueJob
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

  surroundingAgent.jobQueues.get(queueName).push(pending);
}

// 8.6 InitializeHostDefinedRealm
export function InitializeHostDefinedRealm() {
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

  // Create any implementation-defined global object properties on globalObj.
  globalObj.DefineOwnProperty(NewValue('print'), {
    Value: CreateBuiltinFunction((r, args) => {
      for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];
        const type = Type(arg);
        if (type === 'Undefined') {
          args[i] = 'undefined';
        } else if (type === 'Null') {
          args[i] = 'null';
        } else if (type === 'String' || type === 'Number' || type === 'Boolean') {
          args[i] = X(ToString(arg)).stringValue();
        } else if (type === 'Symbol') {
          args[i] = `Symbol(${arg.Description.stringValue()})`;
        } else if (type === 'Object') {
          const funcToString = X(Get(r.Intrinsics['%FunctionPrototype%'], NewValue('toString')));
          const errorToString = X(Get(r.Intrinsics['%ErrorPrototype%'], NewValue('toString')));
          const objectToString = r.Intrinsics['%ObjProto_toString%'];
          const toString = X(Get(arg, NewValue('toString')));
          if (toString === errorToString
              || toString === objectToString
              || toString === funcToString) {
            args[i] = X(toString.Call(arg, [])).stringValue();
          } else {
            const ctor = X(Get(arg, NewValue('constructor')));
            const ctorName = X(Get(ctor, NewValue('name'))).stringValue();
            if (ctorName !== '') {
              args[i] = `#<${ctorName.stringValue()}>`;
            } else {
              args[i] = '[objectUnknown]';
            }
          }
        } else {
          throw new RangeError();
        }
      }
      console.log('[GLOBAL PRINT]', ...args); // eslint-disable-line no-console
      return NewValue(undefined);
    }, [], realm),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
}

// 8.6 RunJobs
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
    const nextQueue = surroundingAgent.pickQueue();
    // host specific behaviour
    if (!nextQueue) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.Function = NewValue(null);
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    surroundingAgent.executionContextStack.push(newContext);
    const result = nextPending.Job(...nextPending.Arguments);
    if (result instanceof AbruptCompletion) {
      HostReportErrors([result.Value]);
    }
  }
}

export function NonSpecRunScript(sourceText) {
  InitializeHostDefinedRealm();

  const callerContext = surroundingAgent.runningExecutionContext;
  const callerRealm = callerContext.Realm;
  const callerScriptOrModule = callerContext.ScriptOrModule;

  const newContext = new ExecutionContext();
  newContext.Function = NewValue(null);
  newContext.Realm = callerRealm;
  newContext.ScriptOrModule = callerScriptOrModule;

  surroundingAgent.executionContextStack.push(newContext);

  const realm = surroundingAgent.currentRealmRecord;
  const s = ParseScript(sourceText, realm, undefined);
  const res = ScriptEvaluation(s);

  while (true) { // eslint-disable-line no-constant-condition
    surroundingAgent.executionContextStack.pop();
    const nextQueue = surroundingAgent.pickQueue();
    // host specific behaviour
    if (!nextQueue) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext(); // eslint-disable-line no-shadow
    newContext.Function = NewValue(null);
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    surroundingAgent.executionContextStack.push(newContext);
    const result = nextPending.Job(...nextPending.Arguments);
    if (result instanceof AbruptCompletion) {
      HostReportErrors([result.Value]);
    }
  }

  surroundingAgent.executionContextStack.pop();
  surroundingAgent.executionContextStack.pop();

  return res;
}

// 8.7.1 AgentSignifier
export function AgentSignifier() {
  const AR = surroundingAgent;
  return AR.Signifier;
}

// 15.1.10 ScriptEvaluation
export function ScriptEvaluation(scriptRecord) {
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
    result = Evaluate_Script(scriptBody, globalEnv);
  }

  if (result.Type === 'normal' && !result.Value) {
    result = new NormalCompletion(NewValue(undefined));
  }
  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop();
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

// 15.1.12 ScriptEvaluationJob
export function ScriptEvaluationJob(sourceText, hostDefined) {
  const realm = surroundingAgent.currentRealmRecord;
  const s = ParseScript(sourceText, realm, hostDefined);
  return ScriptEvaluation(s);
}

// 15.2.1.19
export function TopLevelModuleEvaluationJob(sourceText, hostDefined) {
  const realm = surroundingAgent.currentRealmRecord;
  const m = ParseModule(sourceText, realm, hostDefined);
  m.Instantiate();
  m.Evaluate();
}

// 16.1 HostReportErrors
export function HostReportErrors(errorList) {
  errorList.forEach((error) => {
    console.log('[HostReportErrors]', error); // eslint-disable-line no-console
  });
}

export function HostPromiseRejectionTracker() {}

// 19.4.3.2.1 SymbolDescriptiveString
export function SymbolDescriptiveString(sym) {
  Assert(Type(sym) === 'Symbol');
  let desc = sym.Description;
  if (Type(desc) === 'Undefined') {
    desc = NewValue('');
  }
  return NewValue(`Symbol(${desc.stringValue()})`);
}

// 22.1.3.1 IsConcatSpreadable
export function IsConcatSpreadable(O) {
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
export function Suspend() {}

// #sec-getactivescriptormodule
export function GetActiveScriptOrModule() {
  if (surroundingAgent.executionContextStack.length === 0) {
    return NewValue(null);
  }
  const ec = surroundingAgent.executionContextStack
    .reverse()
    .find((e) => e.ScriptOrModule !== undefined);
  if (!ec) {
    return NewValue(null);
  }
  return ec.ScriptOrModule;
}

// #sec-resolvebinding
export function ResolveBinding(name, env) {
  if (!env || Type(env) === 'Undefined') {
    env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  }
  Assert(env instanceof LexicalEnvironment);
  const strict = surroundingAgent.isStrictCode;
  return GetIdentifierReference(env, name, NewValue(strict));
}

// #sec-getthisenvironment
export function GetThisEnvironment() {
  let lex = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  while (true) { // eslint-disable-line no-constant-condition
    const envRec = lex.EnvironmentRecord;
    const exists = envRec.HasThisBinding();
    if (exists) {
      return envRec;
    }
    const outer = envRec.outerLexicalEnvironment;
    Assert(Type(outer) !== 'Null');
    lex = outer;
  }
}

// #sec-resolvethisbinding
export function ResolveThisBinding() {
  const envRec = GetThisEnvironment();
  return Q(envRec.GetThisBinding());
}

// #sec-getglobalobject
export function GetGlobalObject() {
  const ctx = surroundingAgent.runningExecutionContext;
  const currentRealm = ctx.Realm;
  return currentRealm.GlobalObject;
}
