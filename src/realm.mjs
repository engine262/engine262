import {
  Value,
  Type,
  Descriptor,
} from './value.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  DefinePropertyOrThrow,
  ObjectCreate,
  SetFunctionLength,
} from './abstract-ops/all.mjs';
import { NewGlobalEnvironment } from './environment.mjs';
import { surroundingAgent } from './engine.mjs';
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
import { CreateFunction } from './intrinsics/Function.mjs';
import { CreateSymbolPrototype } from './intrinsics/SymbolPrototype.mjs';
import { CreateSymbol } from './intrinsics/Symbol.mjs';
import { CreateMath } from './intrinsics/Math.mjs';
import { CreatePromisePrototype } from './intrinsics/PromisePrototype.mjs';
import { CreatePromise } from './intrinsics/Promise.mjs';
import { CreateProxy } from './intrinsics/Proxy.mjs';
import { CreateReflect } from './intrinsics/Reflect.mjs';
import { CreateStringPrototype } from './intrinsics/StringPrototype.mjs';
import { CreateString } from './intrinsics/String.mjs';
import { CreateErrorPrototype } from './intrinsics/ErrorPrototype.mjs';
import { CreateError } from './intrinsics/Error.mjs';
import { CreateNativeError } from './intrinsics/NativeError.mjs';
import { CreateIteratorPrototype } from './intrinsics/IteratorPrototype.mjs';
import { CreateAsyncIteratorPrototype } from './intrinsics/AsyncIteratorPrototype.mjs';
import { CreateArrayIteratorPrototype } from './intrinsics/ArrayIteratorPrototype.mjs';
import { CreateMapIteratorPrototype } from './intrinsics/MapIteratorPrototype.mjs';
import { CreateSetIteratorPrototype } from './intrinsics/SetIteratorPrototype.mjs';
import { CreateMapPrototype } from './intrinsics/MapPrototype.mjs';
import { CreateMap } from './intrinsics/Map.mjs';
import { CreateSetPrototype } from './intrinsics/SetPrototype.mjs';
import { CreateSet } from './intrinsics/Set.mjs';
import { CreateFunctionProperties } from './intrinsics/functionProperties.mjs';
import { CreateGenerator } from './intrinsics/Generator.mjs';
import { CreateGeneratorFunction } from './intrinsics/GeneratorFunction.mjs';
import { CreateGeneratorPrototype } from './intrinsics/GeneratorPrototype.mjs';
import { CreateAsyncFunctionPrototype } from './intrinsics/AsyncFunctionPrototype.mjs';
import { CreateAsyncFunction } from './intrinsics/AsyncFunction.mjs';
import { CreateArrayBuffer } from './intrinsics/ArrayBuffer.mjs';
import { CreateArrayBufferPrototype } from './intrinsics/ArrayBufferPrototype.mjs';
import { CreateJSON } from './intrinsics/JSON.mjs';
import { CreateEval } from './intrinsics/eval.mjs';

// 8.2 #sec-code-realms
export class Realm {
  constructor() {
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnv = undefined;
    this.TemplateMap = undefined;
    this.HostDefined = undefined;
  }
}

// 8.2.1 #sec-createrealm
export function CreateRealm() {
  const realmRec = new Realm();
  CreateIntrinsics(realmRec);
  realmRec.GlobalObject = Value.undefined;
  realmRec.GlobalEnv = Value.undefined;
  realmRec.TemplateMap = [];
  return realmRec;
}

function AddRestrictedFunctionProperties(F, realm) {
  Assert(realm.Intrinsics['%ThrowTypeError%']);
  const thrower = realm.Intrinsics['%ThrowTypeError%'];
  X(DefinePropertyOrThrow(F, new Value('caller'), Descriptor({
    Get: thrower,
    Set: thrower,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(F, new Value('arguments'), Descriptor({
    Get: thrower,
    Set: thrower,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

// 8.2.2 #sec-createintrinsics
export function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  const objProto = ObjectCreate(Value.null);
  intrinsics['%ObjectPrototype%'] = objProto;

  const thrower = CreateBuiltinFunction(
    () => surroundingAgent.Throw('TypeError', 'The caller, callee, and arguments properties may'
      + ' not be accessed on strict mode functions or the arguments objects for calls to them'),
    [], realmRec, Value.null,
  );
  intrinsics['%ThrowTypeError%'] = thrower;

  const funcProto = CreateBuiltinFunction(() => {}, [], realmRec, objProto);
  SetFunctionLength(funcProto, new Value(0));
  intrinsics['%FunctionPrototype%'] = funcProto;

  thrower.SetPrototypeOf(funcProto);

  AddRestrictedFunctionProperties(funcProto, realmRec);

  CreateErrorPrototype(realmRec);
  CreateError(realmRec);
  CreateNativeError(realmRec);

  CreateObjectPrototype(realmRec);
  CreateObject(realmRec);

  CreateFunction(realmRec);
  CreateFunctionPrototype(realmRec);

  CreateIteratorPrototype(realmRec);
  CreateAsyncIteratorPrototype(realmRec);
  CreateArrayIteratorPrototype(realmRec);
  CreateMapIteratorPrototype(realmRec);
  CreateSetIteratorPrototype(realmRec);

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

  CreateReflect(realmRec);

  CreateMath(realmRec);

  CreateSetPrototype(realmRec);
  CreateSet(realmRec);

  CreateMapPrototype(realmRec);
  CreateMap(realmRec);

  CreateFunctionProperties(realmRec);

  CreateGeneratorPrototype(realmRec);
  CreateGenerator(realmRec);
  CreateGeneratorFunction(realmRec);

  CreateAsyncFunctionPrototype(realmRec);
  CreateAsyncFunction(realmRec);

  CreateArrayBufferPrototype(realmRec);
  CreateArrayBuffer(realmRec);

  CreateJSON(realmRec);

  CreateEval(realmRec);

  return intrinsics;
}

// 8.2.3 #sec-setrealmglobalobject
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

// 8.2.4 #sec-setdefaultglobalbindings
export function SetDefaultGlobalBindings(realmRec) {
  const global = realmRec.GlobalObject;

  // Value Properties of the Global Object
  [
    ['Infinity', new Value(Infinity)],
    ['NaN', new Value(NaN)],
    ['undefined', Value.undefined],
  ].forEach(([name, value]) => {
    Q(DefinePropertyOrThrow(global, new Value(name), Descriptor({
      Value: value,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  });

  [
    // Function Properties of the Global Object
    'eval',
    'isFinite',
    'isNaN',
    'parseFloat',
    'parseInt',
    'decodeURI',
    'decodeURIComponent',
    'encodeURI',
    'encodeURIComponent',

    // Constructor Properties of the Global Object
    'Array',
    'ArrayBuffer',
    'Boolean',
    // 'DataView',
    // 'Date',
    'Error',
    'EvalError',
    // 'Float32Array',
    // 'Float64Array',
    'Function',
    // 'Int8Array',
    // 'Int16Array',
    // 'Int32Array',
    'Map',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'RangeError',
    'ReferenceError',
    // 'RegExp',
    'Set',
    // 'SharedArrayBuffer',
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    // 'Uint8Array',
    // 'Uint8ClampedArray',
    // 'Uint16Array',
    // 'Uint32Array',
    'URIError',
    // 'WeakMap',
    // 'WeakSet',

    // Other Properties of the Global Object
    // 'Atomics',
    'JSON',
    'Math',
    'Reflect',
  ].forEach((name) => {
    Q(DefinePropertyOrThrow(global, new Value(name), Descriptor({
      Value: realmRec.Intrinsics[`%${name}%`],
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  });

  return global;
}
