import {
  Descriptor,
  ObjectValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  Q, X, type ValueCompletion, type ValueEvaluator,
} from '../completion.mts';
import { __ts_cast__ } from '../utils/language.mts';
import type { PlainEvaluator } from '../evaluator.mts';
import { clamp } from '../abstract-ops/math.mts';
import { sort } from '../host-defined/sort.mts';
import { assignProps } from './bootstrap.mts';
import { NormalCompletion, NumberValue, R, surroundingAgent, ThrowCompletion, type Integer } from '#self';
import {
  ArrayCreate,
  ArraySpeciesCreate,
  Assert,
  Call,
  CreateArrayIterator,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  DeletePropertyOrThrow,
  Get,
  HasProperty,
  Invoke,
  IsArray,
  IsCallable,
  IsConcatSpreadable,
  IsStrictlyEqual,
  Set,
  CompareArrayElements,
  LengthOfArrayLike,
  OrdinaryObjectCreate,
  SameValueZero,
  ToBoolean,
  ToAbsoluteIndex,
  ToClampedIndex,
  ToIntegerOrInfinity,
  ToObject,
  ToString,
  Throw,
  F,
  type FunctionObject,
  Realm,
} from '#self';

/** https://tc39.es/ecma262/#sec-array.prototype.at */
function* ArrayProto_at([index = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const k = Q(yield* ToAbsoluteIndex(index, length));
  if (k < 0 || k >= length) {
    return Value.undefined;
  }
  return Q(yield* Get(obj, X(ToString(F(k)))));
}

/** https://tc39.es/ecma262/#sec-array.prototype.concat */
function* ArrayProto_concat(args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const A = Q(yield* ArraySpeciesCreate(obj, 0));
  let n = 0;
  const items = [obj, ...args];
  while (items.length > 0) {
    const E = items.shift()!;
    const spreadable = Q(yield* IsConcatSpreadable(E));
    __ts_cast__<ObjectValue>(E);
    if (spreadable) {
      let k = 0;
      const length = Q(yield* LengthOfArrayLike(E));
      if (n + length > (2 ** 53) - 1) {
        return Throw.TypeError('Cannot make length of array-like object surpass the bounds of an integer index');
      }
      while (k < length) {
        const P = X(ToString(F(k)));
        const exists = Q(yield* HasProperty(E, P));
        if (exists) {
          const subElement = Q(yield* Get(E, P));
          const nStr = X(ToString(F(n)));
          Q(yield* CreateDataPropertyOrThrow(A, nStr, subElement));
        }
        n += 1;
        k += 1;
      }
    } else {
      if (n >= (2 ** 53) - 1) {
        return Throw.TypeError('Cannot make length of array-like object surpass the bounds of an integer index');
      }
      const nStr = X(ToString(F(n)));
      Q(yield* CreateDataPropertyOrThrow(A, nStr, E));
      n += 1;
    }
  }
  Q(yield* Set(A, 'length', F(n), true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.copywithin */
function* ArrayProto_copyWithin([target = Value.undefined, start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  let to = Q(yield* ToClampedIndex(target, length));
  let from = Q(yield* ToClampedIndex(start, length));
  const final = end === Value.undefined ? length : Q(yield* ToClampedIndex(end, length));
  let count = Math.min(final - from, length - to);
  let direction;
  if (from < to && to < from + count) {
    direction = -1;
    from += count - 1;
    to += count - 1;
  } else {
    direction = 1;
  }
  while (count > 0) {
    const fromKey: string = X(ToString(F(from)));
    const toKey: string = X(ToString(F(to)));
    const fromPresent = Q(yield* HasProperty(obj, fromKey));
    if (fromPresent) {
      const fromVal = Q(yield* Get(obj, fromKey));
      Q(yield* Set(obj, toKey, fromVal, true));
    } else {
      Q(yield* DeletePropertyOrThrow(obj, toKey));
    }
    from += direction;
    to += direction;
    count -= 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-array.prototype.entries */
function ArrayProto_entries(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = Q(ToObject(thisValue));
  return CreateArrayIterator(obj, 'key+value');
}

/** https://tc39.es/ecma262/#sec-array.prototype.every */
function* ArrayProto_every([callbackFn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackFn)) {
    return Throw.TypeError('$1 is not a function', callbackFn);
  }
  let k = 0;
  while (k < length) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, propertyKey));
      const testResult = ToBoolean(Q(yield* Call(callbackFn, thisArg, [kValue, F(k), obj])));
      if (!testResult) {
        return Value.false;
      }
    }
    k += 1;
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-array.prototype.fill */
function* ArrayProto_fill([value = Value.undefined, start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  let k = Q(yield* ToClampedIndex(start, length));
  const final = end === Value.undefined ? length : Q(yield* ToClampedIndex(end, length));
  while (k < final) {
    const Pk: string = X(ToString(F(k)));
    Q(yield* Set(obj, Pk, value, true));
    k += 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-array.prototype.filter */
function* ArrayProto_filter([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackfn)) {
    return Throw.TypeError('$1 is not a function', callbackfn);
  }
  const A = Q(yield* ArraySpeciesCreate(obj, 0));
  let k = 0;
  let to = 0;
  while (k < length) {
    const Pk = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, Pk));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, Pk));
      const selected = ToBoolean(Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj])));
      if (selected) {
        Q(yield* CreateDataPropertyOrThrow(A, X(ToString(F(to))), kValue));
        to += 1;
      }
    }
    k += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.find */
function* ArrayProto_find([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'ascending', predicate, thisArg));
  return findRecord.Value;
}

/** https://tc39.es/ecma262/#sec-array.prototype.findindex */
function* ArrayProto_findIndex([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'ascending', predicate, thisArg));
  return findRecord.Index;
}

/** https://tc39.es/ecma262/#sec-array.prototype.findlast */
function* ArrayProto_findLast([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'descending', predicate, thisArg));
  return findRecord.Value;
}

/** https://tc39.es/ecma262/#sec-array.prototype.findlastindex */
function* ArrayProto_findLastIndex([predicate = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const findRecord = Q(yield* FindViaPredicate(obj, BigInt(length), 'descending', predicate, thisArg));
  return findRecord.Index;
}

/** https://tc39.es/ecma262/#sec-findviapredicate */
export function* FindViaPredicate(obj: ObjectValue, length: Integer, direction: 'ascending' | 'descending', predicate: Value, thisArg: Value): PlainEvaluator<{ Index: NumberValue, Value: Value }> {
  if (!IsCallable(predicate)) return Throw.TypeError('$1 is not a function', predicate);
  const len = Number(length);
  let k = direction === 'ascending' ? 0 : len - 1;
  const _step = direction === 'ascending' ? 1 : -1;
  while (direction === 'ascending' ? k < len : k >= 0) {
    const propertyKey = X(ToString(F(k)));
    // NOTE: If obj is a TypedArray, the following invocation of Get will return a normal completion.
    const kValue = Q(yield* Get(obj, propertyKey));
    const testResult = Q(yield* Call(predicate, thisArg, [kValue, F(k), obj]));
    if (ToBoolean(testResult)) {
      return { Index: F(k), Value: kValue };
    }
    k += _step;
  }
  return { Index: F(-1), Value: Value.undefined };
}

/** https://tc39.es/ecma262/#sec-array.prototype.flat */
function* ArrayProto_flat([depth = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const sourceLen = Q(yield* LengthOfArrayLike(obj));
  let depthNum = 1;
  if (depth !== Value.undefined) {
    depthNum = Q(yield* ToIntegerOrInfinity(depth));
  }
  const A = Q(yield* ArraySpeciesCreate(obj, 0));
  Q(yield* FlattenIntoArray(A, obj, sourceLen, 0, depthNum));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.flatmap */
function* ArrayProto_flatMap([mapperFunction = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const sourceLen = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(mapperFunction)) {
    return Throw.TypeError('$1 is not a function', mapperFunction);
  }
  const A = Q(yield* ArraySpeciesCreate(obj, 0));
  Q(yield* FlattenIntoArray(A, obj, sourceLen, 0, 1, mapperFunction, thisArg));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.foreach */
function* ArrayProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackfn)) {
    return Throw.TypeError('$1 is not a function', callbackfn);
  }
  let k = 0;
  while (k < length) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, propertyKey));
      Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj]));
    }
    k += 1;
  }
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-array.prototype.includes */
function* ArrayProto_includes([searchElement = Value.undefined, fromIndex = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (length === 0) {
    return Value.false;
  }
  let k = Q(yield* ToClampedIndex(fromIndex, length));
  while (k < length) {
    const elementK = Q(yield* Get(obj, X(ToString(F(k)))));
    if (SameValueZero(searchElement, elementK)) return Value.true;
    k += 1;
  }
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-array.prototype.indexof */
function* ArrayProto_indexOf([searchElement = Value.undefined, fromIndex = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (length === 0) return F(-1);
  let k = Q(yield* ToClampedIndex(fromIndex, length));
  while (k < length) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const elementK = Q(yield* Get(obj, propertyKey));
      if (IsStrictlyEqual(searchElement, elementK)) return F(k);
    }
    k += 1;
  }
  return F(-1);
}

/** https://tc39.es/ecma262/#sec-flattenintoarray */
export function* FlattenIntoArray(target: ObjectValue, source: ObjectValue, sourceLen: number, start: number, depth: number, mapperFunction?: FunctionObject, thisArg?: Value): PlainEvaluator<number> {
  Assert(target instanceof ObjectValue);
  Assert(source instanceof ObjectValue);
  Assert(sourceLen >= 0);
  Assert(start >= 0);
  // Assert: _depth_ is an integer Number, *+&infin;*, or *-&infin;*.
  // Assert(mapperFunction === undefined || (X(IsCallable(mapperFunction)) === Value.true && thisArg !== undefined && depth === 1));
  let targetIndex = start;
  let sourceIndex = 0;
  while (sourceIndex < sourceLen) {
    const P = X(ToString(F(sourceIndex)));
    const exists = Q(yield* HasProperty(source, P));
    if (exists) {
      let element = Q(yield* Get(source, P));
      if (mapperFunction) {
        Assert(!!thisArg);
        element = Q(yield* Call(mapperFunction, thisArg, [element, F(sourceIndex), source]));
      }
      let shouldFlatten = false;
      if (depth > 0) {
        shouldFlatten = Q(IsArray(element));
      }
      if (shouldFlatten) {
        const elementLen = Q(yield* LengthOfArrayLike(element as ObjectValue));
        targetIndex = Q(yield* FlattenIntoArray(target, element as ObjectValue, elementLen, targetIndex, depth - 1));
      } else {
        if (targetIndex >= (2 ** 53) - 1) {
          return Throw.TypeError('$1 is out of range', targetIndex);
        }
        Q(yield* CreateDataPropertyOrThrow(target, X(ToString(F(targetIndex))), element));
        targetIndex += 1;
      }
    }
    sourceIndex += 1;
  }
  return targetIndex;
}


/** https://tc39.es/ecma262/#sec-array.prototype.join */
function* ArrayProto_join([separator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  let separatorString;
  if (separator === Value.undefined) separatorString = ',';
  else separatorString = Q(yield* ToString(separator));
  let result = '';
  let k = 0;
  while (k < length) {
    if (k > 0) result = `${result}${separatorString}`;
    const element = Q(yield* Get(obj, X(ToString(F(k)))));
    if (element !== Value.undefined && element !== Value.null) {
      const elementString = Q(yield* ToString(element));
      result += elementString;
    }
    k += 1;
  }
  return Value(result);
}

/** https://tc39.es/ecma262/#sec-array.prototype.keys */
function ArrayProto_keys(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = Q(ToObject(thisValue));
  return CreateArrayIterator(obj, 'key');
}

/** https://tc39.es/ecma262/#sec-array.prototype.lastindexof */
function* ArrayProto_lastIndexOf([searchElement = Value.undefined, fromIndex]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (length === 0) return F(-1);
  let k: number;
  if (fromIndex === undefined) k = length - 1;
  else k = Math.min(Q(yield* ToAbsoluteIndex(fromIndex, length)), length - 1);
  while (k >= 0) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const elementK = Q(yield* Get(obj, propertyKey));
      if (IsStrictlyEqual(searchElement, elementK)) return F(k);
    }
    k -= 1;
  }
  return F(-1);
}

/** https://tc39.es/ecma262/#sec-array.prototype.map */
function* ArrayProto_map([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackfn)) {
    return Throw.TypeError('$1 is not a function', callbackfn);
  }
  const A = Q(yield* ArraySpeciesCreate(obj, length));
  let k = 0;
  while (k < length) {
    const Pk = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, Pk));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, Pk));
      const mappedValue = Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj]));
      Q(yield* CreateDataPropertyOrThrow(A, Pk, mappedValue));
    }
    k += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.pop */
function* ArrayProto_pop(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (length === 0) {
  Q(yield* Set(obj, 'length', F(+0), true));
    return Value.undefined;
  } else {
    const newLen = length - 1;
    const index = Q(yield* ToString(F(newLen)));
    const element = Q(yield* Get(obj, index));
    Q(yield* DeletePropertyOrThrow(obj, index));
  Q(yield* Set(obj, 'length', F(newLen), true));
    return element;
  }
}

/** https://tc39.es/ecma262/#sec-array.prototype.push */
function* ArrayProto_push(_items: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const items = [..._items];
  const obj = Q(ToObject(thisValue));
  let len = Q(yield* LengthOfArrayLike(obj));
  const argCount = items.length;
  if (len + argCount > (2 ** 53) - 1) {
    return Throw.TypeError('Cannot make length of array-like object surpass the bounds of an integer index');
  }
  while (items.length > 0) {
    const E = items.shift()!;
    Q(yield* Set(obj, X(ToString(F(len))), E, true));
    len += 1;
  }
  Q(yield* Set(obj, 'length', F(len), true));
  return F(len);
}

/** https://tc39.es/ecma262/#sec-array.prototype.reduce */
function* ArrayProto_reduce([callbackfn = Value.undefined, initialValue]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackfn)) return Throw.TypeError('$1 is not a function', callbackfn);
  if (length === 0 && initialValue === undefined) return Throw.TypeError('Cannot reduce an empty array with no initial value');
  let k = 0;
  let accumulator: Value = Value.undefined;
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    let kPresent = false;
    while (!kPresent && k < length) {
      const propertyKey = X(ToString(F(k)));
      kPresent = Q(yield* HasProperty(obj, propertyKey));
      if (kPresent) {
        accumulator = Q(yield* Get(obj, propertyKey));
      }
      k += 1;
    }
    if (!kPresent) return Throw.TypeError('Cannot reduce an empty array with no initial value');
  }
  while (k < length) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, propertyKey));
      accumulator = Q(yield* Call(callbackfn, Value.undefined, [accumulator, kValue, F(k), obj]));
    }
    k += 1;
  }
  return accumulator;
}

/** https://tc39.es/ecma262/#sec-array.prototype.reduceright */
function* ArrayProto_reduceRight([callbackfn = Value.undefined, initialValue]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackfn)) return Throw.TypeError('$1 is not a function', callbackfn);
  if (length === 0 && initialValue === undefined) return Throw.TypeError('Cannot reduce an empty array with no initial value');
  let k = length - 1;
  let accumulator: Value = Value.undefined;
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    let kPresent = false;
    while (!kPresent && k >= 0) {
      const propertyKey = X(ToString(F(k)));
      kPresent = Q(yield* HasProperty(obj, propertyKey));
      if (kPresent) {
        accumulator = Q(yield* Get(obj, propertyKey));
      }
      k -= 1;
    }
    if (!kPresent) return Throw.TypeError('Cannot reduce an empty array with no initial value');
  }
  while (k >= 0) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, propertyKey));
      accumulator = Q(yield* Call(callbackfn, Value.undefined, [accumulator, kValue, F(k), obj]));
    }
    k -= 1;
  }
  return accumulator;
}

/** https://tc39.es/ecma262/#sec-array.prototype.reverse */
function* ArrayProto_reverse(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const middle = Math.floor(length / 2);
  let lower = 0;
  while (lower !== middle) {
    const upper = length - lower - 1;
    const upperP = X(ToString(F(upper)));
    const lowerP = X(ToString(F(lower)));
    const lowerExists = Q(yield* HasProperty(obj, lowerP));
    let lowerValue: Value | undefined;
    let upperValue: Value | undefined;
    if (lowerExists) {
      lowerValue = Q(yield* Get(obj, lowerP));
    }
    const upperExists = Q(yield* HasProperty(obj, upperP));
    if (upperExists) {
      upperValue = Q(yield* Get(obj, upperP));
    }
    if (lowerExists && upperExists) {
      Q(yield* Set(obj, lowerP, upperValue!, true));
      Q(yield* Set(obj, upperP, lowerValue!, true));
    } else if (!lowerExists && upperExists) {
      Q(yield* Set(obj, lowerP, upperValue!, true));
      Q(yield* DeletePropertyOrThrow(obj, upperP));
    } else if (lowerExists && !upperExists) {
      Q(yield* DeletePropertyOrThrow(obj, lowerP));
      Q(yield* Set(obj, upperP, lowerValue!, true));
    } else {
      // No action is required
    }
    lower += 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-array.prototype.shift */
function* ArrayProto_shift(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (length === 0) {
  Q(yield* Set(obj, 'length', F(+0), true));
    return Value.undefined;
  }
  const first = Q(yield* Get(obj, '0'));
  let k = 1;
  while (k < length) {
    const from = X(ToString(F(k)));
    const to = X(ToString(F(k - 1)));
    const fromPresent = Q(yield* HasProperty(obj, from));
    if (fromPresent) {
      const fromVal = Q(yield* Get(obj, from));
      Q(yield* Set(obj, to, fromVal, true));
    } else {
      Q(yield* DeletePropertyOrThrow(obj, to));
    }
    k += 1;
  }
  Q(yield* DeletePropertyOrThrow(obj, X(ToString(F(length - 1)))));
  Q(yield* Set(obj, 'length', F(length - 1), true));
  return first;
}

/** https://tc39.es/ecma262/#sec-array.prototype.slice */
function* ArrayProto_slice([start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  let k = Q(yield* ToClampedIndex(start, length));
  const final = end === Value.undefined ? length : Q(yield* ToClampedIndex(end, length));
  const count = Math.max(final - k, 0);
  const A = Q(yield* ArraySpeciesCreate(obj, count));
  let n = 0;
  while (k < final) {
    const Pk: string = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, Pk));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, Pk));
      const nStr = X(ToString(F(n)));
      Q(yield* CreateDataPropertyOrThrow(A, nStr, kValue));
    }
    k += 1;
    n += 1;
  }
  Q(yield* Set(A, 'length', F(n), true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.some */
function* ArrayProto_some([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  if (!IsCallable(callbackfn)) return Throw.TypeError('callbackfn ($1) is not a function', callbackfn);
  let k = 0;
  while (k < length) {
    const propertyKey = X(ToString(F(k)));
    const kPresent = Q(yield* HasProperty(obj, propertyKey));
    if (kPresent) {
      const kValue = Q(yield* Get(obj, propertyKey));
      const testResult = ToBoolean(Q(yield* Call(callbackfn, thisArg, [kValue, F(k), obj])));
      if (testResult) return Value.true;
    }
    k += 1;
  }
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-array.prototype.sort */
function* ArrayProto_sort([comparator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  if (comparator !== Value.undefined && !IsCallable(comparator)) {
    return Throw.TypeError('comparator ($1) is not a function', comparator);
  }
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));

  const SortCompare = function* SortCompare(x: Value, y: Value) {
    return yield* CompareArrayElements(x, y, comparator);
  };
  const sortedList = Q(yield* SortIndexedProperties(obj, length, SortCompare, 'skip-holes'));
  const itemCount = sortedList.length;
  let j = 0;
  while (j < itemCount) {
    Q(yield* Set(obj, X(ToString(F(j))), sortedList[j], true));
    j += 1;
  }
  while (j < length) {
    Q(yield* DeletePropertyOrThrow(obj, X(ToString(F(j)))));
    j += 1;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-sortindexedproperties */
export function* SortIndexedProperties(obj: ObjectValue, len: number, SortCompare: (x: Value, y: Value) => ValueEvaluator<NumberValue>, holes: 'skip-holes' | 'read-through-holes'): PlainEvaluator<Value[]> {
  const items: Value[] = [];
  let k = 0;
  while (k < len) {
    const propertyKey = X(ToString(F(k)));
    let kRead: boolean;
    if (holes === 'skip-holes') {
      kRead = Q(yield* HasProperty(obj, propertyKey));
    } else {
      Assert(holes === 'read-through-holes');
      kRead = true;
    }
    if (kRead) {
      const kValue = Q(yield* Get(obj, propertyKey));
      items.push(kValue);
    }
    k += 1;
  }
  let completion: ValueCompletion<NumberValue> = NormalCompletion(Value(0));
  yield* sort(items, function* sort(a, b): PlainEvaluator<number> {
    if (completion instanceof ThrowCompletion) {
      return 0;
    }
    Assert(a && b && true);
    completion = yield* SortCompare(a, b);
    if (completion instanceof ThrowCompletion) {
      return 0;
    }
    return R(X(completion));
  });
  if (completion instanceof ThrowCompletion) {
    return completion;
  }
  return items;
}


/** https://tc39.es/ecma262/#sec-array.prototype.splice */
function* ArrayProto_splice(args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const [start = Value.undefined, deleteCount = Value.undefined, ...items] = args;
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const actualStart = Q(yield* ToClampedIndex(start, length));
  let insertCount;
  let actualDeleteCount;
  if (args.length === 0) {
    insertCount = 0;
    actualDeleteCount = 0;
  } else if (args.length === 1) {
    insertCount = 0;
    actualDeleteCount = length - actualStart;
    Assert(actualDeleteCount >= 0);
  } else {
    insertCount = args.length - 2;
    const dc = Q(yield* ToIntegerOrInfinity(deleteCount));
    actualDeleteCount = clamp(0, dc, length - actualStart);
  }
  if (length + insertCount - actualDeleteCount > (2 ** 53) - 1) {
    return Throw.TypeError('Cannot make length of array-like object surpass the bounds of an integer index');
  }
  const A = Q(yield* ArraySpeciesCreate(obj, actualDeleteCount));
  let k = 0;
  while (k < actualDeleteCount) {
    const from = X(ToString(F(actualStart + k)));
    const fromPresent = Q(yield* HasProperty(obj, from));
    if (fromPresent) {
      const fromValue = Q(yield* Get(obj, from));
      Q(yield* CreateDataPropertyOrThrow(A, X(ToString(F(k))), fromValue));
    }
    k += 1;
  }
  Q(yield* Set(A, 'length', F(actualDeleteCount), true));
  const itemCount = items.length;
  if (itemCount < actualDeleteCount) {
    k = actualStart;
    while (k < length - actualDeleteCount) {
      const from = X(ToString(F(k + actualDeleteCount)));
      const to = X(ToString(F(k + itemCount)));
      const fromPresent = Q(yield* HasProperty(obj, from));
      if (fromPresent) {
        const fromValue = Q(yield* Get(obj, from));
        Q(yield* Set(obj, to, fromValue, true));
      } else {
        Q(yield* DeletePropertyOrThrow(obj, to));
      }
      k += 1;
    }
    k = length;
    while (k > length - actualDeleteCount + itemCount) {
      Q(yield* DeletePropertyOrThrow(obj, X(ToString(F(k - 1)))));
      k -= 1;
    }
  } else if (itemCount > actualDeleteCount) {
    k = length - actualDeleteCount;
    while (k > actualStart) {
      const from = X(ToString(F(k + actualDeleteCount - 1)));
      const to = X(ToString(F(k + itemCount - 1)));
      const fromPresent = Q(yield* HasProperty(obj, from));
      if (fromPresent) {
        const fromValue = Q(yield* Get(obj, from));
        Q(yield* Set(obj, to, fromValue, true));
      } else {
        Q(yield* DeletePropertyOrThrow(obj, to));
      }
      k -= 1;
    }
  }
  k = actualStart;
  while (items.length > 0) {
    const E = items.shift()!;
    Q(yield* Set(obj, X(ToString(F(k))), E, true));
    k += 1;
  }
  Q(yield* Set(obj, 'length', F(length - actualDeleteCount + itemCount), true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.tolocalestring */
function* ArrayProto_toLocaleString(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const array = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(array));
  const separator = ',';
  let result = '';
  let k = 0;
  while (k < length) {
    if (k > 0) result = `${result}${separator}`;
    const element = Q(yield* Get(array, X(ToString(F(k)))));
    if (element !== Value.undefined && element !== Value.null) {
      const elementString = Q(yield* ToString(Q(yield* Invoke(element, 'toLocaleString'))));
      result += elementString;
    }
    k += 1;
  }
  return Value(result);
}

/** https://tc39.es/ecma262/#sec-array.prototype.toreversed */
function* ArrayProto_toReversed(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const A = Q(ArrayCreate(length));
  let k = 0;
  while (k < length) {
    const from = X(ToString(F(length - 1 - k)));
    const Pk = X(ToString(F(k)));
    const fromValue = Q(yield* Get(obj, from));
    X(CreateDataPropertyOrThrow(A, Pk, fromValue));
    k += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.tosorted */
function* ArrayProto_toSorted([comparator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  if (comparator !== Value.undefined && !IsCallable(comparator)) {
    return Throw.TypeError('$1 is not a function', comparator);
  }
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const A = Q(ArrayCreate(length));
  const SortCompare = function* SortCompare(x: Value, y: Value) {
    return yield* CompareArrayElements(x, y, comparator);
  };
  const sortedList = Q(yield* SortIndexedProperties(obj, length, SortCompare, 'read-through-holes'));
  let j = 0;
  while (j < length) {
    X(CreateDataPropertyOrThrow(A, X(ToString(F(j))), sortedList[j]));
    j += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.tospliced */
function* ArrayProto_toSpliced(args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const [start = Value.undefined, skipCount = Value.undefined, ...items] = args as Value[];
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const actualStart = Q(yield* ToClampedIndex(start, length));
  const maxSkipCount = length - actualStart;
  const insertCount = items.length;
  let actualSkipCount;
  if (args[0] === undefined) {
    actualSkipCount = 0;
  } else if (args[1] === undefined) {
    actualSkipCount = maxSkipCount;
  } else {
    actualSkipCount = clamp(0, Q(yield* ToIntegerOrInfinity(skipCount)), maxSkipCount);
  }
  const newLen = length - actualSkipCount + insertCount;
  if (newLen > (2 ** 53) - 1) {
    return Throw.TypeError('Cannot make length of array-like object surpass the bounds of an integer index');
  }
  Assert(newLen >= 0);
  const A = Q(ArrayCreate(newLen));
  let i = 0;
  let r = actualStart + actualSkipCount;
  while (i < actualStart) {
    const Pi = X(ToString(F(i)));
    const iValue = Q(yield* Get(obj, Pi));
    X(CreateDataPropertyOrThrow(A, Pi, iValue));
    i += 1;
  }
  for (const E of items) {
    const Pi = X(ToString(F(i)));
    X(CreateDataPropertyOrThrow(A, Pi, E));
    i += 1;
  }
  while (i < newLen) {
    const Pi = X(ToString(F(i)));
    const from = X(ToString(F(r)));
    const fromValue = Q(yield* Get(obj, from));
    X(CreateDataPropertyOrThrow(A, Pi, fromValue));
    i += 1;
    r += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.tostring */
function* ArrayProto_toString(_a: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const array = Q(ToObject(thisValue));
  let func = Q(yield* Get(array, 'join'));
  if (!IsCallable(func)) {
    func = surroundingAgent.intrinsic('%Object.prototype.toString%');
  }
  return Q(yield* Call(func, array));
}

/** https://tc39.es/ecma262/#sec-array.prototype.unshift */
function* ArrayProto_unshift(args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const argCount = args.length;
  if (argCount > 0) {
    if (length + argCount > (2 ** 53) - 1) {
      return Throw.TypeError('Cannot make length of array-like object surpass the bounds of an integer index');
    }
    let k = length;
    while (k > 0) {
      const from = X(ToString(F(k - 1)));
      const to = X(ToString(F(k + argCount - 1)));
      const fromPresent = Q(yield* HasProperty(obj, from));
      if (fromPresent) {
        const fromValue = Q(yield* Get(obj, from));
        Q(yield* Set(obj, to, fromValue, true));
      } else {
        Q(yield* DeletePropertyOrThrow(obj, to));
      }
      k -= 1;
    }
    let j = 0;
    const items = [...args];
    while (items.length !== 0) {
      const E = items.shift()!;
      const jStr = X(ToString(F(j)));
      Q(yield* Set(obj, jStr, E, true));
      j += 1;
    }
  }
  Q(yield* Set(obj, 'length', F(length + argCount), true));
  return F(length + argCount);
}

/** https://tc39.es/ecma262/#sec-array.prototype.values */
function ArrayProto_values(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  const obj = Q(ToObject(thisValue));
  return CreateArrayIterator(obj, 'value');
}

/** https://tc39.es/ecma262/#sec-array.prototype.with */
function* ArrayProto_with([index = Value.undefined, value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const obj = Q(ToObject(thisValue));
  const length = Q(yield* LengthOfArrayLike(obj));
  const actualIndex = Q(yield* ToAbsoluteIndex(index, length));
  if (actualIndex < 0 || actualIndex >= length) {
    return Throw.RangeError('$1 is out of range', index);
  }
  const A = Q(ArrayCreate(length));
  let k = 0;
  while (k < length) {
    const Pk = X(ToString(F(k)));
    let fromValue;
    if (k === actualIndex) {
      fromValue = value;
    } else {
      fromValue = Q(yield* Get(obj, Pk));
    }
    X(CreateDataPropertyOrThrow(A, Pk, fromValue));
    k += 1;
  }
  return A;
}

export function bootstrapArrayPrototype(realmRec: Realm) {
  const proto = X(ArrayCreate(0, realmRec.Intrinsics['%Object.prototype%']));

  assignProps(realmRec, proto, [
    ['at', ArrayProto_at, 1],
    ['concat', ArrayProto_concat, 1],
    ['copyWithin', ArrayProto_copyWithin, 2],
    ['entries', ArrayProto_entries, 0],
    ['every', ArrayProto_every, 1],
    ['fill', ArrayProto_fill, 1],
    ['filter', ArrayProto_filter, 1],
    ['find', ArrayProto_find, 1],
    ['findIndex', ArrayProto_findIndex, 1],
    ['findLast', ArrayProto_findLast, 1],
    ['findLastIndex', ArrayProto_findLastIndex, 1],
    ['flat', ArrayProto_flat, 0],
    ['flatMap', ArrayProto_flatMap, 1],
    ['forEach', ArrayProto_forEach, 1],
    ['includes', ArrayProto_includes, 1],
    ['indexOf', ArrayProto_indexOf, 1],
    ['join', ArrayProto_join, 1],
    ['keys', ArrayProto_keys, 0],
    ['lastIndexOf', ArrayProto_lastIndexOf, 1],
    ['map', ArrayProto_map, 1],
    ['pop', ArrayProto_pop, 0],
    ['push', ArrayProto_push, 1],
    ['reduce', ArrayProto_reduce, 1],
    ['reduceRight', ArrayProto_reduceRight, 1],
    ['reverse', ArrayProto_reverse, 0],
    ['shift', ArrayProto_shift, 0],
    ['slice', ArrayProto_slice, 2],
    ['some', ArrayProto_some, 1],
    ['sort', ArrayProto_sort, 1],
    ['splice', ArrayProto_splice, 2],
    ['toLocaleString', ArrayProto_toLocaleString, 0],
    ['toReversed', ArrayProto_toReversed, 0],
    ['toSorted', ArrayProto_toSorted, 1],
    ['toSpliced', ArrayProto_toSpliced, 2],
    ['toString', ArrayProto_toString, 0],
    ['unshift', ArrayProto_unshift, 1],
    ['values', ArrayProto_values, 0],
    ['with', ArrayProto_with, 2],
  ]);

  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, X(proto.GetOwnProperty(Value('values'))) as Descriptor));

  {
    const unscopableList = OrdinaryObjectCreate(Value.null);
    Assert(X(CreateDataProperty(unscopableList, 'at', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'copyWithin', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'entries', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'fill', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'find', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'findIndex', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'findLast', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'findLastIndex', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'flat', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'flatMap', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'includes', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'keys', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'toReversed', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'toSorted', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'toSpliced', Value.true)));
    Assert(X(CreateDataProperty(unscopableList, 'values', Value.true)));
    X(proto.DefineOwnProperty(wellKnownSymbols.unscopables, Descriptor({
      Value: unscopableList,
      Writable: false,
      Enumerable: false,
      Configurable: true,
    })));
  }

  // Used in `arguments` objects.
  realmRec.Intrinsics['%Array.prototype.values%'] = X(Get(proto, 'values')) as FunctionObject;

  realmRec.Intrinsics['%Array.prototype%'] = proto;
}
