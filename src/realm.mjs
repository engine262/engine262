import {
  New as NewValue,
  Type,
} from './value.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  DefinePropertyOrThrow,
  ObjectCreate,
} from './abstract-ops/all.mjs';
import {
  NewGlobalEnvironment,
} from './environment.mjs';
import {
  surroundingAgent,
} from './engine.mjs';
import { Q, X } from './completion.mjs';

import { CreateObjectPrototype } from './intrinsics/ObjectPrototype.mjs';
import { CreateObject } from './intrinsics/Object.mjs';
import { CreateArrayPrototype } from './intrinsics/ArrayPrototype.mjs';
import { CreateArray } from './intrinsics/Array.mjs';
import { CreateBooleanPrototype } from './intrinsics/BooleanPrototype.mjs';
import { CreateBoolean } from './intrinsics/Boolean.mjs';
import { CreateNumberPrototype } from './intrinsics/NumberPrototype.mjs';
import { CreateNumber } from './intrinsics/Number.mjs';
import { CreateFunctionPrototype } from './intrinsics/FunctionPrototype.mjs';
import { CreateSymbolPrototype } from './intrinsics/SymbolPrototype.mjs';
import { CreateSymbol } from './intrinsics/Symbol.mjs';
import { CreateMath } from './intrinsics/Math.mjs';
import { CreatePromisePrototype } from './intrinsics/PromisePrototype.mjs';
import { CreatePromise } from './intrinsics/Promise.mjs';
import { CreateProxy } from './intrinsics/Proxy.mjs';
import { CreateStringPrototype } from './intrinsics/StringPrototype.mjs';
import { CreateString } from './intrinsics/String.mjs';
import { CreateErrorPrototype } from './intrinsics/ErrorPrototype.mjs';
import { CreateError } from './intrinsics/Error.mjs';
import { CreateNativeError } from './intrinsics/NativeError.mjs';
import { CreateIteratorPrototype } from './intrinsics/IteratorPrototype.mjs';
import { CreateAsyncIteratorPrototype } from './intrinsics/AsyncIteratorPrototype.mjs';
import { CreateArrayIteratorPrototype } from './intrinsics/ArrayIteratorPrototype.mjs';

// https://tc39.github.io/ecma262/#sec-code-realms
// 8.2 Realms
export class Realm {
  constructor() {
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnv = undefined;
    this.TemplateMap = undefined;
    this.HostDefined = undefined;
  }
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

function AddRestrictedFunctionProperties(F, realm) {
  Assert(realm.Intrinsics['%ThrowTypeError%']);
  const thrower = realm.Intrinsics['%ThrowTypeError'];
  X(DefinePropertyOrThrow(F, NewValue('caller'), {
    Get: thrower,
    Set: thrower,
    Enumerable: false,
    Configurable: true,
  }));
  X(DefinePropertyOrThrow(F, NewValue('arguments'), {
    Get: thrower,
    Set: thrower,
    Enumerable: false,
    Configurable: true,
  }));
}

// 8.2.2 CreateIntrinsics
export function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  const objProto = ObjectCreate(NewValue(null));
  intrinsics['%ObjectPrototype%'] = objProto;

  const thrower = CreateBuiltinFunction(
    () => surroundingAgent.Throw('TypeError', 'The caller, callee, and arguments properties may'
      + ' not be accessed on strict mode functions or the arguments objects for calls to them'),
    [], realmRec, NewValue(null),
  );
  intrinsics['%ThrowTypeError%'] = thrower;

  const funcProto = CreateBuiltinFunction(() => {}, [], realmRec, objProto);
  intrinsics['%FunctionPrototype%'] = funcProto;

  thrower.SetPrototypeOf(funcProto);

  AddRestrictedFunctionProperties(funcProto, realmRec);

  CreateErrorPrototype(realmRec);
  CreateError(realmRec);
  CreateNativeError(realmRec);

  CreateObjectPrototype(realmRec);
  CreateObject(realmRec);

  CreateFunctionPrototype(realmRec);

  CreateIteratorPrototype(realmRec);
  CreateAsyncIteratorPrototype(realmRec);

  CreateArrayIteratorPrototype(realmRec);

  CreateStringPrototype(realmRec);
  CreateString(realmRec);

  CreateArrayPrototype(realmRec);
  CreateArray(realmRec);

  CreateBooleanPrototype(realmRec);
  CreateBoolean(realmRec);

  CreateNumberPrototype(realmRec);
  CreateNumber(realmRec);

  CreateSymbolPrototype(realmRec);
  CreateSymbol(realmRec);

  CreatePromisePrototype(realmRec);
  CreatePromise(realmRec);

  CreateProxy(realmRec);

  CreateMath(realmRec);

  return intrinsics;
}

// 8.2.3 SetRealmGlobalObject
export function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  if (Type(globalObj) === 'Undefined') {
    const intrinsics = realmRec.Intrinsics;
    globalObj = ObjectCreate(intrinsics['%ObjectPrototype%']);
  }

  if (Type(thisValue) === 'Undefined') {
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

  // Value Properties of the Global Object
  [
    ['Infinity', NewValue(Infinity, realmRec)],
    ['NaN', NewValue(NaN, realmRec)],
    ['undefined', NewValue(undefined, realmRec)],
  ].forEach(([name, value]) => {
    Q(DefinePropertyOrThrow(global, NewValue(name, realmRec), {
      Value: value,
      Writable: false,
      Enumerable: false,
      Configurable: false,
    }));
  });

  // Function Properties of the Global Object
  [
    ['eval'],
    ['isFinite'],
    ['isNaN'],
    ['parseFloat'],
    ['parseInt'],
    ['decodeURI'],
    ['decodeURIComponent'],
    ['encodeURI'],
    ['encodeURIComponent'],
  ].forEach(([name, value]) => {
    Q(DefinePropertyOrThrow(global, NewValue(name, realmRec), {
      Value: value,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    }));
  });

  [
    // Constructor Properties of the Global Object
    'Array',
    'Boolean',
    'Function',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'String',
    'Symbol',
    'Error',
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
    // Other Properties of the Global Object
    'Math',
  ].forEach((name) => {
    Q(DefinePropertyOrThrow(global, NewValue(name, realmRec), {
      Value: realmRec.Intrinsics[`%${name}%`],
      Writable: true,
      Enumerable: false,
      Configurable: true,
    }));
  });

  return global;
}
