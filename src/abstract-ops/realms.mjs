import {
  Descriptor,
  Value,
} from '../value.mjs';
import { NewGlobalEnvironment } from '../environment.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapObjectPrototype } from '../intrinsics/ObjectPrototype.mjs';
import { BootstrapObject } from '../intrinsics/Object.mjs';
import { BootstrapArrayPrototype } from '../intrinsics/ArrayPrototype.mjs';
import { BootstrapArray } from '../intrinsics/Array.mjs';
import { BootstrapBigInt } from '../intrinsics/BigInt.mjs';
import { BootstrapBigIntPrototype } from '../intrinsics/BigIntPrototype.mjs';
import { BootstrapBooleanPrototype } from '../intrinsics/BooleanPrototype.mjs';
import { BootstrapBoolean } from '../intrinsics/Boolean.mjs';
import { BootstrapNumberPrototype } from '../intrinsics/NumberPrototype.mjs';
import { BootstrapNumber } from '../intrinsics/Number.mjs';
import { BootstrapFunctionPrototype } from '../intrinsics/FunctionPrototype.mjs';
import { BootstrapFunction } from '../intrinsics/Function.mjs';
import { BootstrapSymbolPrototype } from '../intrinsics/SymbolPrototype.mjs';
import { BootstrapSymbol } from '../intrinsics/Symbol.mjs';
import { BootstrapMath } from '../intrinsics/Math.mjs';
import { BootstrapDatePrototype } from '../intrinsics/DatePrototype.mjs';
import { BootstrapDate } from '../intrinsics/Date.mjs';
import { BootstrapRegExpPrototype } from '../intrinsics/RegExpPrototype.mjs';
import { BootstrapRegExp } from '../intrinsics/RegExp.mjs';
import { BootstrapPromisePrototype } from '../intrinsics/PromisePrototype.mjs';
import { BootstrapPromise } from '../intrinsics/Promise.mjs';
import { BootstrapProxy } from '../intrinsics/Proxy.mjs';
import { BootstrapReflect } from '../intrinsics/Reflect.mjs';
import { BootstrapStringPrototype } from '../intrinsics/StringPrototype.mjs';
import { BootstrapString } from '../intrinsics/String.mjs';
import { BootstrapErrorPrototype } from '../intrinsics/ErrorPrototype.mjs';
import { BootstrapError } from '../intrinsics/Error.mjs';
import { BootstrapNativeError } from '../intrinsics/NativeError.mjs';
import { BootstrapIteratorPrototype } from '../intrinsics/IteratorPrototype.mjs';
import { BootstrapAsyncIteratorPrototype } from '../intrinsics/AsyncIteratorPrototype.mjs';
import { BootstrapArrayIteratorPrototype } from '../intrinsics/ArrayIteratorPrototype.mjs';
import { BootstrapMapIteratorPrototype } from '../intrinsics/MapIteratorPrototype.mjs';
import { BootstrapSetIteratorPrototype } from '../intrinsics/SetIteratorPrototype.mjs';
import { BootstrapStringIteratorPrototype } from '../intrinsics/StringIteratorPrototype.mjs';
import { BootstrapRegExpStringIteratorPrototype } from '../intrinsics/RegExpStringIteratorPrototype.mjs';
import { BootstrapForInIteratorPrototype } from '../intrinsics/ForInIteratorPrototype.mjs';
import { BootstrapMapPrototype } from '../intrinsics/MapPrototype.mjs';
import { BootstrapMap } from '../intrinsics/Map.mjs';
import { BootstrapSetPrototype } from '../intrinsics/SetPrototype.mjs';
import { BootstrapSet } from '../intrinsics/Set.mjs';
import { BootstrapGeneratorFunctionPrototypePrototype } from '../intrinsics/GeneratorFunctionPrototypePrototype.mjs';
import { BootstrapGeneratorFunctionPrototype } from '../intrinsics/GeneratorFunctionPrototype.mjs';
import { BootstrapGeneratorFunction } from '../intrinsics/GeneratorFunction.mjs';
import { BootstrapAsyncFunctionPrototype } from '../intrinsics/AsyncFunctionPrototype.mjs';
import { BootstrapAsyncFunction } from '../intrinsics/AsyncFunction.mjs';
import { BootstrapAsyncGeneratorFunctionPrototypePrototype } from '../intrinsics/AsyncGeneratorFunctionPrototypePrototype.mjs';
import { BootstrapAsyncGeneratorFunctionPrototype } from '../intrinsics/AsyncGeneratorFunctionPrototype.mjs';
import { BootstrapAsyncGeneratorFunction } from '../intrinsics/AsyncGeneratorFunction.mjs';
import { BootstrapAsyncFromSyncIteratorPrototype } from '../intrinsics/AsyncFromSyncIteratorPrototype.mjs';
import { BootstrapArrayBuffer } from '../intrinsics/ArrayBuffer.mjs';
import { BootstrapArrayBufferPrototype } from '../intrinsics/ArrayBufferPrototype.mjs';
import { BootstrapJSON } from '../intrinsics/JSON.mjs';
import { BootstrapEval } from '../intrinsics/eval.mjs';
import { BootstrapIsFinite } from '../intrinsics/isFinite.mjs';
import { BootstrapIsNaN } from '../intrinsics/isNaN.mjs';
import { BootstrapParseFloat } from '../intrinsics/parseFloat.mjs';
import { BootstrapParseInt } from '../intrinsics/parseInt.mjs';
import { BootstrapURIHandling } from '../intrinsics/URIHandling.mjs';
import { BootstrapThrowTypeError } from '../intrinsics/ThrowTypeError.mjs';
import { BootstrapTypedArray } from '../intrinsics/TypedArray.mjs';
import { BootstrapTypedArrayPrototype } from '../intrinsics/TypedArrayPrototype.mjs';
import { BootstrapTypedArrayConstructors } from '../intrinsics/TypedArrayConstructors.mjs';
import { BootstrapTypedArrayPrototypes } from '../intrinsics/TypedArrayPrototypes.mjs';
import { BootstrapDataView } from '../intrinsics/DataView.mjs';
import { BootstrapDataViewPrototype } from '../intrinsics/DataViewPrototype.mjs';
import { BootstrapWeakMapPrototype } from '../intrinsics/WeakMapPrototype.mjs';
import { BootstrapWeakMap } from '../intrinsics/WeakMap.mjs';
import { BootstrapWeakSetPrototype } from '../intrinsics/WeakSetPrototype.mjs';
import { BootstrapWeakSet } from '../intrinsics/WeakSet.mjs';
import { BootstrapAggregateError } from '../intrinsics/AggregateError.mjs';
import { BootstrapAggregateErrorPrototype } from '../intrinsics/AggregateErrorPrototype.mjs';
import { BootstrapWeakRefPrototype } from '../intrinsics/WeakRefPrototype.mjs';
import { BootstrapWeakRef } from '../intrinsics/WeakRef.mjs';
import { BootstrapFinalizationRegistryPrototype } from '../intrinsics/FinalizationRegistryPrototype.mjs';
import { BootstrapFinalizationRegistry } from '../intrinsics/FinalizationRegistry.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  OrdinaryObjectCreate,
} from './all.mjs';

// 8.2 #sec-code-realms
export class Realm {
  constructor() {
    this.Intrinsics = undefined;
    this.GlobalObject = undefined;
    this.GlobalEnv = undefined;
    this.TemplateMap = undefined;
    this.HostDefined = undefined;

    this.randomState = undefined;
  }

  mark(m) {
    m(this.GlobalObject);
    m(this.GlobalEnv);
    for (const v of Object.values(this.Intrinsics)) {
      m(v);
    }
    for (const v of Object.values(this.TemplateMap)) {
      m(v);
    }
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

// #sec-createintrinsics
export function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  intrinsics['%Object.prototype%'] = OrdinaryObjectCreate(Value.null);

  BootstrapFunctionPrototype(realmRec);
  BootstrapObjectPrototype(realmRec);
  BootstrapThrowTypeError(realmRec);

  BootstrapEval(realmRec);
  BootstrapIsFinite(realmRec);
  BootstrapIsNaN(realmRec);
  BootstrapParseFloat(realmRec);
  BootstrapParseInt(realmRec);
  BootstrapURIHandling(realmRec);

  BootstrapObject(realmRec);

  BootstrapErrorPrototype(realmRec);
  BootstrapError(realmRec);
  BootstrapNativeError(realmRec);
  BootstrapAggregateErrorPrototype(realmRec);
  BootstrapAggregateError(realmRec);

  BootstrapFunction(realmRec);

  BootstrapIteratorPrototype(realmRec);
  BootstrapAsyncIteratorPrototype(realmRec);
  BootstrapArrayIteratorPrototype(realmRec);
  BootstrapMapIteratorPrototype(realmRec);
  BootstrapSetIteratorPrototype(realmRec);
  BootstrapStringIteratorPrototype(realmRec);
  BootstrapRegExpStringIteratorPrototype(realmRec);
  BootstrapForInIteratorPrototype(realmRec);

  BootstrapStringPrototype(realmRec);
  BootstrapString(realmRec);

  BootstrapArrayPrototype(realmRec);
  BootstrapArray(realmRec);

  BootstrapBooleanPrototype(realmRec);
  BootstrapBoolean(realmRec);

  BootstrapNumberPrototype(realmRec);
  BootstrapNumber(realmRec);

  BootstrapBigIntPrototype(realmRec);
  BootstrapBigInt(realmRec);

  BootstrapSymbolPrototype(realmRec);
  BootstrapSymbol(realmRec);

  BootstrapPromisePrototype(realmRec);
  BootstrapPromise(realmRec);

  BootstrapProxy(realmRec);

  BootstrapReflect(realmRec);

  BootstrapMath(realmRec);

  BootstrapDatePrototype(realmRec);
  BootstrapDate(realmRec);

  BootstrapRegExpPrototype(realmRec);
  BootstrapRegExp(realmRec);

  BootstrapSetPrototype(realmRec);
  BootstrapSet(realmRec);

  BootstrapMapPrototype(realmRec);
  BootstrapMap(realmRec);

  BootstrapGeneratorFunctionPrototypePrototype(realmRec);
  BootstrapGeneratorFunctionPrototype(realmRec);
  BootstrapGeneratorFunction(realmRec);

  BootstrapAsyncFunctionPrototype(realmRec);
  BootstrapAsyncFunction(realmRec);

  BootstrapAsyncGeneratorFunctionPrototypePrototype(realmRec);
  BootstrapAsyncGeneratorFunctionPrototype(realmRec);
  BootstrapAsyncGeneratorFunction(realmRec);

  BootstrapAsyncFromSyncIteratorPrototype(realmRec);

  BootstrapArrayBufferPrototype(realmRec);
  BootstrapArrayBuffer(realmRec);

  BootstrapTypedArrayPrototype(realmRec);
  BootstrapTypedArray(realmRec);
  BootstrapTypedArrayPrototypes(realmRec);
  BootstrapTypedArrayConstructors(realmRec);

  BootstrapDataViewPrototype(realmRec);
  BootstrapDataView(realmRec);

  BootstrapJSON(realmRec);

  BootstrapWeakMapPrototype(realmRec);
  BootstrapWeakMap(realmRec);
  BootstrapWeakSetPrototype(realmRec);
  BootstrapWeakSet(realmRec);

  BootstrapWeakRefPrototype(realmRec);
  BootstrapWeakRef(realmRec);

  BootstrapFinalizationRegistryPrototype(realmRec);
  BootstrapFinalizationRegistry(realmRec);

  AddRestrictedFunctionProperties(intrinsics['%Function.prototype%'], realmRec);

  return intrinsics;
}

// 8.2.3 #sec-setrealmglobalobject
export function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  const intrinsics = realmRec.Intrinsics;
  if (globalObj === Value.undefined) {
    globalObj = OrdinaryObjectCreate(intrinsics['%Object.prototype%']);
  }
  if (thisValue === Value.undefined) {
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

  Q(DefinePropertyOrThrow(global, new Value('globalThis'), Descriptor({
    Value: realmRec.GlobalEnv.GlobalThisValue,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

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
    'AggregateError',
    'Array',
    'ArrayBuffer',
    'Boolean',
    'BigInt',
    'BigInt64Array',
    'BigUint64Array',
    'DataView',
    'Date',
    'Error',
    'EvalError',
    'FinalizationRegistry',
    'Float32Array',
    'Float64Array',
    'Function',
    'Int8Array',
    'Int16Array',
    'Int32Array',
    'Map',
    'Number',
    'Object',
    'Promise',
    'Proxy',
    'RangeError',
    'ReferenceError',
    'RegExp',
    'Set',
    // 'SharedArrayBuffer',
    'String',
    'Symbol',
    'SyntaxError',
    'TypeError',
    'Uint8Array',
    'Uint8ClampedArray',
    'Uint16Array',
    'Uint32Array',
    'URIError',
    'WeakMap',
    'WeakRef',
    'WeakSet',

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
