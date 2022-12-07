import {
  Descriptor,
  Value,
} from '../value.mjs';
import { NewGlobalEnvironment } from '../environment.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapObjectPrototype } from '../intrinsics/ObjectPrototype.mjs';
import { bootstrapObject } from '../intrinsics/Object.mjs';
import { bootstrapArrayPrototype } from '../intrinsics/ArrayPrototype.mjs';
import { bootstrapArray } from '../intrinsics/Array.mjs';
import { bootstrapBigInt } from '../intrinsics/BigInt.mjs';
import { bootstrapBigIntPrototype } from '../intrinsics/BigIntPrototype.mjs';
import { bootstrapBooleanPrototype } from '../intrinsics/BooleanPrototype.mjs';
import { bootstrapBoolean } from '../intrinsics/Boolean.mjs';
import { bootstrapNumberPrototype } from '../intrinsics/NumberPrototype.mjs';
import { bootstrapNumber } from '../intrinsics/Number.mjs';
import { bootstrapFunctionPrototype } from '../intrinsics/FunctionPrototype.mjs';
import { bootstrapFunction } from '../intrinsics/Function.mjs';
import { bootstrapSymbolPrototype } from '../intrinsics/SymbolPrototype.mjs';
import { bootstrapSymbol } from '../intrinsics/Symbol.mjs';
import { bootstrapMath } from '../intrinsics/Math.mjs';
import { bootstrapDatePrototype } from '../intrinsics/DatePrototype.mjs';
import { bootstrapDate } from '../intrinsics/Date.mjs';
import { bootstrapRegExpPrototype } from '../intrinsics/RegExpPrototype.mjs';
import { bootstrapRegExp } from '../intrinsics/RegExp.mjs';
import { bootstrapPromisePrototype } from '../intrinsics/PromisePrototype.mjs';
import { bootstrapPromise } from '../intrinsics/Promise.mjs';
import { bootstrapProxy } from '../intrinsics/Proxy.mjs';
import { bootstrapReflect } from '../intrinsics/Reflect.mjs';
import { bootstrapStringPrototype } from '../intrinsics/StringPrototype.mjs';
import { bootstrapString } from '../intrinsics/String.mjs';
import { bootstrapErrorPrototype } from '../intrinsics/ErrorPrototype.mjs';
import { bootstrapError } from '../intrinsics/Error.mjs';
import { bootstrapNativeError } from '../intrinsics/NativeError.mjs';
import { bootstrapIteratorPrototype } from '../intrinsics/IteratorPrototype.mjs';
import { bootstrapAsyncIteratorPrototype } from '../intrinsics/AsyncIteratorPrototype.mjs';
import { bootstrapArrayIteratorPrototype } from '../intrinsics/ArrayIteratorPrototype.mjs';
import { bootstrapMapIteratorPrototype } from '../intrinsics/MapIteratorPrototype.mjs';
import { bootstrapSetIteratorPrototype } from '../intrinsics/SetIteratorPrototype.mjs';
import { bootstrapStringIteratorPrototype } from '../intrinsics/StringIteratorPrototype.mjs';
import { bootstrapRegExpStringIteratorPrototype } from '../intrinsics/RegExpStringIteratorPrototype.mjs';
import { bootstrapForInIteratorPrototype } from '../intrinsics/ForInIteratorPrototype.mjs';
import { bootstrapMapPrototype } from '../intrinsics/MapPrototype.mjs';
import { bootstrapMap } from '../intrinsics/Map.mjs';
import { bootstrapSetPrototype } from '../intrinsics/SetPrototype.mjs';
import { bootstrapSet } from '../intrinsics/Set.mjs';
import { bootstrapGeneratorFunctionPrototypePrototype } from '../intrinsics/GeneratorFunctionPrototypePrototype.mjs';
import { bootstrapGeneratorFunctionPrototype } from '../intrinsics/GeneratorFunctionPrototype.mjs';
import { bootstrapGeneratorFunction } from '../intrinsics/GeneratorFunction.mjs';
import { bootstrapAsyncFunctionPrototype } from '../intrinsics/AsyncFunctionPrototype.mjs';
import { bootstrapAsyncFunction } from '../intrinsics/AsyncFunction.mjs';
import { bootstrapAsyncGeneratorFunctionPrototypePrototype } from '../intrinsics/AsyncGeneratorFunctionPrototypePrototype.mjs';
import { bootstrapAsyncGeneratorFunctionPrototype } from '../intrinsics/AsyncGeneratorFunctionPrototype.mjs';
import { bootstrapAsyncGeneratorFunction } from '../intrinsics/AsyncGeneratorFunction.mjs';
import { bootstrapAsyncFromSyncIteratorPrototype } from '../intrinsics/AsyncFromSyncIteratorPrototype.mjs';
import { bootstrapArrayBuffer } from '../intrinsics/ArrayBuffer.mjs';
import { bootstrapArrayBufferPrototype } from '../intrinsics/ArrayBufferPrototype.mjs';
import { bootstrapJSON } from '../intrinsics/JSON.mjs';
import { bootstrapEval } from '../intrinsics/eval.mjs';
import { bootstrapIsFinite } from '../intrinsics/isFinite.mjs';
import { bootstrapIsNaN } from '../intrinsics/isNaN.mjs';
import { bootstrapParseFloat } from '../intrinsics/parseFloat.mjs';
import { bootstrapParseInt } from '../intrinsics/parseInt.mjs';
import { bootstrapURIHandling } from '../intrinsics/URIHandling.mjs';
import { bootstrapThrowTypeError } from '../intrinsics/ThrowTypeError.mjs';
import { bootstrapTypedArray } from '../intrinsics/TypedArray.mjs';
import { bootstrapTypedArrayPrototype } from '../intrinsics/TypedArrayPrototype.mjs';
import { bootstrapTypedArrayConstructors } from '../intrinsics/TypedArrayConstructors.mjs';
import { bootstrapTypedArrayPrototypes } from '../intrinsics/TypedArrayPrototypes.mjs';
import { bootstrapDataView } from '../intrinsics/DataView.mjs';
import { bootstrapDataViewPrototype } from '../intrinsics/DataViewPrototype.mjs';
import { bootstrapWeakMapPrototype } from '../intrinsics/WeakMapPrototype.mjs';
import { bootstrapWeakMap } from '../intrinsics/WeakMap.mjs';
import { bootstrapWeakSetPrototype } from '../intrinsics/WeakSetPrototype.mjs';
import { bootstrapWeakSet } from '../intrinsics/WeakSet.mjs';
import { bootstrapAggregateError } from '../intrinsics/AggregateError.mjs';
import { bootstrapAggregateErrorPrototype } from '../intrinsics/AggregateErrorPrototype.mjs';
import { bootstrapWeakRefPrototype } from '../intrinsics/WeakRefPrototype.mjs';
import { bootstrapWeakRef } from '../intrinsics/WeakRef.mjs';
import { bootstrapFinalizationRegistryPrototype } from '../intrinsics/FinalizationRegistryPrototype.mjs';
import { bootstrapFinalizationRegistry } from '../intrinsics/FinalizationRegistry.mjs';
import {
  Assert,
  DefinePropertyOrThrow,
  F as toNumberValue,
  OrdinaryObjectCreate,
} from './all.mjs';

/** http://tc39.es/ecma262/#sec-code-realms */
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

/** http://tc39.es/ecma262/#sec-createrealm */
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

/** http://tc39.es/ecma262/#sec-createintrinsics */
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

/** http://tc39.es/ecma262/#sec-setrealmglobalobject */
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

/** http://tc39.es/ecma262/#sec-setdefaultglobalbindings */
export function SetDefaultGlobalBindings(realmRec) {
  const global = realmRec.GlobalObject;

  // Value Properties of the Global Object
  [
    ['Infinity', toNumberValue(Infinity)],
    ['NaN', toNumberValue(NaN)],
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
