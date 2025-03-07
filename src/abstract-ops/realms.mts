// @ts-nocheck
import {
  Descriptor,
  Value,
} from '../value.mts';
import { GlobalEnvironmentRecord } from '../environment.mts';
import { Q, X } from '../completion.mts';
import { bootstrapObjectPrototype } from '../intrinsics/ObjectPrototype.mts';
import { bootstrapObject } from '../intrinsics/Object.mts';
import { bootstrapArrayPrototype } from '../intrinsics/ArrayPrototype.mts';
import { bootstrapArray } from '../intrinsics/Array.mts';
import { bootstrapBigInt } from '../intrinsics/BigInt.mts';
import { bootstrapBigIntPrototype } from '../intrinsics/BigIntPrototype.mts';
import { bootstrapBooleanPrototype } from '../intrinsics/BooleanPrototype.mts';
import { bootstrapBoolean } from '../intrinsics/Boolean.mts';
import { bootstrapNumberPrototype } from '../intrinsics/NumberPrototype.mts';
import { bootstrapNumber } from '../intrinsics/Number.mts';
import { bootstrapFunctionPrototype } from '../intrinsics/FunctionPrototype.mts';
import { bootstrapFunction } from '../intrinsics/Function.mts';
import { bootstrapSymbolPrototype } from '../intrinsics/SymbolPrototype.mts';
import { bootstrapSymbol } from '../intrinsics/Symbol.mts';
import { bootstrapMath } from '../intrinsics/Math.mts';
import { bootstrapDatePrototype } from '../intrinsics/DatePrototype.mts';
import { bootstrapDate } from '../intrinsics/Date.mts';
import { bootstrapRegExpPrototype } from '../intrinsics/RegExpPrototype.mts';
import { bootstrapRegExp } from '../intrinsics/RegExp.mts';
import { bootstrapPromisePrototype } from '../intrinsics/PromisePrototype.mts';
import { bootstrapPromise } from '../intrinsics/Promise.mts';
import { bootstrapProxy } from '../intrinsics/Proxy.mts';
import { bootstrapReflect } from '../intrinsics/Reflect.mts';
import { bootstrapStringPrototype } from '../intrinsics/StringPrototype.mts';
import { bootstrapString } from '../intrinsics/String.mts';
import { bootstrapErrorPrototype } from '../intrinsics/ErrorPrototype.mts';
import { bootstrapError } from '../intrinsics/Error.mts';
import { bootstrapNativeError } from '../intrinsics/NativeError.mts';
import { bootstrapIteratorPrototype } from '../intrinsics/IteratorPrototype.mts';
import { bootstrapAsyncIteratorPrototype } from '../intrinsics/AsyncIteratorPrototype.mts';
import { bootstrapArrayIteratorPrototype } from '../intrinsics/ArrayIteratorPrototype.mts';
import { bootstrapMapIteratorPrototype } from '../intrinsics/MapIteratorPrototype.mts';
import { bootstrapSetIteratorPrototype } from '../intrinsics/SetIteratorPrototype.mts';
import { bootstrapStringIteratorPrototype } from '../intrinsics/StringIteratorPrototype.mts';
import { bootstrapRegExpStringIteratorPrototype } from '../intrinsics/RegExpStringIteratorPrototype.mts';
import { bootstrapForInIteratorPrototype } from '../intrinsics/ForInIteratorPrototype.mts';
import { bootstrapMapPrototype } from '../intrinsics/MapPrototype.mts';
import { bootstrapMap } from '../intrinsics/Map.mts';
import { bootstrapSetPrototype } from '../intrinsics/SetPrototype.mts';
import { bootstrapSet } from '../intrinsics/Set.mts';
import { bootstrapGeneratorFunctionPrototypePrototype } from '../intrinsics/GeneratorFunctionPrototypePrototype.mts';
import { bootstrapGeneratorFunctionPrototype } from '../intrinsics/GeneratorFunctionPrototype.mts';
import { bootstrapGeneratorFunction } from '../intrinsics/GeneratorFunction.mts';
import { bootstrapAsyncFunctionPrototype } from '../intrinsics/AsyncFunctionPrototype.mts';
import { bootstrapAsyncFunction } from '../intrinsics/AsyncFunction.mts';
import { bootstrapAsyncGeneratorFunctionPrototypePrototype } from '../intrinsics/AsyncGeneratorFunctionPrototypePrototype.mts';
import { bootstrapAsyncGeneratorFunctionPrototype } from '../intrinsics/AsyncGeneratorFunctionPrototype.mts';
import { bootstrapAsyncGeneratorFunction } from '../intrinsics/AsyncGeneratorFunction.mts';
import { bootstrapAsyncFromSyncIteratorPrototype } from '../intrinsics/AsyncFromSyncIteratorPrototype.mts';
import { bootstrapArrayBuffer } from '../intrinsics/ArrayBuffer.mts';
import { bootstrapArrayBufferPrototype } from '../intrinsics/ArrayBufferPrototype.mts';
import { bootstrapJSON } from '../intrinsics/JSON.mts';
import { bootstrapEval } from '../intrinsics/eval.mts';
import { bootstrapIsFinite } from '../intrinsics/isFinite.mts';
import { bootstrapIsNaN } from '../intrinsics/isNaN.mts';
import { bootstrapParseFloat } from '../intrinsics/parseFloat.mts';
import { bootstrapParseInt } from '../intrinsics/parseInt.mts';
import { bootstrapURIHandling } from '../intrinsics/URIHandling.mts';
import { bootstrapThrowTypeError } from '../intrinsics/ThrowTypeError.mts';
import { bootstrapTypedArray } from '../intrinsics/TypedArray.mts';
import { bootstrapTypedArrayPrototype } from '../intrinsics/TypedArrayPrototype.mts';
import { bootstrapTypedArrayConstructors } from '../intrinsics/TypedArrayConstructors.mts';
import { bootstrapTypedArrayPrototypes } from '../intrinsics/TypedArrayPrototypes.mts';
import { bootstrapDataView } from '../intrinsics/DataView.mts';
import { bootstrapDataViewPrototype } from '../intrinsics/DataViewPrototype.mts';
import { bootstrapWeakMapPrototype } from '../intrinsics/WeakMapPrototype.mts';
import { bootstrapWeakMap } from '../intrinsics/WeakMap.mts';
import { bootstrapWeakSetPrototype } from '../intrinsics/WeakSetPrototype.mjs';
import { bootstrapWeakSet } from '../intrinsics/WeakSet.mjs';
import { bootstrapAggregateError } from '../intrinsics/AggregateError.mjs';
import { bootstrapAggregateErrorPrototype } from '../intrinsics/AggregateErrorPrototype.mjs';
import { bootstrapWeakRefPrototype } from '../intrinsics/WeakRefPrototype.mjs';
import { bootstrapWeakRef } from '../intrinsics/WeakRef.mjs';
import { bootstrapFinalizationRegistryPrototype } from '../intrinsics/FinalizationRegistryPrototype.mjs';
import { bootstrapFinalizationRegistry } from '../intrinsics/FinalizationRegistry.mjs';
import type { ManagedRealmHostDefined } from '../api.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  F as toNumberValue,
  OrdinaryObjectCreate,
} from './all.mjs';

/** https://tc39.es/ecma262/#sec-code-realms */
export class Realm {
  Intrinsics: Record<string, Value>;

  GlobalObject;

  GlobalEnv;

  TemplateMap;

  LoadedModules;

  HostDefined: ManagedRealmHostDefined;

  randomState;

  mark(m) {
    m(this.GlobalObject);
    m(this.GlobalEnv);
    for (const v of Object.values(this.Intrinsics)) {
      m(v);
    }
    for (const v of Object.values(this.TemplateMap)) {
      m(v);
    }
    for (const v of this.LoadedModules) {
      m(v.Module);
    }
  }
}

/** https://tc39.es/ecma262/#sec-createrealm */
export function CreateRealm() {
  const realmRec = new Realm();
  CreateIntrinsics(realmRec);
  realmRec.GlobalObject = Value.undefined;
  realmRec.GlobalEnv = Value.undefined;
  realmRec.TemplateMap = [];
  realmRec.LoadedModules = [];
  return realmRec;
}

function AddRestrictedFunctionProperties(F, realm) {
  Assert(realm.Intrinsics['%ThrowTypeError%']);
  const thrower = realm.Intrinsics['%ThrowTypeError%'];
  X(DefinePropertyOrThrow(F, Value('caller'), Descriptor({
    Get: thrower,
    Set: thrower,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
  X(DefinePropertyOrThrow(F, Value('arguments'), Descriptor({
    Get: thrower,
    Set: thrower,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));
}

/** https://tc39.es/ecma262/#sec-createintrinsics */
export function CreateIntrinsics(realmRec) {
  const intrinsics = Object.create(null);
  realmRec.Intrinsics = intrinsics;

  intrinsics['%Object.prototype%'] = OrdinaryObjectCreate(Value.null);

  bootstrapFunctionPrototype(realmRec);
  bootstrapObjectPrototype(realmRec);
  bootstrapThrowTypeError(realmRec);

  bootstrapEval(realmRec);
  bootstrapIsFinite(realmRec);
  bootstrapIsNaN(realmRec);
  bootstrapParseFloat(realmRec);
  bootstrapParseInt(realmRec);
  bootstrapURIHandling(realmRec);

  bootstrapObject(realmRec);

  bootstrapErrorPrototype(realmRec);
  bootstrapError(realmRec);
  bootstrapNativeError(realmRec);
  bootstrapAggregateErrorPrototype(realmRec);
  bootstrapAggregateError(realmRec);

  bootstrapFunction(realmRec);

  bootstrapIteratorPrototype(realmRec);
  bootstrapAsyncIteratorPrototype(realmRec);
  bootstrapArrayIteratorPrototype(realmRec);
  bootstrapMapIteratorPrototype(realmRec);
  bootstrapSetIteratorPrototype(realmRec);
  bootstrapStringIteratorPrototype(realmRec);
  bootstrapRegExpStringIteratorPrototype(realmRec);
  bootstrapForInIteratorPrototype(realmRec);

  bootstrapStringPrototype(realmRec);
  bootstrapString(realmRec);

  bootstrapArrayPrototype(realmRec);
  bootstrapArray(realmRec);

  bootstrapBooleanPrototype(realmRec);
  bootstrapBoolean(realmRec);

  bootstrapNumberPrototype(realmRec);
  bootstrapNumber(realmRec);

  bootstrapBigIntPrototype(realmRec);
  bootstrapBigInt(realmRec);

  bootstrapSymbolPrototype(realmRec);
  bootstrapSymbol(realmRec);

  bootstrapPromisePrototype(realmRec);
  bootstrapPromise(realmRec);

  bootstrapProxy(realmRec);

  bootstrapReflect(realmRec);

  bootstrapMath(realmRec);

  bootstrapDatePrototype(realmRec);
  bootstrapDate(realmRec);

  bootstrapRegExpPrototype(realmRec);
  bootstrapRegExp(realmRec);

  bootstrapSetPrototype(realmRec);
  bootstrapSet(realmRec);

  bootstrapMapPrototype(realmRec);
  bootstrapMap(realmRec);

  bootstrapGeneratorFunctionPrototypePrototype(realmRec);
  bootstrapGeneratorFunctionPrototype(realmRec);
  bootstrapGeneratorFunction(realmRec);

  bootstrapAsyncFunctionPrototype(realmRec);
  bootstrapAsyncFunction(realmRec);

  bootstrapAsyncGeneratorFunctionPrototypePrototype(realmRec);
  bootstrapAsyncGeneratorFunctionPrototype(realmRec);
  bootstrapAsyncGeneratorFunction(realmRec);

  bootstrapAsyncFromSyncIteratorPrototype(realmRec);

  bootstrapArrayBufferPrototype(realmRec);
  bootstrapArrayBuffer(realmRec);

  bootstrapTypedArrayPrototype(realmRec);
  bootstrapTypedArray(realmRec);
  bootstrapTypedArrayPrototypes(realmRec);
  bootstrapTypedArrayConstructors(realmRec);

  bootstrapDataViewPrototype(realmRec);
  bootstrapDataView(realmRec);

  bootstrapJSON(realmRec);

  bootstrapWeakMapPrototype(realmRec);
  bootstrapWeakMap(realmRec);
  bootstrapWeakSetPrototype(realmRec);
  bootstrapWeakSet(realmRec);

  bootstrapWeakRefPrototype(realmRec);
  bootstrapWeakRef(realmRec);

  bootstrapFinalizationRegistryPrototype(realmRec);
  bootstrapFinalizationRegistry(realmRec);

  AddRestrictedFunctionProperties(intrinsics['%Function.prototype%'], realmRec);

  return intrinsics;
}

/** https://tc39.es/ecma262/#sec-setrealmglobalobject */
export function SetRealmGlobalObject(realmRec, globalObj, thisValue) {
  const intrinsics = realmRec.Intrinsics;
  if (globalObj === Value.undefined) {
    globalObj = OrdinaryObjectCreate(intrinsics['%Object.prototype%']);
  }
  if (thisValue === Value.undefined) {
    thisValue = globalObj;
  }
  realmRec.GlobalObject = globalObj;
  const newGlobalEnv = new GlobalEnvironmentRecord(globalObj, thisValue);
  realmRec.GlobalEnv = newGlobalEnv;
  return realmRec;
}

/** https://tc39.es/ecma262/#sec-setdefaultglobalbindings */
export function SetDefaultGlobalBindings(realmRec) {
  const global = realmRec.GlobalObject;

  // Value Properties of the Global Object
  [
    ['Infinity', toNumberValue(Infinity)],
    ['NaN', toNumberValue(NaN)],
    ['undefined', Value.undefined],
  ].forEach(([name, value]) => {
    Q(DefinePropertyOrThrow(global, Value(name), Descriptor({
      Value: value,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  });

  Q(DefinePropertyOrThrow(global, Value('globalThis'), Descriptor({
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
    Q(DefinePropertyOrThrow(global, Value(name), Descriptor({
      Value: realmRec.Intrinsics[`%${name}%`],
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  });

  return global;
}
