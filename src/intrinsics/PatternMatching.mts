import {
  BigIntValue,
  BooleanValue,
  JSStringValue,
  NumberValue,
  ObjectValue,
  SymbolValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { Q, type PlainCompletion, type ValueCompletion, type ValueEvaluator } from '../completion.mts';
import { isBigIntObject } from './BigInt.mts';
import { isBooleanObject } from './Boolean.mts';
import { isNumberObject } from './Number.mts';
import { isStringObject } from './String.mts';
import { isSymbolObject } from './Symbol.mts';
import { assignProps } from './bootstrap.mts';
import {
  Call,
  CreateArrayFromList,
  Get,
  IsArray,
  IsCallable,
  IsRegExp,
  Throw,
  ToString,
  WeakRefDeref,
  isArrayBufferObject,
  isDataViewObject,
  isDateObject,
  isErrorObject,
  isFinalizationRegistryObject,
  isMapObject,
  isPromiseObject,
  isSetObject,
  isTypedArrayObject,
  isWeakMapObject,
  isWeakRef,
  isWeakSetObject,
  type ErrorObject,
  type Realm,
} from '#self';

type MatcherHint = 'boolean' | 'list';

function ValidateCustomMatcherHint(hint: Value, expected?: MatcherHint): PlainCompletion<MatcherHint> {
  if (!(hint instanceof JSStringValue)) return Throw.TypeError('Unexpected token');
  const value = hint.stringValue();
  if (value !== 'boolean' && value !== 'list') return Throw.TypeError('Unexpected token');
  if (expected && value !== expected) return Throw.TypeError('Unexpected token');
  return value;
}

/** https://tc39.es/proposal-pattern-matching/#sec-object-%symbol.custommatcher% */
function Object_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(subject instanceof ObjectValue);
}

/** https://tc39.es/proposal-pattern-matching/#sec-function-%symbol.custommatcher% */
function Function_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(IsCallable(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-function.prototype-%symbol.custommatcher% */
function* FunctionPrototype_customMatcher(
  [subject = Value.undefined, hint = Value.undefined, receiver = Value.null]: Arguments,
  { thisValue }: FunctionCallContext,
): ValueEvaluator {
  Q(ValidateCustomMatcherHint(hint));
  if (!IsCallable(thisValue)) return Throw.TypeError('$1 is not a function', thisValue);
  if (subject instanceof ObjectValue && subject.ConstructedBy.some((constructor) => constructor === thisValue)) {
    return Value.true;
  }
  if (!thisValue.IsClassConstructor) {
    return Q(yield* Call(thisValue, receiver, [subject, hint]));
  }
  return Value.false;
}

function primitiveMatcherResult(hint: MatcherHint, primitive: Value | undefined) {
  if (!primitive) return Value.false;
  return hint === 'boolean' ? Value.true : CreateArrayFromList([primitive]);
}

/** https://tc39.es/proposal-pattern-matching/#sec-boolean-%symbol.custommatcher% */
function Boolean_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  const primitive = subject instanceof BooleanValue ? subject : isBooleanObject(subject) ? Value(subject.BooleanData) : undefined;
  return primitiveMatcherResult(kind, primitive);
}

/** https://tc39.es/proposal-pattern-matching/#sec-number-%symbol.custommatcher% */
function Number_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  const primitive = subject instanceof NumberValue ? subject : isNumberObject(subject) ? subject.NumberData : undefined;
  return primitiveMatcherResult(kind, primitive);
}

/** https://tc39.es/proposal-pattern-matching/#sec-bigint-%symbol.custommatcher% */
function BigInt_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  const primitive = subject instanceof BigIntValue ? subject : isBigIntObject(subject) ? Value(subject.BigIntData) : undefined;
  return primitiveMatcherResult(kind, primitive);
}

/** https://tc39.es/proposal-pattern-matching/#sec-string-%symbol.custommatcher% */
function String_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  const primitive = subject instanceof JSStringValue ? subject : isStringObject(subject) ? Value(subject.StringData) : undefined;
  return primitiveMatcherResult(kind, primitive);
}

/** https://tc39.es/proposal-pattern-matching/#sec-symbol-%symbol.custommatcher% */
function Symbol_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  const primitive = subject instanceof SymbolValue ? subject : isSymbolObject(subject) ? subject.SymbolData : undefined;
  return primitiveMatcherResult(kind, primitive);
}

/** https://tc39.es/proposal-pattern-matching/#sec-error-%symbol.custommatcher% */
function Error_customMatcher(
  [subject = Value.undefined, hint = Value.undefined]: Arguments,
  { thisValue }: FunctionCallContext,
): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  if (!isErrorObject(subject)) return Value.false;
  const expected = IsCallable(thisValue) && thisValue.InitialName !== null
    ? thisValue.InitialName
    : 'Error';
  if (expected === 'Error') return Value.true;
  return Value((subject as ErrorObject).ErrorData === expected);
}

/** https://tc39.es/proposal-pattern-matching/#sec-date-%symbol.custommatcher% */
function Date_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isDateObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-regexp-%symbol.custommatcher% */
function* RegExp_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueEvaluator {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(Q(yield* IsRegExp(subject)));
}

/** https://tc39.es/proposal-pattern-matching/#sec-regexp.prototype-%symbol.custommatcher% */
function* RegExpPrototype_customMatcher(
  [subject = Value.undefined, hint = Value.undefined]: Arguments,
  { thisValue: regexp }: FunctionCallContext,
): ValueEvaluator {
  const kind = Q(ValidateCustomMatcherHint(hint));
  if (kind === 'boolean') {
    const test = Q(yield* Get(regexp as ObjectValue, 'test'));
    return Q(yield* Call(test, regexp, [subject]));
  }
  if (!(regexp instanceof ObjectValue)) return Throw.TypeError('$1 is not an object', regexp);
  const flags = Q(yield* ToString(Q(yield* Get(regexp, 'flags'))));
  if (flags.includes('g')) {
    const matchAll = Q(yield* Get(regexp, wellKnownSymbols.matchAll));
    return Q(yield* Call(matchAll, regexp, [subject]));
  }
  const match = Q(yield* Get(regexp, wellKnownSymbols.match));
  const result = Q(yield* Call(match, regexp, [subject]));
  if (result === Value.null) return Value.false;
  return CreateArrayFromList([result]);
}

/** https://tc39.es/proposal-pattern-matching/#sec-array-%symbol.custommatcher% */
function Array_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  const isArray = Q(IsArray(subject));
  if (!isArray) return Value.false;
  return kind === 'boolean' ? Value.true : subject;
}

/** https://tc39.es/proposal-pattern-matching/#sec-_typedarray_-%symbol.custommatcher% */
function TypedArray_customMatcher(
  [subject = Value.undefined, hint = Value.undefined]: Arguments,
  { thisValue }: FunctionCallContext,
): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  if (!isTypedArrayObject(subject)) return Value.false;
  if (!IsCallable(thisValue) || thisValue.InitialName === null
      || subject.TypedArrayName !== thisValue.InitialName) return Value.false;
  return kind === 'boolean' ? Value.true : subject;
}

/** https://tc39.es/proposal-pattern-matching/#sec-map-%symbol.custommatcher% */
function Map_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  if (!isMapObject(subject)) return Value.false;
  return kind === 'boolean' ? Value.true : CreateArrayFromList([subject]);
}

/** https://tc39.es/proposal-pattern-matching/#sec-set-%symbol.custommatcher% */
function Set_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  if (!isSetObject(subject)) return Value.false;
  return kind === 'boolean' ? Value.true : CreateArrayFromList([subject]);
}

/** https://tc39.es/proposal-pattern-matching/#sec-weakmap-%symbol.custommatcher% */
function WeakMap_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isWeakMapObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-weakset-%symbol.custommatcher% */
function WeakSet_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isWeakSetObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-arraybuffer-%symbol.custommatcher% */
function ArrayBuffer_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isArrayBufferObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-dataview-%symbol.custommatcher% */
function DataView_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isDataViewObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-weakref-%symbol.custommatcher% */
function WeakRef_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  const kind = Q(ValidateCustomMatcherHint(hint));
  if (!isWeakRef(subject)) return Value.false;
  return kind === 'boolean' ? Value.true : CreateArrayFromList([WeakRefDeref(subject)]);
}

/** https://tc39.es/proposal-pattern-matching/#sec-finalizationregistry-%symbol.custommatcher% */
function FinalizationRegistry_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isFinalizationRegistryObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-promise-%symbol.custommatcher% */
function Promise_customMatcher([subject = Value.undefined, hint = Value.undefined]: Arguments): ValueCompletion {
  Q(ValidateCustomMatcherHint(hint, 'boolean'));
  return Value(isPromiseObject(subject));
}

/** https://tc39.es/proposal-pattern-matching/#sec-proxy-%symbol.custommatcher% */
function Proxy_customMatcher() {
  return Throw.TypeError('Unexpected token');
}

export function installPatternMatchingIntrinsics(realm: Realm) {
  const matcher = wellKnownSymbols.customMatcher;
  assignProps(realm, realm.Intrinsics['%Object%'], [[matcher, Object_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Function%'], [[matcher, Function_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Function.prototype%'], [[matcher, FunctionPrototype_customMatcher, 3]]);
  assignProps(realm, realm.Intrinsics['%Boolean%'], [[matcher, Boolean_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Number%'], [[matcher, Number_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%BigInt%'], [[matcher, BigInt_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%String%'], [[matcher, String_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Symbol%'], [[matcher, Symbol_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Error%'], [[matcher, Error_customMatcher, 2]]);
  for (const name of ['AggregateError', 'EvalError', 'RangeError', 'ReferenceError', 'SyntaxError', 'TypeError', 'URIError'] as const) {
    assignProps(realm, realm.Intrinsics[`%${name}%`], [[matcher, Error_customMatcher, 2]]);
  }
  assignProps(realm, realm.Intrinsics['%Date%'], [[matcher, Date_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%RegExp%'], [[matcher, RegExp_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%RegExp.prototype%'], [[matcher, RegExpPrototype_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Array%'], [[matcher, Array_customMatcher, 2]]);
  for (const name of ['BigInt64Array', 'BigUint64Array', 'Float16Array', 'Float32Array', 'Float64Array', 'Int8Array', 'Int16Array', 'Int32Array', 'Uint8Array', 'Uint8ClampedArray', 'Uint16Array', 'Uint32Array'] as const) {
    assignProps(realm, realm.Intrinsics[`%${name}%`], [[matcher, TypedArray_customMatcher, 2]]);
  }
  assignProps(realm, realm.Intrinsics['%Map%'], [[matcher, Map_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Set%'], [[matcher, Set_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%WeakMap%'], [[matcher, WeakMap_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%WeakSet%'], [[matcher, WeakSet_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%ArrayBuffer%'], [[matcher, ArrayBuffer_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%DataView%'], [[matcher, DataView_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%WeakRef%'], [[matcher, WeakRef_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%FinalizationRegistry%'], [[matcher, FinalizationRegistry_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Promise%'], [[matcher, Promise_customMatcher, 2]]);
  assignProps(realm, realm.Intrinsics['%Proxy%'], [[matcher, Proxy_customMatcher, 0]]);
}
