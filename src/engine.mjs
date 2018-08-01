/* eslint-disable no-use-before-define */
/* eslint-disable import/no-cycle */

import {
  UndefinedValue,
  NullValue,
  BooleanValue,
  StringValue,
  NumberValue,
  SymbolValue,
  ObjectValue,
  New as NewValue,
} from './value.mjs';

import { ParseScript, ParseModule } from './parse.mjs';

import { AbruptCompletion, NormalCompletion } from './completions.mjs';
import {
  LexicalEnvironment,
  EnvironmentRecord,
  DeclarativeEnvironmentRecord,
  ObjectEnvironmentRecord,
  GlobalEnvironmentRecord,
} from './environment.mjs';

import { CreateArray } from './intrinsics/Array.mjs';
import { CreateBooleanPrototype } from './intrinsics/BooleanPrototype.mjs';
import { CreateBoolean } from './intrinsics/Boolean.mjs';

export const executionContextStack = [];
export function runningExecutionContext() {
  return executionContextStack[executionContextStack.length - 1];
}
export function currentRealmRecord() {
  const currentCtx = runningExecutionContext();
  if (currentCtx !== undefined) {
    return currentCtx.Realm;
  }
  return undefined;
}
export function activeFunctionObject() {
  return runningExecutionContext().Function;
}

const jobQueues = new Map([
  ['ScriptJobs', []],
]);

function pickQueue() {
  for (const queue of jobQueues.values()) {
    if (queue.length > 0) {
      return queue;
    }
  }
  return undefined;
}

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
    return NewValue(envRec.Realm, body.firstChild.value);
  }
}

export function Assert(invarient) {
  if (!invarient) {
    throw new TypeError('Assert failed');
  }
}

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
      P = P.value;
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
    if (isNaN(x.value) && isNaN(y.value)) {
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

// 7.3.1 Get
export function Get(O, P) {
  Assert(Type(O) === 'Object');
  Assert(IsPropertyKey(P));
  return O.Get(P, O);
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
    F.realm.exception.TypeError();
  }

  return F.Call(V, argumentsList);
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

  if (IsProxyExoticObject(obj)) {
    if (obj.ProxyHandler.value === null) {
      obj.realm.exception.TypeError();
      const proxyTarget = obj.ProxyTarget;
      return GetFunctionRealm(proxyTarget);
    }
  }
  */

  return currentRealmRecord();
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

  const objProto = ObjectCreate(NewValue(realmRec, null));
  intrinsics['%ObjectPrototype%'] = objProto;

  const thrower = CreateBuiltinFunction(() => {
    realmRec.exception.TypeError();
  }, [], realmRec, NewValue(realmRec, null));
  intrinsics['%ThrowTypeError%'] = thrower;

  const funcProto = CreateBuiltinFunction(() => {}, [], realmRec, objProto);
  intrinsics['%FunctionPrototype%'] = funcProto;

  thrower.SetPrototypeOf(funcProto);

  intrinsics['%Array%'] = CreateArray(realmRec);

  intrinsics['%BooleanPrototype%'] = CreateBooleanPrototype(realmRec);
  intrinsics['%Boolean%'] = CreateBoolean(realmRec);

  return intrinsics;
}

// 8.2.3 SetRealmGlobalObject
function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  if (globalObj === undefined) {
    const intrinsics = realmRec.Intrinsics;
    globalObj = ObjectCreate(intrinsics.ObjectPrototype);
  }

  if (thisValue === undefined) {
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
  const callerContext = runningExecutionContext();
  const callerRealm = callerContext.Realm;
  const callerScriptOrModule = callerContext.ScriptOrModule;
  const pending = {
    Job: job,
    Arguments: args,
    Realm: callerRealm,
    ScriptOrModule: callerScriptOrModule,
    HostDefined: undefined,
  };

  jobQueues.get(queueName).push(pending);
}

// 8.6 InitializeHostDefinedRealm
export function InitializeHostDefinedRealm() {
  const realm = CreateRealm();
  const newContext = new ExecutionContext();
  newContext.Function = null;
  newContext.Realm = realm;
  executionContextStack.push(newContext);
  const global = undefined;
  const thisValue = undefined;
  SetRealmGlobalObject(realm, global, thisValue);
  const globalObj = SetDefaultGlobalBindings(realm);
  // Create any implementation-defined global object properties on globalObj.
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

  while (true) {
    executionContextStack.pop();
    const nextQueue = pickQueue();
    // host specific behaviour
    if (!nextQueue) {
      break;
    }
    const nextPending = nextQueue.shift();
    const newContext = new ExecutionContext();
    newContext.Function = null;
    newContext.Realm = nextPending.Realm;
    newContext.ScriptOrModule = nextPending.ScriptOrModule;
    executionContextStack.push(newContext);
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
    } else {
      if (p.GetPrototypeOf !== ObjectValue.prototype.GetPrototypeOf) {
        done = true;
      } else {
        p = p.Prototype;
      }
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
    return NewValue(O.realm, undefined);
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
  Assert(O === undefined || IsPropertyKey(P));

  if (current === undefined) {
    if (extensible === false) {
      return false;
    }

    Assert(extensible);

    if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
      if (O !== undefined) {
        O.properties.set(P, {
          Value: 'Value' in Desc ? Desc.Value : NewValue(O.realm, undefined),
          Writable: 'Writable' in Desc ? Desc.Writable : false,
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
    } else {
      if (O !== undefined) {
        O.properties.set(P, {
          Get: 'Get' in Desc ? Desc.Get : NewValue(O.realm, undefined),
          Set: 'Set' in Desc ? Desc.Set : NewValue(O.realm, undefined),
          Enumerable: 'Enumerable' in Desc ? Desc.Enumerable : false,
          Configurable: 'Configurable' in Desc ? Desc.Configurable : false,
        });
      }
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
      if (O !== undefined) {
        const entry = O.properties.get(P);
        delete entry.Value;
        delete entry.Writable;
        entry.Get = NewValue(O.realm, undefined);
        entry.Set = NewValue(O.realm, undefined);
      }
    } else {
      if (O !== undefined) {
        const entry = O.properties.get(P);
        delete entry.Get;
        delete entry.Set;
        entry.Value = NewValue(O.realm, undefined);
        entry.Writable = false;
      }
    }
  } else if (IsDataDescriptor(current) && IsDataDescriptor(Desc)) {
    if (current.Configurable === false && current.Writable === false) {
      if (Desc.Writable !== undefined && Desc.Writable === true) {
        return false;
      }
      if (Desc.Value !== undefined && SameValue(Desc.Value, current.Value) === false) {
        return false;
      }
      return true;
    }
  } else {
    if (current.Configurable === false) {
      if (Desc.Set !== undefined && SameValue(Desc.Set, current.Set) === false) {
        return false;
      }
      if (Desc.Get !== undefined && SameValue(Desc.Get, current.Get)) {
        return false;
      }
      return true;
    }
  }

  if (O !== undefined) {
    O.properties.set(P, current);
    for (const field in Desc) {
      current[field] = Desc[field];
    }
  }

  return true;
}

// 9.1.7.1 OrdinaryHasProperty
export function OrdinaryHasProperty(O, P) {
  Assert(IsPropertyKey(P));

  const hasOwn = O.GetOwnProperty(P);
  if (hasOwn !== undefined) {
    return true;
  }
  const parent = O.GetPrototypeOf();
  if (parent.value !== null) {
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
    if (parent === null) {
      return NewValue(O.realm, undefined);
    }
    return parent.Get(P, Receiver);
  }
  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }
  Assert(IsAccessorDescriptor(desc));
  const getter = desc.Get;
  if (getter === undefined) {
    return NewValue(O.realm, undefined);
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

  if (ownDesc === undefined) {
    const parent = O.GetPrototypeOf();
    if (parent.value !== null) {
      return parent.Set(P, V, Receiver);
    } else {
      ownDesc = {
        Value: NewValue(O.realm, undefined),
        Writable: true,
        Enumerable: true,
        Configurable: true,
      };
    }
  }

  if (IsDataDescriptor(ownDesc)) {
    if (ownDesc.Writable === false) {
      return false;
    }
    if (Type(Receiver) !== 'Object') {
      return false;
    }
    const existingDescriptor = Receiver.GetOwnProperty(P);
    if (existingDescriptor !== undefined) {
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
  if (setter === undefined) {
    return false;
  }
  Call(setter, Receiver, [V]);
  return true;
}

// 9.1.10.1 OrdinaryDelete
export function OrdinaryDelete(O, P) {
  Assert(IsPropertyKey(P));
  const desc = O.GetOwnProperty(P);
  if (desc === undefined) {
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

  const obj = new ObjectValue(currentRealmRecord() || proto.realm);

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
    realm = currentRealmRecord();
  }

  if (!prototype) {
    prototype = realm.Intrinsics['%FunctionPrototype%'];
  }

  // Let func be a new built-in function object that when
  // called performs the action described by steps.
  const func = NewValue(realm, steps);

  internalSlotsList.forEach((slot) => {
    func[slot] = undefined;
  });

  func.Realm = realm;
  func.Prototype = prototype;
  func.Extensible = true;
  func.ScriptOrModule = null;

  return func;
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
export function LexicallyScopedDeclarations(ScriptBody) {
  return [];
}

// 15.1.5 VarDeclaredNames
export function VarDeclaredNames(ScriptBody) {
  // Return TopLevelVarDeclaredNames of StatementList.
  return TopLevelVarDeclaredNames(ScriptBody.body);
}

// 15.1.6 VarScopedDeclarations
export function VarScopedDeclarations(ScriptBody) {
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
  // Suspend the currently running execution context.
  executionContextStack.push(scriptCtx);
  const scriptBody = scriptRecord.ECMAScriptCode;
  let result = GlobalDeclarationInstantiation(scriptBody, globalEnv);
  if (result.Type === 'normal') {
    result = Evaluate(scriptBody, globalEnv);
  }

  if (result.Type === 'normal' && result.Value === undefined) {
    result = new NormalCompletion(NewValue(scriptRecord.Realm, undefined));
  }
  // Suspend scriptCtx
  executionContextStack.pop();
  // Resume the context that is now on the top of the
  // execution context stack as the running execution context.

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
      envRec.Realm.exception.SyntaxError();
    }
    if (envRec.HasLexicalDeclaration(name)) {
      envRec.Realm.exception.SyntaxError();
    }
    const hasRestrictedGlobal = envRec.HasRestrictedGlobalProperty(name);
    if (hasRestrictedGlobal) {
      envRec.Realm.exception.SyntaxError();
    }
  });

  varNames.forEach((name) => {
    if (envRec.HasLexicalDeclaration(name)) {
      envRec.Realm.execption.SyntaxError();
    }
  });

  const varDeclarations = VarScopedDeclarations(script);

  const functionsToInitialize = [];
  const declaredFunctionNames = [];

  varDeclarations.reverse().forEach((d) => {
    // stuff
  });

  const declaredVarNames = [];

  varDeclarations.forEach((d) => {
    // stuff
  });

  const strict = script.IsStrict;
  if (strict === false) {
    // annex b
  }

  const lexDeclarations = LexicallyScopedDeclarations(script);
  lexDeclarations.forEach((d) => {
    // stuff
  });

  functionsToInitialize.forEach((f) => {
    // stuff
  });

  declaredVarNames.forEach((vn) => {
    envRec.CreateGlobalVarBinding(vn, false);
  });

  return new NormalCompletion();
}

// 15.1.12 ScriptEvaluationJob
export function ScriptEvaluationJob(sourceText, hostDefined) {
  const realm = currentRealmRecord();
  const s = ParseScript(sourceText, realm, hostDefined);
  return ScriptEvaluation(s);
}

// 15.2.1.19
export function TopLevelModuleEvaluationJob(sourceText, hostDefined) {
  const realm = currentRealmRecord();
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

// 24.4.1.0 WakeWaiter
export function WakeWaiter(WL, W) {
  W.Wake();
}

// 24.4.1.9 Suspend
export function Suspend(WL, W, timeout) {
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
