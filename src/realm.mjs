import {
  UndefinedValue,
  ObjectValue,
  New as NewValue,
} from './value';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  DefinePropertyOrThrow,
} from './abstract-ops/all';
import {
  NewGlobalEnvironment,
} from './environment';
import {
  surroundingAgent,
} from './engine';
import { Q } from './completion';

import { CreateObjectPrototype } from './intrinsics/ObjectPrototype';
import { CreateObject } from './intrinsics/Object';
import { CreateArrayPrototype } from './intrinsics/ArrayPrototype';
import { CreateArray } from './intrinsics/Array';
import { CreateBooleanPrototype } from './intrinsics/BooleanPrototype';
import { CreateBoolean } from './intrinsics/Boolean';
import { CreateNumberPrototype } from './intrinsics/NumberPrototype';
import { CreateNumber } from './intrinsics/Number';
import { CreateFunctionPrototype } from './intrinsics/FunctionPrototype';
import { CreateSymbolPrototype } from './intrinsics/SymbolPrototype';
import { CreateSymbol } from './intrinsics/Symbol';
import { CreateMath } from './intrinsics/Math';
import { CreatePromisePrototype } from './intrinsics/PromisePrototype';
import { CreatePromise } from './intrinsics/Promise';
import { CreateStringPrototype } from './intrinsics/StringPrototype';
import { CreateString } from './intrinsics/String';
import { CreateError } from './intrinsics/Error';

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

// 8.2.2 CreateIntrinsics
export function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  // Use ObjectValue() constructor instead of ObjectCreate as we don't have a
  // current Realm record yet.
  const objProto = new ObjectValue(realmRec, NewValue(null));
  intrinsics['%ObjectPrototype%'] = objProto;

  const thrower = CreateBuiltinFunction(() => surroundingAgent.Throw('TypeError'), [], realmRec, NewValue(null));
  intrinsics['%ThrowTypeError%'] = thrower;

  const funcProto = CreateBuiltinFunction(() => {}, [], realmRec, objProto);
  intrinsics['%FunctionPrototype%'] = funcProto;

  thrower.SetPrototypeOf(funcProto);

  CreateError(realmRec);

  CreateObjectPrototype(realmRec);
  CreateObject(realmRec);

  CreateFunctionPrototype(realmRec);

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

  CreateMath(realmRec);

  return intrinsics;
}

// 8.2.3 SetRealmGlobalObject
export function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  if (globalObj instanceof UndefinedValue) {
    const intrinsics = realmRec.Intrinsics;
    globalObj = ObjectCreate(intrinsics.ObjectPrototype);
  }

  if (thisValue instanceof UndefinedValue) {
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
    'String',
    'Symbol',
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
