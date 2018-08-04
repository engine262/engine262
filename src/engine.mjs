/* @flow */

/* ::
import type {
  PrimitiveValue,
  FunctionValue,
} from './value.mjs';
*/

import {
  SymbolValue,
  New as NewValue,
  Type,
} from './value.mjs';

import { ParseScript, ParseModule } from './parse.mjs';

import {
  AbruptCompletion,
  ThrowCompletion,
  NormalCompletion,
} from './completions.mjs';
import {
  LexicalEnvironment,
  EnvironmentRecord,
  DeclarativeEnvironmentRecord,
  ObjectEnvironmentRecord,
  GlobalEnvironmentRecord,
} from './environment.mjs';

import { CreateObjectPrototype } from './intrinsics/ObjectPrototype.mjs';
import { CreateObject } from './intrinsics/Object.mjs';
import { CreateArrayPrototype } from './intrinsics/ArrayPrototype.mjs';
import { CreateArray } from './intrinsics/Array.mjs';
import { CreateBooleanPrototype } from './intrinsics/BooleanPrototype.mjs';
import { CreateBoolean } from './intrinsics/Boolean.mjs';
import { CreateSymbolPrototype } from './intrinsics/SymbolPrototype.mjs';
import { CreateSymbol } from './intrinsics/Symbol.mjs';
import { CreateMath } from './intrinsics/Math.mjs';

import {
  Assert,
  Construct,
  CreateBuiltinFunction,
  Get,
  IsArray,
  IsPropertyKey,
  ObjectCreate,
  ToBoolean,
} from './abstract-ops/all.mjs';

// totally wrong but aaaaaaaaa
export function Evaluate(body /* : Object */, envRec /* : EnvironmentRecord */) {
  if (body.type === 'Program') {
    const res = body.childElements
      .filter((e) => e.type !== 'Punctuator' && e.type !== 'EOF')
      .map((e) => Evaluate(e, envRec));
    return new NormalCompletion(res[res.length - 1]);
  }

  if (body.type === 'ExpressionStatement') {
    const res = body.childElements
      .filter((e) => e.type !== 'Punctuator')
      .map((e) => Evaluate(e, envRec));
    return res[res.length - 1];
  }

  if (body.type === 'BooleanLiteral') {
    return NewValue(body.firstChild.value);
  }

  console.log(body);
}


/* ::
declare type Job = {
  Job: function,
  Arguments: any[],
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
  executionContextStack: ExecutionContext[]
  jobQueues: Map<string, Job[]>
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

  get currentRealmRecord() /* : Realm */ {
    const currentCtx = this.runningExecutionContext;
    if (currentCtx !== undefined) {
      return currentCtx.Realm;
    }
    // $FlowFixMe
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

  intrinsic(name /* : string */) {
    return this.currentRealmRecord.Intrinsics[name];
  }

  Throw(type /* : string */, args /* : ?Value[] */) {
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    const error = Construct(cons, args);
    throw new ThrowCompletion(error);
  }
}
Agent.Increment = 0;

export const surroundingAgent = new Agent();

/* ::
declare type IntrinsicMap = {
 [string]: Value,
};
*/

export class Realm {
  /* ::
  Intrinsics: IntrinsicMap
  GlobalObject: ?ObjectValue
  GlobalEnv: ?EnvironmentRecord
  TemplateMap: ?Object
  HostDefined: ?Object
  */
  constructor() {
    // $FlowFixMe
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnv = undefined;
    this.TemplateMap = undefined;
    this.HostDefined = undefined;
  }
}

export class ExecutionContext {
  /* ::
  codeEvaluationState: ?boolean
  Function: ?FunctionValue
  Realm: Realm
  ScriptOrModule: ?Object
  */
  constructor() {
    this.codeEvaluationState = undefined;
    this.Function = undefined;
    // $FlowFixMe
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
  }
}

export function IsArrayIndex(P /* : Value */) {
  Assert(IsPropertyKey(P));
  if (typeof P !== 'string') {
    const type = Type(P);
    if (type === 'Symbol') {
      return false;
    }
    if (type === 'String') {
      P = P.stringValue();
    }
  }
  const index = Number.parseInt(P.numberValue(), 10);
  if (index >= 0 && index < (2 ** 32) - 1) {
    return true;
  }
  return false;
}

// 8.1.2.5 NewGlobalEnvironment
export function NewGlobalEnvironment(G, thisValue) {
  const env = new LexicalEnvironment();
  const objRec = new ObjectEnvironmentRecord(G);
  const dclRec = new DeclarativeEnvironmentRecord();
  const globalRec = new GlobalEnvironmentRecord();

  globalRec.ObjectRecord = objRec;
  globalRec.GlobalThisValue = thisValue;
  globalRec.DeclarativeRecord = dclRec;
  globalRec.VarNames = [];

  env.EnvironmentRecord = globalRec;

  env.outerLexicalEnvironment = null;

  return env;
}

// 8.2.1 CreateRealm
export function CreateRealm() {
  const realmRec = new Realm();
  CreateIntrinsics(realmRec);
  realmRec.GlobalObject = undefined;
  realmRec.GlobalEnv = undefined;
  realmRec.TemplateMap = undefined;
  return realmRec;
}

// 8.2.2 CreateIntrinsics
function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  // %Array%
  // %ArrayBuffer%
  // %ArrayBufferPrototype%
  // %ArrayIteratorPrototype%
  // %ArrayPrototype%
  // %ArrayProto_entries%
  // %ArrayProto_forEach%
  // %ArrayProto_keys%
  // %ArrayProto_values%
  // %AsyncFromSyncIteratorPrototype%
  // %AsyncFunction%
  // %AsyncFunctionPrototype%
  // %AsyncGenerator%
  // %AsyncGeneratorFunction%
  // %AsyncGeneratorPrototype%
  // %AsyncIteratorPrototype%
  // %Atomics%
  // %Boolean%
  // %BooleanPrototype%
  // %DataView%
  // %DataViewPrototype%
  // %Date%
  // %DatePrototype%
  // %decodeURI%
  // %decodeURIComponent%
  // %encodeURI%
  // %encodeURIComponent%
  // %Error%
  // %ErrorPrototype%
  // %eval%
  // %EvalError%
  // %EvalErrorPrototype%
  // %Float32Array%
  // %Float32ArrayPrototype%
  // %Float64Array%
  // %Float64ArrayPrototype%
  // %Function%
  // %FunctionPrototype%
  // %Generator%
  // %GeneratorFunction%
  // %GeneratorPrototype%
  // %Int8Array%
  // %Int8ArrayPrototype%
  // %Int16Array%
  // %Int16ArrayPrototype%
  // %Int32Array%
  // %Int32ArrayPrototype%
  // %isFinite%
  // %isNaN%
  // %IteratorPrototype%
  // %JSON%
  // %JSONParse%
  // %JSONStringify%
  // %Map%
  // %MapIteratorPrototype%
  // %MapPrototype%
  // %Math%
  // %Number%
  // %NumberPrototype%
  // %Object%
  // %ObjectPrototype%
  // %ObjProto_toString%
  // %ObjProto_valueOf%
  // %parseFloat%
  // %parseInt%
  // %Promise%
  // %PromisePrototype%
  // %PromiseProto_then%
  // %Promise_all%
  // %Promise_reject%
  // %Promise_resolve%
  // %Proxy%
  // %RangeError%
  // %RangeErrorPrototype%
  // %ReferenceError%
  // %ReferenceErrorPrototype%
  // %Reflect%
  // %RegExp%
  // %RegExpPrototype%
  // %Set%
  // %SetIteratorPrototype%
  // %SetPrototype%
  // %SharedArrayBuffer%
  // %SharedArrayBufferPrototype%
  // %String%
  // %StringIteratorPrototype%
  // %StringPrototype%
  // %Symbol%
  // %SymbolPrototype%
  // %SyntaxError%
  // %SyntaxErrorPrototype%
  // %ThrowTypeError%
  // %TypedArray%
  // %TypedArrayPrototype%
  // %TypeError%
  // %TypeErrorPrototype%
  // %Uint8Array%
  // %Uint8ArrayPrototype%
  // %Uint8ClampedArray%
  // %Uint8ClampedArrayPrototype%
  // %Uint16Array%
  // %Uint16ArrayPrototype%
  // %Uint32Array%
  // %Uint32ArrayPrototype%
  // %URIError%
  // %URIErrorPrototype%
  // %WeakMap%
  // %WeakMapPrototype%
  // %WeakSet%
  // %WeakSetPrototype%

  // Well-known symbols
  const wellKnownSymbolNames = [
    'asyncIterator',
    'hasInstance',
    'isConcatSpreadable',
    'iterator',
    'match',
    'replace',
    'search',
    'species',
    'split',
    'toPrimitive',
    'toStringTag',
    'unscopables',
  ];

  wellKnownSymbolNames.forEach((name) => {
    const sym = new SymbolValue(realmRec, NewValue(name, realmRec));
    realmRec.Intrinsics[`@@${name}`] = sym;
  });

  const objProto = ObjectCreate(NewValue(null, realmRec));
  intrinsics['%ObjectPrototype%'] = objProto;
  CreateObjectPrototype(realmRec);

  const thrower = CreateBuiltinFunction(() => {
    surroundingAgent.Throw('TypeError');
  }, [], realmRec, NewValue(null, realmRec));
  intrinsics['%ThrowTypeError%'] = thrower;

  const funcProto = CreateBuiltinFunction(() => {}, [], realmRec, objProto);
  intrinsics['%FunctionPrototype%'] = funcProto;

  thrower.SetPrototypeOf(funcProto);

  CreateObject(realmRec);

  CreateArrayPrototype(realmRec);
  CreateArray(realmRec);

  CreateBooleanPrototype(realmRec);
  CreateBoolean(realmRec);

  CreateSymbolPrototype(realmRec);
  CreateSymbol(realmRec);

  wellKnownSymbolNames.forEach((name) => {
    realmRec.Intrinsics['%Symbol%'].DefineOwnProperty(
      NewValue(name, realmRec), {
        Value: realmRec.Intrinsics[`@@${name}`],
        Writable: false,
        Enumerable: false,
        Configurable: false,
      },
    );
  });

  CreateMath(realmRec);

  return intrinsics;
}

// 8.2.3 SetRealmGlobalObject
function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  if (globalObj.isUndefined()) {
    const intrinsics = realmRec.Intrinsics;
    globalObj = ObjectCreate(intrinsics.ObjectPrototype);
  }

  if (thisValue.isUndefined()) {
    thisValue = globalObj;
  }

  realmRec.GlobalObject = globalObj;

  const newGlobalEnv = NewGlobalEnvironment(globalObj, thisValue);
  realmRec.GlobalEnv = newGlobalEnv;

  return realmRec;
}

// 8.2.4 SetDefaultGlobalBindings
export function SetDefaultGlobalBindings(realmRec) {
  const global = realmRec.GlobalObject;

  return global;
}

// 8.4.1 EnqueueJob
export function EnqueueJob(queueName /* : string */, job /* : function */, args /* : any[] */) {
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
  console.log(globalObj);
}

// 8.6 RunJobs
export function RunJobs() {
  InitializeHostDefinedRealm();

  // In an implementation-dependent manner, obtain the ECMAScript source texts

  const scripts = [
    { sourceText: 'true;', hostDefined: undefined },
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

// 13.2.7 Static Semantics: TopLevelLexicallyDeclaredNames
export function TopLevelLexicallyDeclaredNames() {
  return [];
}

// 13.2.9 Static Semantics TopLevelVarDeclaredNames
export function TopLevelVarDeclaredNames(StatementList) {
  return StatementList
    .filter((c) => c.type === 'VariableDeclaration')
    .map((c) => c.childElements[2].firstChild.firstChild.value);
}

// 15.1.3 LexicallyDeclaredNames
export function LexicallyDeclaredNames(ScriptBody) {
  // Return TopLevelLexicallyDeclaredNames of StatementList.
  return TopLevelLexicallyDeclaredNames(ScriptBody.body);
}

// 15.1.4 LexicallyScopedDeclarations
export function LexicallyScopedDeclarations() {
  return [];
}

// 15.1.5 VarDeclaredNames
export function VarDeclaredNames(ScriptBody) {
  // Return TopLevelVarDeclaredNames of StatementList.
  return TopLevelVarDeclaredNames(ScriptBody.childElements);
}

// 15.1.6 VarScopedDeclarations
export function VarScopedDeclarations() {
  return [];
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
  const scriptBody = scriptRecord.ECMAScriptCode;
  let result = GlobalDeclarationInstantiation(scriptBody, globalEnv);
  if (result.Type === 'normal') {
    result = Evaluate(scriptBody, globalEnv);
  }

  if (result.Type === 'normal' && result.Value.isUndefined()) {
    result = new NormalCompletion(NewValue(undefined));
  }
  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop();
  // Resume(surroundingAgent.runningExecutionContext);

  return result;
}

// 15.1.11 GlobalDeclarationInstantiation
export function GlobalDeclarationInstantiation(script, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof EnvironmentRecord);

  const lexNames = LexicallyDeclaredNames(script);
  const varNames = VarDeclaredNames(script);

  lexNames.forEach((name) => {
    if (envRec.HasVarDeclaration(name)) {
      surroundingAgent.Throw('SyntaxError');
    }
    if (envRec.HasLexicalDeclaration(name)) {
      surroundingAgent.Throw('SyntaxError');
    }
    const hasRestrictedGlobal = envRec.HasRestrictedGlobalProperty(name);
    if (hasRestrictedGlobal) {
      surroundingAgent.Throw('SyntaxError');
    }
  });

  varNames.forEach((name) => {
    if (envRec.HasLexicalDeclaration(name)) {
      envRec.Realm.execption.SyntaxError();
    }
  });

  const varDeclarations = VarScopedDeclarations(script);

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

  const lexDeclarations = LexicallyScopedDeclarations(script);
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
    console.log(error);
  });
}

// 19.4.3.2.1 SymbolDescriptiveString
export function SymbolDescriptiveString(sym) {
  Assert(Type(sym) === 'Symbol');
  let desc = sym.Description;
  if (desc.isUndefined()) {
    desc = NewValue('');
  }
  return NewValue(sym.realm, `Symbol(${desc.value})`);
}

// 22.1.3.1 IsConcatSpreadable
export function IsConcatSpreadable(O) {
  if (Type(O) !== 'Object') {
    return false;
  }
  const spreadable = Get(O, O.realm.Intrinsics['@@isConcatSpreadable']);
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
