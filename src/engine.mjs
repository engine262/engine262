import {
  Value,
  UndefinedValue,
  NullValue,
  BooleanValue,
  StringValue,
  NumberValue,
  SymbolValue,
  ObjectValue,
  ArrayValue,
  ProxyValue,
  New as NewValue,
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
import { CreateArray, ArrayCreate } from './intrinsics/Array.mjs';
import { CreateBooleanPrototype } from './intrinsics/BooleanPrototype.mjs';
import { CreateBoolean } from './intrinsics/Boolean.mjs';
import { CreateSymbolPrototype } from './intrinsics/SymbolPrototype.mjs';
import { CreateSymbol } from './intrinsics/Symbol.mjs';
import { CreateMath } from './intrinsics/Math.mjs';

// totally wrong but aaaaaaaaa
export function Evaluate(body, envRec) {
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
}

export function Assert(invarient) {
  if (!invarient) {
    throw new TypeError('Assert failed');
  }
}

export class Agent {
  constructor() {
    this.LittleEndian = false;
    this.CanBlock = true;
    this.Signifier = Agent.Increment;
    Agent.Increment += 1;
    this.IsLockFree1 = true;
    this.IsLockFree2 = true;
    this.CandidiateExecution = undefined;

    this.executionContextStack = [];

    this.jobQueues = new Map([
      ['ScriptJobs', []],
    ]);
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

  Throw(type, args) {
    const cons = this.currentRealmRecord.Intrinsics[`%${type}%`];
    const error = Construct(cons, args);
    throw new ThrowCompletion(error);
  }
}
Agent.Increment = 0;

export const surroundingAgent = new Agent();

export class Realm {
  constructor() {
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnv = undefined;
    this.TemplateMap = undefined;
    this.HostDefined = undefined;
  }
}

export class ExecutionContext {
  constructor() {
    this.codeEvaluationState = undefined;
    this.Function = undefined;
    this.Realm = undefined;
    this.ScriptOrModule = undefined;
  }
}

export function Type(val) {
  if (val instanceof UndefinedValue) {
    return 'Undefined';
  }

  if (val instanceof NullValue) {
    return 'Null';
  }

  if (val instanceof BooleanValue) {
    return 'Boolean';
  }

  if (val instanceof StringValue) {
    return 'String';
  }

  if (val instanceof NumberValue) {
    return 'Number';
  }

  if (val instanceof ObjectValue) {
    return 'Object';
  }

  if (val instanceof SymbolValue) {
    return 'Symbol';
  }

  throw new RangeError('Type(val) invalid argument');
}

export function IsArrayIndex(P) {
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
  const index = Number.parseInt(P, 10);
  if (index >= 0 && index < (2 ** 32) - 1) {
    return true;
  }
  return false;
}

// 6.2.5.1 IsAccessorDescriptor
export function IsAccessorDescriptor(Desc) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Get' in Desc) && !('Set' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.2 IsDataDescriptor
export function IsDataDescriptor(Desc) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Value' in Desc) && !('Writable' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.3 IsGenericDescriptor
export function IsGenericDescriptor(Desc) {
  if (Desc === undefined) {
    return false;
  }

  if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
    return false;
  }

  return true;
}

// 7.1.1 ToPrimitive
export function ToPrimitive(input, preferredType) {
  if (Type(input) === 'Object') {
    let hint;
    if (preferredType === undefined) {
      hint = NewValue('default');
    } else if (preferredType === 'String') {
      hint = NewValue('string');
    } else if (preferredType === 'Number') {
      hint = NewValue('number');
    }
    const exoticToPrim = GetMethod(input, input.realm.Intrinsics['@@toPrimitive']);
    if (exoticToPrim.value !== undefined) {
      const result = Call(exoticToPrim, input, [hint]);
      if (Type(result) !== 'Object') {
        return result;
      }
      surroundingAgent.Throw('TypeError');
    }
    if (hint.value === 'default') {
      hint = NewValue('number');
    }
    return OrdinaryToPrimitive(input, hint);
  }
  return input;
}

// 7.1.1.1 OrdinaryToPrimitive
export function OrdinaryToPrimitive(O, hint) {
  Assert(Type(O) === 'Object');
  Assert(Type(hint) === 'String'
         && (hint.value === 'string' || hint.value === 'number'));
  let methodNames;
  if (hint.value === 'string') {
    methodNames = [NewValue('toString'), NewValue('valueOf')];
  } else {
    methodNames = [NewValue('valueOf'), NewValue('toString')];
  }
  for (const name of methodNames) {
    const method = Get(O, name);
    if (IsCallable(method) === true) {
      const result = Call(method, O);
      if (Type(result) !== 'Object') {
        return result;
      }
    }
  }
  surroundingAgent.Throw('TypeError');
}

// 7.1.3 ToNumber
export function ToNumber(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return NewValue(NaN);
    case 'Null':
      return NewValue(0);
    case 'Boolean':
      if (argument.value) {
        return NewValue(1);
      }
      return NewValue(0);

    case 'Number':
      return argument;
    case 'Symbol':
      return surroundingAgent.Throw('TypeError');
    case 'Object': {
      const primValue = ToPrimitive(argument, 'Number');
      return ToNumber(primValue);
    }
    default:
      throw new RangeError('ToNumber(argument) unknown type');
  }
}

// 7.1.4 ToInteger
export function ToInteger(argument) {
  const number = ToNumber(argument);
  if (Number.isNaN(number.value)) {
    return NewValue(0);
  }
  if (number.value === 0 // || number.value === -0
      || number.value === Infinity
      || number.value === -Infinity) {
    return number;
  }
  return NewValue(
    Math.floor(Math.abs(number.value)) * number.value > 0 ? 1 : -1,
  );
}

// 7.1.6 ToUint32
export function ToUint32(argument) {
  const number = ToNumber(argument);
  if (number.value === 0 // || number.value === -0
      || number.value === Infinity
      || number.value === -Infinity) {
    return NewValue(0);
  }
  const int = Math.floor(Math.abs(number.value)) * number.value > 0 ? 1 : -1;
  const int32bit = int % (2 ** 32);
  return NewValue(int32bit);
}

// 7.1.12 ToString
export function ToString(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return NewValue('undefined');
    case 'Null':
      return NewValue('null');
    case 'Boolean':
      return NewValue(argument.value ? 'true' : 'false');
    case 'Number':
      return NumberToString(argument);
    case 'String':
      return argument;
    case 'Symbol':
      return surroundingAgent.Throw('TypeError');
    case 'Object': {
      const primValue = ToPrimitive(argument, 'String');
      return ToString(primValue);
    }
    default:
      throw new RangeError('ToString(argument) unknown type');
  }
}

// 7.1.12.1 NumberToString
export function NumberToString(m) {
  if (Number.isNaN(m.value)) {
    return NewValue('NaN');
  }
}

// 7.1.13 ToObject
export function ToObject(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError');
    case 'Null':
      return surroundingAgent.Throw('TypeError');
    case 'Boolean': {
      const obj = new ObjectValue(argument.realm, argument.realm.Intrinsics['%BooleanPrototype%']);
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      const obj = new ObjectValue(argument.realm, argument.realm.Intrinsics['%NumberPrototype%']);
      obj.NumberData = argument;
      return obj;
    }
    case 'String': {
      const obj = new ObjectValue(argument.realm, argument.realm.Intrinsics['%StringPrototype%']);
      obj.StringData = argument;
      return obj;
    }
    case 'Symbol': {
      const obj = new ObjectValue(argument.realm, argument.realm.Intrinsics['%SymbolPrototype%']);
      obj.SymbolData = argument;
      return obj;
    }
    case 'Object':
      return argument;
    default:
      throw new RangeError('ToObject(argument) unknown type');
  }
}

// 7.1.14 ToPropertyKey
export function ToPropertyKey(argument) {
  const key = ToPrimitive(argument, 'String');
  if (Type(key) === 'Symbol') {
    return key;
  }
  return ToString(key);
}

// 7.1.15 ToLength
export function ToLength(argument) {
  const len = ToInteger(argument);
  if (len.value <= 0) {
    return NewValue(0);
  }
  return Math.min(len, (2 ** 53) - 1);
}

// 7.2.2 IsArray
export function IsArray(argument) {
  if (Type(argument) !== 'Object') {
    return false;
  }
  if (argument instanceof ArrayValue) {
    return true;
  }
  if (argument instanceof ProxyValue) {
    if (argument.ProxyHandler.isNull()) {
      surroundingAgent.Throw('TypeError');
    }
    const target = argument.ProxyTarget;
    return IsArray(target);
  }
  return false;
}

// 7.2.3 IsCallable
export function IsCallable(argument) {
  if (Type(argument) !== 'Object') {
    return false;
  }
  if ('Call' in argument) {
    return true;
  }
  return false;
}

// 7.2.4 IsConstructor
export function IsConstructor(argument) {
  if (Type(argument) !== 'Object') {
    return false;
  }
  if ('Construct' in argument) {
    return true;
  }
  return false;
}

// 7.2.5 IsExtensible
export function IsExtensible(O) {
  Assert(Type(O) === 'Object');
  return O.IsExtensible();
}

// 7.2.10 SameValue
export function SameValue(x, y) {
  if (Type(x) !== Type(y)) {
    return false;
  }

  if (Type(x) === 'Number') {
    if (Number.isNaN(x.value) && Number.isNaN(y.value)) {
      return true;
    }
    if (Object.is(x.value, 0) && Object.is(y.value, -0)) {
      return false;
    }
    if (Object.is(x.value, -0) && Object.is(y.value, 0)) {
      return false;
    }
    if (x.value === y.value) {
      return true;
    }
    return false;
  }

  return SameValueNonNumber(x, y);
}

// 7.2.12 SameValueNonNumber
export function SameValueNonNumber(x, y) {
  Assert(Type(x) !== 'Number');
  Assert(Type(x) === Type(y));

  if (Type(x) === 'Undefined') {
    return true;
  }

  if (Type(x) === 'Null') {
    return true;
  }

  if (Type(x) === 'String') {
    if (x.value === y.value) {
      return true;
    }
    return false;
  }

  if (Type(x) === 'Boolean') {
    if (x.value === y.value) {
      return true;
    }
    return false;
  }

  if (Type(x) === 'Symbol') {
    return x === y;
  }

  return x === y;
}

// 7.2.7 IsPropertyKey
export function IsPropertyKey(argument) {
  if (Type(argument) === 'String') {
    return true;
  }
  if (Type(argument) === 'Symbol') {
    return true;
  }
  return false;
}

// 7.2.22 GetFunctionRealm
export function GetFunctionRealm(obj) {
  Assert(IsCallable(obj));
  if ('Realm' in obj) {
    return obj.Realm;
  }

  /*
  if (IsBoundFunctionExoticObject(obj)) {
    const target = obj.BoundTargetFunction;
    return GetFunctionRealm(target);
  }
  */

  if (obj instanceof ProxyValue) {
    if (obj.ProxyHandler.isNull()) {
      surroundingAgent.Throw('TypeError');
      const proxyTarget = obj.ProxyTarget;
      return GetFunctionRealm(proxyTarget);
    }
  }

  return surroundingAgent.currentRealmRecord;
}

// 7.3.1 Get
export function Get(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return O.Get(P, O);
}

// 7.3.2 GetV
export function GetV(V, P) {
  Assert(IsPropertyKey(P));
  const O = ToObject(V);
  return O.Get(V, P);
}

// 7.3.4 CreateDataProperty
export function CreateDataProperty(O, P, V) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));

  const newDesc = {
    Value: V,
    Writable: true,
    Enumerable: true,
    Configurable: true,
  };
  return O.DefineOwnProperty(P, newDesc);
}

// 7.3.6 CreateDataPropertyOrThrow
export function CreateDataPropertyOrThrow(O, P, V) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const success = CreateDataProperty(O, P, V);
  if (success === false) {
    surroundingAgent.Throw('TypeError');
  }
  return success;
}

// 7.3.9 GetMethod
export function GetMethod(V, P) {
  Assert(IsPropertyKey(P));
  const func = GetV(V, P);
  if (func.isNull() || func.isUndefined()) {
    return NewValue(undefined);
  }
  if (IsCallable(func) === false) {
    surroundingAgent.Throw('TypeError');
  }
  return func;
}

// 7.3.10 HasProperty
export function HasProperty(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return O.HasProperty(P);
}

// 7.3.11 HasOwnProperty
export function HasOwnProperty(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  const desc = O.GetOwnProperty(P);
  if (desc === undefined) {
    return false;
  }
  return true;
}

// 7.3.12 Call
export function Call(F, V, argumentsList) {
  if (!argumentsList) {
    argumentsList = [];
  }

  if (IsCallable(F) === false) {
    surroundingAgent.Throw('TypeError');
  }

  return F.Call(V, argumentsList);
}

// 7.3.13 Construct
export function Construct(F, argumentsList, newTarget) {
  if (!newTarget) {
    newTarget = F;
  }
  if (!argumentsList) {
    argumentsList = [];
  }
  Assert(IsConstructor(F));
  Assert(IsConstructor(newTarget));
  return F.Construct(argumentsList, newTarget);
}

// 7.3.16 CreateArrayFromList
export function CreateArrayFromList(elements) {
  Assert(elements.every((e) => e instanceof Value));
  const array = ArrayCreate(0);
  let n = 0;
  elements.forEach((e) => {
    const status = CreateDataProperty(array, ToString(n), e);
    Assert(status === true);
    n += 1;
  });
  return array;
}

// 7.3.18 Invoke
export function Invoke(V, P, argumentsList) {
  Assert(IsPropertyKey(P));
  if (!argumentsList) {
    argumentsList = [];
  }
  const func = GetV(V, P);
  return Call(func, V, argumentsList);
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

// 9.1.1.1 OrdinaryGetPrototypeOf
export function OrdinaryGetPrototypeOf(O) {
  return O.Prototype;
}

// 9.1.2.1 OrdinarySetPrototypeOf
export function OrdinarySetPrototypeOf(O, V) {
  Assert(Type(V) === 'Object' || Type(V) === 'Null');

  const extensible = O.Extensible;
  const current = O.Prototype;
  if (SameValue(V, current) === true) {
    return true;
  }
  if (extensible === false) {
    return false;
  }
  let p = V;
  let done = false;
  while (done === false) {
    if (p === null) {
      done = true;
    } else if (SameValue(p, O) === true) {
      return false;
    } else if (p.GetPrototypeOf !== ObjectValue.prototype.GetPrototypeOf) {
      done = true;
    } else {
      p = p.Prototype;
    }
  }
  O.Prototype = V;
  return true;
}

// 9.1.3.1 OrdinaryIsExtensible
export function OrdinaryIsExtensible(O) {
  return O.Extensible;
}

// 9.1.4.1 OrdinaryPreventExtensions
export function OrdinaryPreventExtensions(O) {
  O.Extensible = false;
  return true;
}

// 9.1.5.1 OrdinaryGetOwnProperty
export function OrdinaryGetOwnProperty(O, P) {
  Assert(IsPropertyKey(P));

  if (!O.properties.has(P)) {
    return NewValue(undefined);
  }

  const D = {};

  const X = O.properties.get(P);

  if (IsDataDescriptor(X)) {
    D.Value = X.Value;
    D.Writable = X.Writable;
  } else if (IsAccessorDescriptor(X)) {
    D.Get = X.Get;
    D.Set = X.Set;
  }
  D.Enumerable = X.Enumerable;
  D.Configurable = X.Configurable;

  return D;
}

// 9.1.6.1 OrdinaryDefineOwnProperty
export function OrdinaryDefineOwnProperty(O, P, Desc) {
  const current = O.GetOwnProperty(P);
  const extensible = IsExtensible(O);
  return ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current);
}

// 9.1.6.3 ValidateAndApplyPropertyDescriptor
export function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current) {
  Assert(O.isUndefined() || IsPropertyKey(P));

  if (current.isUndefined()) {
    if (extensible === false) {
      return false;
    }

    Assert(extensible === true);

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (!O.isUndefined()) {
        O.properties.set(P, {
          Value: 'Value' in Desc ? Desc.Value : NewValue(undefined),
          Writable: 'Writable' in Desc ? Desc.Writable : false,
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    } else if (!O.IsUndefined()) {
      O.properties.set(P, {
        Get: 'Get' in Desc ? Desc.Get : NewValue(undefined),
        Set: 'Set' in Desc ? Desc.Set : NewValue(undefined),
        Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
        Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
      });
    }

    return true;
  }

  if (Object.keys(Desc).length === 0) {
    return true;
  }

  if (current.Configurable === false) {
    if (Desc.Configurable === true) {
      return false;
    }

    if ('Enumerable' in Desc && Desc.Enumerable !== current.Enumerable) {
      return false;
    }
  }

  if (IsGenericDescriptor(Desc)) {
    // No further validation is required.
  } else if (IsDataDescriptor(current) !== IsDataDescriptor(Desc)) {
    if (current.Configurable === false) {
      return false;
    }
    if (IsDataDescriptor(current)) {
      if (!O.isUndefined()) {
        const entry = O.properties.get(P);
        delete entry.Value;
        delete entry.Writable;
        entry.Get = NewValue(undefined);
        entry.Set = NewValue(undefined);
      }
    } else if (!O.isUndefined()) {
      const entry = O.properties.get(P);
      delete entry.Get;
      delete entry.Set;
      entry.Value = NewValue(undefined);
      entry.Writable = false;
    }
  } else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) {
    if (current.Configurable === false && current.Writable === false) {
      if ('Writable' in Desc && Desc.Writable === true) {
        return false;
      }
      if ('Value' in Desc && SameValue(Desc.Value, current.Value) === false) {
        return false;
      }
      return true;
    }
  } else if (current.Configurable === false) {
    if ('Set' in Desc && SameValue(Desc.Set, current.Set) === false) {
      return false;
    }
    if ('Get' in Desc && SameValue(Desc.Get, current.Get)) {
      return false;
    }
    return true;
  }

  if (!O.isUndefined()) {
    O.properties.set(P, current);
    Object.keys(Desc).forEach((field) => {
      current[field] = Desc[field];
    });
  }

  return true;
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O, P) {
  Assert(IsPropertyKey(P));

  const hasOwn = O.GetOwnProperty(P);
  if (!hasOwn.isUndefined()) {
    return true;
  }
  const parent = O.GetPrototypeOf();
  if (!parent.isNull()) {
    return parent.HasOwnProperty(P);
  }
  return false;
}

// 9.1.8.1
export function OrdinaryGet(O, P, Receiver) {
  Assert(IsPropertyKey(P));

  const desc = O.GetOwnProperty(P);
  if (desc === undefined) {
    const parent = O.GetPrototypeOf();
    if (parent.isNull()) {
      return NewValue(undefined);
    }
    return parent.Get(P, Receiver);
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (getter.isUndefined()) {
    return NewValue(undefined);
  }
  return Call(getter, Receiver);
}

// 9.1.9.1 OrdinarySet
export function OrdinarySet(O, P, V, Receiver) {
  Assert(IsPropertyKey(P));
  const ownDesc = O.GetOwnProperty(P);
  return OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc);
}

// 9.1.9.2 OrdinarySetWithOwnDescriptor
export function OrdinarySetWithOwnDescriptor(O, P, V, Receiver, ownDesc) {
  Assert(IsPropertyKey(P));

  if (ownDesc.isUndefined()) {
    const parent = O.GetPrototypeOf();
    if (!parent.isNull()) {
      return parent.Set(P, V, Receiver);
    }
    ownDesc = {
      Value: NewValue(undefined),
      Writable: true,
      Enumerable: true,
      Configurable: true,
    };
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable === false) {
      return false;
    }
    if (Type(Receiver) !== 'Object') {
      return false;
    }
    const existingDescriptor = Receiver.GetOwnProperty(P);
    if (!existingDescriptor.isUndefined()) {
      if (IsAccessorDescriptor(existingDescriptor)) {
        return false;
      }
      const valueDesc = { Value: V };
      return Receiver.DefineOwnProperty(P, valueDesc);
    }
  } else {
    return CreateDataProperty(Receiver, P, V);
  }

  Assert(IsAccessorDescriptor(ownDesc));
  const setter = ownDesc.Set;
  if (setter.isUndefined()) {
    return false;
  }
  Call(setter, Receiver, [V]);
  return true;
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O, P) {
  Assert(IsPropertyKey(P));
  const desc = O.GetOwnProperty(P);
  if (desc.isUndefined()) {
    return true;
  }
  if (desc.Configurable === true) {
    O.properties.delete(P);
    return true;
  }
  return false;
}

// 9.1.11.1
export function OrdinaryOwnPropertyKeys(O) {
  const keys = [];

  const integerIndexes = [];
  const strings = [];
  const symbols = [];
  for (const key of O.properties.keys()) {
    const int = Number.parseInt(key, 10);
    if (int > 0 && int < (2 ** 53) - 1) {
      integerIndexes.push(key);
    } else if (Type(key) === 'String') {
      strings.push(key);
    } else if (Type(key) === 'Symbol') {
      symbols.push(key);
    }
  }

  integerIndexes.forEach((P) => {
    keys.push(P);
  });

  strings.forEach((P) => {
    keys.push(P);
  });

  symbols.forEach((P) => {
    keys.push(P);
  });

  return keys;
}

// 9.1.12 ObjectCreate
export function ObjectCreate(proto, internalSlotsList) {
  if (!internalSlotsList) {
    internalSlotsList = [];
  }

  const obj = new ObjectValue(surroundingAgent.currentRealmRecord || proto.realm);

  // Set obj's essential internal methods to the default ordinary
  // object definitions specified in 9.1.
  // Happens in ObjectValue constructor

  obj.Prototype = proto;
  obj.Extensible = true;

  return obj;
}

// 9.1.13 OrdinaryCreateFromConstructor
export function OrdinaryCreateFromConstructor(
  constructor, intrinsicDefaultProto, internalSlotsList,
) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  const proto = GetPrototypeFromConstructor(constructor, intrinsicDefaultProto);
  return ObjectCreate(proto, internalSlotsList);
}

// 9.1.14 GetPrototypeFromConstructor
export function GetPrototypeFromConstructor(constructor, intrinsicDefaultProto) {
  // Assert: intrinsicDefaultProto is a String value that
  // is this specification's name of an intrinsic object.
  Assert(IsCallable(constructor));
  let proto = Get(constructor, 'prototype');
  if (Type(proto) !== 'Object') {
    const realm = GetFunctionRealm(constructor);
    proto = realm.Intrinsics[intrinsicDefaultProto];
  }
  return proto;
}

// 9.3.3 CreateBuiltinFunction
export function CreateBuiltinFunction(steps, internalSlotsList, realm, prototype) {
  if (!realm) {
    // If realm is not present, set realm to the current Realm Record.
    realm = surroundingAgent.currentRealmRecord;
  }

  if (!prototype) {
    prototype = realm.Intrinsics['%FunctionPrototype%'];
  }

  // Let func be a new built-in function object that when
  // called performs the action described by steps.
  const func = NewValue(steps, realm);

  internalSlotsList.forEach((slot) => {
    func[slot] = undefined;
  });

  func.Realm = realm;
  func.Prototype = prototype;
  func.Extensible = true;
  func.ScriptOrModule = null;

  return func;
}

// 9.4.2.4 ArraySetLength
export function ArraySetLength(A, Desc) {
  if ('Value' in Desc === false) {
    return OrdinaryDefineOwnProperty(A, 'length', Desc);
  }
  const newLenDesc = { ...Desc };
  const newLen = ToUint32(Desc.Value);
  const numberLen = ToNumber(Desc.Value);
  if (newLen.value !== numberLen.value) {
    surroundingAgent.Throw('RangeError');
  }
  newLenDesc.Value = newLen;
  const oldLenDesc = OrdinaryGetOwnProperty(A, 'length');
  Assert(!oldLenDesc.isUndefined() && !IsAccessorDescriptor(oldLenDesc));
  let oldLen = oldLenDesc.Value;
  if (newLen.value > oldLen.value) {
    return OrdinaryDefineOwnProperty(A, 'length', newLenDesc);
  }
  if (oldLenDesc.Writable === false) {
    return false;
  }
  let newWritable;
  if (!('Writable' in newLenDesc) || newLenDesc.Writable === true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc.Writable = true;
  }
  const succeeded = OrdinaryDefineOwnProperty(A, 'length', newLenDesc);
  if (succeeded === false) {
    return false;
  }
  while (newLen < oldLen) {
    oldLen -= 1;
    const deleteSucceeded = A.Delete(ToString(oldLen));
    if (deleteSucceeded === false) {
      newLenDesc.Value = oldLen + 1;
      if (newWritable === false) {
        newLenDesc.Writable = false;
      }
      OrdinaryDefineOwnProperty(A, 'length', newLenDesc);
      return false;
    }
  }
  if (newWritable === false) {
    return OrdinaryDefineOwnProperty(A, 'length', {
      Writable: false,
    });
  }
  return true;
}

// 13.2.7 Static Semantics: TopLevelLexicallyDeclaredNames
export function TopLevelLexicallyDeclaredNames() {
  return [];
}

// 13.2.9 Static Semantics TopLevelVarDeclaredNames
export function TopLevelVarDeclaredNames() {
  return [];
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
  return TopLevelVarDeclaredNames(ScriptBody.body);
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

export function ToBoolean(argument) {
  if (argument instanceof UndefinedValue) {
    return false;
  }

  if (argument instanceof NullValue) {
    return false;
  }

  if (argument instanceof BooleanValue) {
    return argument;
  }

  if (argument instanceof NumberValue) {
    if (argument.value === 0 || argument.isNaN()) {
      return false;
    }
    return true;
  }

  if (argument instanceof StringValue) {
    if (argument.value.length > 0) {
      return true;
    }
    return false;
  }

  if (argument instanceof SymbolValue) {
    return true;
  }

  if (argument instanceof ObjectValue) {
    return true;
  }
}
