import {
  Descriptor,
  Value,
} from '../value.mts';
import { GlobalEnvironmentRecord } from '../environment.mts';
import { Q, X } from '../completion.mts';
import { bootstrapObjectPrototype, makeObjectPrototype } from '../intrinsics/ObjectPrototype.mts';
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
import { bootstrapIteratorHelperPrototype } from '../intrinsics/IteratorHelperPrototype.mts';
import { bootstrapIteratorPrototype } from '../intrinsics/IteratorPrototype.mts';
import { bootstrapIterator } from '../intrinsics/Iterator.mts';
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
import { bootstrapUint8Array } from '../intrinsics/TypedArray_Uint8Array.mts';
import { bootstrapDataView } from '../intrinsics/DataView.mts';
import { bootstrapDataViewPrototype } from '../intrinsics/DataViewPrototype.mts';
import { bootstrapWeakMapPrototype } from '../intrinsics/WeakMapPrototype.mts';
import { bootstrapWeakMap } from '../intrinsics/WeakMap.mts';
import { bootstrapWeakSetPrototype } from '../intrinsics/WeakSetPrototype.mts';
import { bootstrapWeakSet } from '../intrinsics/WeakSet.mts';
import { bootstrapAggregateError } from '../intrinsics/AggregateError.mts';
import { bootstrapAggregateErrorPrototype } from '../intrinsics/AggregateErrorPrototype.mts';
import { bootstrapWeakRefPrototype } from '../intrinsics/WeakRefPrototype.mts';
import { bootstrapWeakRef } from '../intrinsics/WeakRef.mts';
import { bootstrapWrapForValidIteratorPrototype } from '../intrinsics/WrapForValidIteratorPrototype.mts';
import { bootstrapFinalizationRegistryPrototype } from '../intrinsics/FinalizationRegistryPrototype.mts';
import { bootstrapFinalizationRegistry } from '../intrinsics/FinalizationRegistry.mts';
import {
  ManagedRealm, ObjectValue, type BuiltinFunctionObject, type ValueEvaluator, type FunctionObject, type GCMarker, type ManagedRealmHostDefined,
  type LoadedModuleRequestRecord,
} from '../index.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { Mutable } from '../helpers.mts';
import {
  Assert,
  DefinePropertyOrThrow,
  F as toNumberValue,
} from './all.mts';

/** https://tc39.es/ecma262/#table-well-known-intrinsic-objects */
interface Intrinsics_Table6 {
  '%AggregateError%': FunctionObject;
  '%Array%': FunctionObject;
  '%ArrayBuffer%': FunctionObject;
  '%ArrayIteratorPrototype%': ObjectValue;
  '%AsyncFromSyncIteratorPrototype%': ObjectValue;
  '%AsyncFunction%': FunctionObject;
  '%AsyncGeneratorFunction%': FunctionObject;
  '%AsyncGeneratorPrototype%': ObjectValue;
  '%AsyncIteratorPrototype%': ObjectValue;
  '%Atomics%': ObjectValue;
  '%BigInt%': FunctionObject;
  '%BigInt64Array%': FunctionObject;
  '%BigUint64Array%': FunctionObject;
  '%Boolean%': FunctionObject;
  '%DataView%': FunctionObject;
  '%Date%': FunctionObject;
  '%decodeURI%': FunctionObject;
  '%decodeURIComponent%': FunctionObject;
  '%encodeURI%': FunctionObject;
  '%encodeURIComponent%': FunctionObject;
  '%Error%': FunctionObject;
  '%eval%': FunctionObject;
  '%EvalError%': FunctionObject;
  '%FinalizationRegistry%': FunctionObject;
  '%Float16Array%': FunctionObject;
  '%Float32Array%': FunctionObject;
  '%Float64Array%': FunctionObject;
  '%ForInIteratorPrototype%': ObjectValue;
  '%Function%': FunctionObject;
  '%GeneratorFunction%': FunctionObject;
  '%GeneratorPrototype%': ObjectValue;
  '%Int8Array%': FunctionObject;
  '%Int16Array%': FunctionObject;
  '%Int32Array%': FunctionObject;
  '%isFinite%': FunctionObject;
  '%isNaN%': FunctionObject;
  '%Iterator%': FunctionObject;
  '%IteratorHelperPrototype%': ObjectValue;
  '%JSON%': ObjectValue;
  '%Map%': FunctionObject;
  '%MapIteratorPrototype%': ObjectValue;
  '%Math%': ObjectValue;
  '%Number%': FunctionObject;
  '%Object%': FunctionObject;
  '%parseFloat%': FunctionObject;
  '%parseInt%': FunctionObject;
  '%Promise%': FunctionObject;
  '%Proxy%': FunctionObject;
  '%RangeError%': FunctionObject;
  '%ReferenceError%': FunctionObject;
  '%Reflect%': ObjectValue;
  '%RegExp%': FunctionObject;
  '%RegExpStringIteratorPrototype%': ObjectValue;
  '%Set%': FunctionObject;
  '%SetIteratorPrototype%': ObjectValue;
  '%SharedArrayBuffer%': FunctionObject;
  '%String%': FunctionObject;
  '%StringIteratorPrototype%': ObjectValue;
  '%Symbol%': FunctionObject;
  '%SyntaxError%': FunctionObject;
  '%ThrowTypeError%': FunctionObject;
  '%TypedArray%': FunctionObject;
  '%TypeError%': FunctionObject;
  '%Uint8Array%': FunctionObject;
  '%Uint8ClampedArray%': FunctionObject;
  '%Uint16Array%': FunctionObject;
  '%Uint32Array%': FunctionObject;
  '%URIError%': FunctionObject;
  '%WeakMap%': FunctionObject;
  '%WeakRef%': FunctionObject;
  '%WeakSet%': FunctionObject;
  '%WrapForValidIteratorPrototype%': ObjectValue;
}
export interface Intrinsics extends Intrinsics_Table6 {
  '%AggregateError.prototype%': ObjectValue;
  '%Array.prototype.values%': FunctionObject;
  '%Array.prototype%': ObjectValue;
  '%ArrayBuffer.prototype%': ObjectValue;
  '%AsyncFunction.prototype%': ObjectValue;
  '%AsyncGeneratorFunction.prototype.prototype%': ObjectValue;
  '%AsyncGeneratorFunction.prototype%': ObjectValue;
  '%BigInt.prototype%': ObjectValue;
  '%BigInt64Array.prototype%': ObjectValue;
  '%BigInt64Array%': FunctionObject;
  '%BigUint64Array.prototype%': ObjectValue;
  '%BigUint64Array%': FunctionObject;
  '%Boolean.prototype%': ObjectValue;
  '%DataView.prototype%': ObjectValue;
  '%Date.prototype%': ObjectValue;
  '%Error.prototype%': ObjectValue;
  '%Error.prototype.toString%': BuiltinFunctionObject;
  '%EvalError.prototype%': ObjectValue;
  '%EvalError%': FunctionObject;
  '%FinalizationRegistry.prototype%': ObjectValue;
  '%Float32Array.prototype%': ObjectValue;
  '%Float32Array%': FunctionObject;
  '%Float64Array.prototype%': ObjectValue;
  '%Float64Array%': FunctionObject;
  '%Function.prototype%': FunctionObject;
  '%GeneratorFunction.prototype.prototype.next%': FunctionObject;
  '%GeneratorFunction.prototype.prototype%': ObjectValue;
  '%GeneratorFunction.prototype%': ObjectValue;
  '%Int16Array.prototype%': ObjectValue;
  '%Int16Array%': FunctionObject;
  '%Int32Array.prototype%': ObjectValue;
  '%Int32Array%': FunctionObject;
  '%Int8Array.prototype%': ObjectValue;
  '%Int8Array%': FunctionObject;
  '%Iterator.prototype%': ObjectValue;
  '%JSON.parse%': FunctionObject;
  '%JSON.stringify%': FunctionObject;
  '%Map.prototype%': ObjectValue;
  '%Number.prototype%': ObjectValue;
  '%Object.prototype.toString%': BuiltinFunctionObject;
  '%Object.prototype.valueOf%': FunctionObject;
  '%Object.prototype%': ObjectValue;
  '%Promise.prototype.then%': FunctionObject;
  '%Promise.prototype%': ObjectValue;
  '%Promise.resolve%': FunctionObject;
  '%RangeError.prototype%': ObjectValue;
  '%RangeError%': FunctionObject;
  '%ReferenceError.prototype%': ObjectValue;
  '%ReferenceError%': FunctionObject;
  '%RegExp.prototype%': ObjectValue;
  '%Set.prototype%': ObjectValue;
  '%String.prototype%': ObjectValue;
  '%Symbol.prototype%': ObjectValue;
  '%SyntaxError.prototype%': ObjectValue;
  '%SyntaxError%': FunctionObject;
  '%TypedArray.prototype%': ObjectValue;
  '%TypeError.prototype%': ObjectValue;
  '%TypeError%': FunctionObject;
  '%Uint16Array.prototype%': ObjectValue;
  '%Uint16Array%': FunctionObject;
  '%Uint32Array.prototype%': ObjectValue;
  '%Uint32Array%': FunctionObject;
  '%Uint8Array.prototype%': ObjectValue;
  '%Uint8Array%': FunctionObject;
  '%Uint8ClampedArray.prototype%': ObjectValue;
  '%Uint8ClampedArray%': FunctionObject;
  '%URIError.prototype%': ObjectValue;
  '%URIError%': FunctionObject;
  '%WeakMap.prototype%': ObjectValue;
  '%WeakRef.prototype%': ObjectValue;
  '%WeakSet.prototype%': ObjectValue;
}

/** https://tc39.es/ecma262/#sec-code-realms */
export abstract class Realm {
  abstract readonly AgentSignifier: unknown;

  abstract readonly Intrinsics: Intrinsics;

  abstract readonly GlobalObject: ObjectValue;

  abstract readonly GlobalEnv: GlobalEnvironmentRecord;

  abstract readonly TemplateMap: { Site: ParseNode.TemplateLiteral, Array: ObjectValue }[];

  readonly LoadedModules: LoadedModuleRequestRecord[] = [];

  abstract readonly HostDefined: ManagedRealmHostDefined;

  // NON-SPEC
  abstract randomState: undefined | BigUint64Array;

  mark(m: GCMarker) {
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

export function InitializeHostDefinedRealm() {
  return new ManagedRealm();
}

function AddRestrictedFunctionProperties(F: ObjectValue, realm: Realm) {
  Assert(!!realm.Intrinsics['%ThrowTypeError%']);
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
export function CreateIntrinsics(realmRec: Realm) {
  const intrinsics = Object.create(null);
  (realmRec as Mutable<Realm>).Intrinsics = intrinsics;
  makeObjectPrototype(realmRec);

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
  bootstrapIterator(realmRec);
  bootstrapIteratorHelperPrototype(realmRec);
  bootstrapWrapForValidIteratorPrototype(realmRec);

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
  bootstrapUint8Array(realmRec);

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

  for (const key in intrinsics) {
    if (intrinsics[key] instanceof ObjectValue) {
      Object.defineProperty(intrinsics, '__debug_intrinsic_name__', { value: key, configurable: true });
    }
  }

  return intrinsics;
}

/** https://tc39.es/ecma262/#sec-setdefaultglobalbindings */
export function* SetDefaultGlobalBindings(realmRec: Realm): ValueEvaluator<ObjectValue> {
  const global = realmRec.GlobalObject;

  // Value Properties of the Global Object
  for (const [name, value] of [
    ['Infinity', toNumberValue(Infinity)],
    ['NaN', toNumberValue(NaN)],
    ['undefined', Value.undefined],
  ] as const) {
    Q(yield* DefinePropertyOrThrow(global, Value(name), Descriptor({
      Value: value,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
    })));
  }

  Q(yield* DefinePropertyOrThrow(global, Value('globalThis'), Descriptor({
    Value: realmRec.GlobalEnv.GlobalThisValue,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  for (const name of [
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
    'Iterator',
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
  ] as const) {
    Q(yield* DefinePropertyOrThrow(global, Value(name), Descriptor({
      Value: realmRec.Intrinsics[`%${name}%`],
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  return global;
}
