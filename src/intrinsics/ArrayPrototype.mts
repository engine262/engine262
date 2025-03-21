import { surroundingAgent } from '../engine.mts';
import {
  BooleanValue,
  Descriptor,
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
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
  IsArray,
  IsCallable,
  IsConcatSpreadable,
  Set,
  CompareArrayElements,
  LengthOfArrayLike,
  OrdinaryObjectCreate,
  ToBoolean,
  ToIntegerOrInfinity,
  ToObject,
  ToString,
  F,
  Realm,
  type FunctionObject,
} from '../abstract-ops/all.mts';
import { Q, X, type ExpressionCompletion } from '../completion.mts';
import { __ts_cast__ } from '../helpers.mts';
import { assignProps } from './bootstrap.mts';
import { ArrayProto_sortBody, bootstrapArrayPrototypeShared } from './ArrayPrototypeShared.mts';

/** https://tc39.es/ecma262/#sec-array.prototype.concat */
function ArrayProto_concat(args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const A = Q(ArraySpeciesCreate(O, 0));
  let n = 0;
  const items = [O, ...args];
  while (items.length > 0) {
    const E = items.shift()!;
    const spreadable = Q(IsConcatSpreadable(E));
    __ts_cast__<ObjectValue>(E);
    if (spreadable === Value.true) {
      let k = 0;
      const len = Q(LengthOfArrayLike(E));
      if (n + len > (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength');
      }
      while (k < len) {
        const P = X(ToString(F(k)));
        const exists = Q(HasProperty(E, P));
        if (exists === Value.true) {
          const subElement = Q(Get(E, P));
          const nStr = X(ToString(F(n)));
          Q(CreateDataPropertyOrThrow(A, nStr, subElement));
        }
        n += 1;
        k += 1;
      }
    } else {
      if (n >= (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength');
      }
      const nStr = X(ToString(F(n)));
      Q(CreateDataPropertyOrThrow(A, nStr, E));
      n += 1;
    }
  }
  Q(Set(A, Value('length'), F(n), Value.true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.copywithin */
function ArrayProto_copyWithin([target = Value.undefined, start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  const relativeTarget = Q(ToIntegerOrInfinity(target));
  let to;
  if (relativeTarget < 0) {
    to = Math.max(len + relativeTarget, 0);
  } else {
    to = Math.min(relativeTarget, len);
  }
  const relativeStart = Q(ToIntegerOrInfinity(start));
  let from;
  if (relativeStart < 0) {
    from = Math.max(len + relativeStart, 0);
  } else {
    from = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  let count = Math.min(final - from, len - to);
  let direction;
  if (from < to && to < from + count) {
    direction = -1;
    from += count - 1;
    to += count - 1;
  } else {
    direction = 1;
  }
  while (count > 0) {
    const fromKey = X(ToString(F(from)));
    const toKey = X(ToString(F(to)));
    const fromPresent = Q(HasProperty(O, fromKey));
    if (fromPresent === Value.true) {
      const fromVal = Q(Get(O, fromKey));
      Q(Set(O, toKey, fromVal, Value.true));
    } else {
      Q(DeletePropertyOrThrow(O, toKey));
    }
    from += direction;
    to += direction;
    count -= 1;
  }
  return O;
}

/** https://tc39.es/ecma262/#sec-array.prototype.entries */
function ArrayProto_entries(_args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key+value');
}

/** https://tc39.es/ecma262/#sec-array.prototype.fill */
function ArrayProto_fill([value = Value.undefined, start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  const relativeStart = Q(ToIntegerOrInfinity(start));
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (end instanceof UndefinedValue) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  while (k < final) {
    const Pk = X(ToString(F(k)));
    Q(Set(O, Pk, value, Value.true));
    k += 1;
  }
  return O;
}

/** https://tc39.es/ecma262/#sec-array.prototype.filter */
function ArrayProto_filter([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  const A = Q(ArraySpeciesCreate(O, 0));
  let k = 0;
  let to = 0;
  while (k < len) {
    const Pk = X(ToString(F(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      const selected = ToBoolean(Q(Call(callbackfn, thisArg, [kValue, F(k), O])));
      if (selected === Value.true) {
        Q(CreateDataPropertyOrThrow(A, X(ToString(F(to))), kValue));
        to += 1;
      }
    }
    k += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-flattenintoarray */
function FlattenIntoArray(target: ObjectValue, source: ObjectValue, sourceLen: number, start: number, depth: number, mapperFunction?: FunctionObject, thisArg?: Value) {
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
    const exists = Q(HasProperty(source, P));
    if (exists === Value.true) {
      let element = Q(Get(source, P));
      if (mapperFunction) {
        Assert(!!thisArg);
        element = Q(Call(mapperFunction, thisArg, [element, F(sourceIndex), source]));
      }
      let shouldFlatten: BooleanValue = Value.false;
      if (depth > 0) {
        shouldFlatten = Q(IsArray(element));
      }
      if (shouldFlatten === Value.true) {
        const elementLen = Q(LengthOfArrayLike(element as ObjectValue));
        targetIndex = Q(FlattenIntoArray(target, element as ObjectValue, elementLen, targetIndex, depth - 1));
      } else {
        if (targetIndex >= (2 ** 53) - 1) {
          return surroundingAgent.Throw('TypeError', 'OutOfRange', targetIndex);
        }
        Q(CreateDataPropertyOrThrow(target, X(ToString(F(targetIndex))), element));
        targetIndex += 1;
      }
    }
    sourceIndex += 1;
  }
  return targetIndex;
}

/** https://tc39.es/ecma262/#sec-array.prototype.flat */
function ArrayProto_flat([depth = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const sourceLen = Q(LengthOfArrayLike(O));
  let depthNum = 1;
  if (depth !== Value.undefined) {
    depthNum = Q(ToIntegerOrInfinity(depth));
  }
  const A = Q(ArraySpeciesCreate(O, 0));
  Q(FlattenIntoArray(A, O, sourceLen, 0, depthNum));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.flatmap */
function ArrayProto_flatMap([mapperFunction = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const sourceLen = Q(LengthOfArrayLike(O));
  if (X(IsCallable(mapperFunction)) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', mapperFunction);
  }
  const A = Q(ArraySpeciesCreate(O, 0));
  Q(FlattenIntoArray(A, O, sourceLen, 0, 1, mapperFunction as FunctionObject, thisArg));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.keys */
function ArrayProto_keys(_args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key');
}

/** https://tc39.es/ecma262/#sec-array.prototype.map */
function ArrayProto_map([callbackfn = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  const A = Q(ArraySpeciesCreate(O, len));
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(F(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      const mappedValue = Q(Call(callbackfn, thisArg, [kValue, F(k), O]));
      Q(CreateDataPropertyOrThrow(A, Pk, mappedValue));
    }
    k += 1;
  }
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.pop */
function ArrayProto_pop(_args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  if (len === 0) {
    Q(Set(O, Value('length'), F(+0), Value.true));
    return Value.undefined;
  } else {
    const newLen = len - 1;
    const index = Q(ToString(F(newLen)));
    const element = Q(Get(O, index));
    Q(DeletePropertyOrThrow(O, index));
    Q(Set(O, Value('length'), F(newLen), Value.true));
    return element;
  }
}

/** https://tc39.es/ecma262/#sec-array.prototype.push */
function ArrayProto_push(_items: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const items = [..._items];
  const O = Q(ToObject(thisValue));
  let len = Q(LengthOfArrayLike(O));
  const argCount = items.length;
  if (len + argCount > (2 ** 53) - 1) {
    return surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength');
  }
  while (items.length > 0) {
    const E = items.shift()!;
    Q(Set(O, X(ToString(F(len))), E, Value.true));
    len += 1;
  }
  Q(Set(O, Value('length'), F(len), Value.true));
  return F(len);
}

/** https://tc39.es/ecma262/#sec-array.prototype.shift */
function ArrayProto_shift(_args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  if (len === 0) {
    Q(Set(O, Value('length'), F(+0), Value.true));
    return Value.undefined;
  }
  const first = Q(Get(O, Value('0')));
  let k = 1;
  while (k < len) {
    const from = X(ToString(F(k)));
    const to = X(ToString(F(k - 1)));
    const fromPresent = Q(HasProperty(O, from));
    if (fromPresent === Value.true) {
      const fromVal = Q(Get(O, from));
      Q(Set(O, to, fromVal, Value.true));
    } else {
      Q(DeletePropertyOrThrow(O, to));
    }
    k += 1;
  }
  Q(DeletePropertyOrThrow(O, X(ToString(F(len - 1)))));
  Q(Set(O, Value('length'), F(len - 1), Value.true));
  return first;
}

/** https://tc39.es/ecma262/#sec-array.prototype.slice */
function ArrayProto_slice([start = Value.undefined, end = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  const relativeStart = Q(ToIntegerOrInfinity(start));
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (end instanceof UndefinedValue) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  const count = Math.max(final - k, 0);
  const A = Q(ArraySpeciesCreate(O, count));
  let n = 0;
  while (k < final) {
    const Pk = X(ToString(F(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      const nStr = X(ToString(F(n)));
      Q(CreateDataPropertyOrThrow(A, nStr, kValue));
    }
    k += 1;
    n += 1;
  }
  Q(Set(A, Value('length'), F(n), Value.true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.sort */
function ArrayProto_sort([comparefn = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  if (comparefn !== Value.undefined && IsCallable(comparefn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', comparefn);
  }
  const obj = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(obj));

  return ArrayProto_sortBody(obj, len, (x, y) => CompareArrayElements(x, y, comparefn as UndefinedValue | FunctionObject));
}

/** https://tc39.es/ecma262/#sec-array.prototype.splice */
function ArrayProto_splice(args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const [start = Value.undefined, deleteCount = Value.undefined, ...items] = args;
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  const relativeStart = Q(ToIntegerOrInfinity(start));
  let actualStart;
  if (relativeStart < 0) {
    actualStart = Math.max(len + relativeStart, 0);
  } else {
    actualStart = Math.min(relativeStart, len);
  }
  let insertCount;
  let actualDeleteCount;
  if (args.length === 0) {
    insertCount = 0;
    actualDeleteCount = 0;
  } else if (args.length === 1) {
    insertCount = 0;
    actualDeleteCount = len - actualStart;
  } else {
    insertCount = args.length - 2;
    const dc = Q(ToIntegerOrInfinity(deleteCount));
    actualDeleteCount = Math.min(Math.max(dc, 0), len - actualStart);
  }
  if (len + insertCount - actualDeleteCount > (2 ** 53) - 1) {
    return surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength');
  }
  const A = Q(ArraySpeciesCreate(O, actualDeleteCount));
  let k = 0;
  while (k < actualDeleteCount) {
    const from = X(ToString(F(actualStart + k)));
    const fromPresent = Q(HasProperty(O, from));
    if (fromPresent === Value.true) {
      const fromValue = Q(Get(O, from));
      Q(CreateDataPropertyOrThrow(A, X(ToString(F(k))), fromValue));
    }
    k += 1;
  }
  Q(Set(A, Value('length'), F(actualDeleteCount), Value.true));
  const itemCount = items.length;
  if (itemCount < actualDeleteCount) {
    k = actualStart;
    while (k < len - actualDeleteCount) {
      const from = X(ToString(F(k + actualDeleteCount)));
      const to = X(ToString(F(k + itemCount)));
      const fromPresent = Q(HasProperty(O, from));
      if (fromPresent === Value.true) {
        const fromValue = Q(Get(O, from));
        Q(Set(O, to, fromValue, Value.true));
      } else {
        Q(DeletePropertyOrThrow(O, to));
      }
      k += 1;
    }
    k = len;
    while (k > len - actualDeleteCount + itemCount) {
      Q(DeletePropertyOrThrow(O, X(ToString(F(k - 1)))));
      k -= 1;
    }
  } else if (itemCount > actualDeleteCount) {
    k = len - actualDeleteCount;
    while (k > actualStart) {
      const from = X(ToString(F(k + actualDeleteCount - 1)));
      const to = X(ToString(F(k + itemCount - 1)));
      const fromPresent = Q(HasProperty(O, from));
      if (fromPresent === Value.true) {
        const fromValue = Q(Get(O, from));
        Q(Set(O, to, fromValue, Value.true));
      } else {
        Q(DeletePropertyOrThrow(O, to));
      }
      k -= 1;
    }
  }
  k = actualStart;
  while (items.length > 0) {
    const E = items.shift()!;
    Q(Set(O, X(ToString(F(k))), E, Value.true));
    k += 1;
  }
  Q(Set(O, Value('length'), F(len - actualDeleteCount + itemCount), Value.true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.prototype.tostring */
function ArrayProto_toString(_a: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const array = Q(ToObject(thisValue));
  let func = Q(Get(array, Value('join')));
  if (IsCallable(func) === Value.false) {
    func = surroundingAgent.intrinsic('%Object.prototype.toString%');
  }
  return Q(Call(func, array));
}

/** https://tc39.es/ecma262/#sec-array.prototype.unshift */
function ArrayProto_unshift(args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  const len = Q(LengthOfArrayLike(O));
  const argCount = args.length;
  if (argCount > 0) {
    if (len + argCount > (2 ** 53) - 1) {
      return surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength');
    }
    let k = len;
    while (k > 0) {
      const from = X(ToString(F(k - 1)));
      const to = X(ToString(F(k + argCount - 1)));
      const fromPresent = Q(HasProperty(O, from));
      if (fromPresent === Value.true) {
        const fromValue = Q(Get(O, from));
        Q(Set(O, to, fromValue, Value.true));
      } else {
        Q(DeletePropertyOrThrow(O, to));
      }
      k -= 1;
    }
    let j = 0;
    const items = [...args];
    while (items.length !== 0) {
      const E = items.shift()!;
      const jStr = X(ToString(F(j)));
      Q(Set(O, jStr, E, Value.true));
      j += 1;
    }
  }
  Q(Set(O, Value('length'), F(len + argCount), Value.true));
  return F(len + argCount);
}

/** https://tc39.es/ecma262/#sec-array.prototype.values */
function ArrayProto_values(_args: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'value');
}

/** https://tc39.es/ecma262/#sec-array.prototype.at */
function ArrayProto_at([index = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ExpressionCompletion {
  // 1. Let O be ? ToObject(this value).
  const O = Q(ToObject(thisValue));
  // 2. Let len be ? LengthOfArrayLike(O).
  const len = Q(LengthOfArrayLike(O));
  // 3. Let relativeIndex be ? ToIntegerOrInfinity(index).
  const relativeIndex = Q(ToIntegerOrInfinity(index));
  let k;
  // 4. If relativeIndex ≥ 0, then
  if (relativeIndex >= 0) {
    // a. Let k be relativeIndex.
    k = relativeIndex;
  } else { // 5. Else,
    // a. Let k be len + relativeIndex.
    k = len + relativeIndex;
  }
  // 6. If k < 0 or k ≥ len, then return undefined.
  if (k < 0 || k >= len) {
    return Value.undefined;
  }
  // 7. Return ? Get(O, ! ToString(k)).
  return Q(Get(O, X(ToString(F(k)))));
}

export function bootstrapArrayPrototype(realmRec: Realm) {
  const proto = X(ArrayCreate(0, realmRec.Intrinsics['%Object.prototype%']));

  assignProps(realmRec, proto, [
    ['concat', ArrayProto_concat, 1],
    ['copyWithin', ArrayProto_copyWithin, 2],
    ['entries', ArrayProto_entries, 0],
    ['fill', ArrayProto_fill, 1],
    ['filter', ArrayProto_filter, 1],
    ['flat', ArrayProto_flat, 0],
    ['flatMap', ArrayProto_flatMap, 1],
    ['at', ArrayProto_at, 1],
    ['keys', ArrayProto_keys, 0],
    ['map', ArrayProto_map, 1],
    ['pop', ArrayProto_pop, 0],
    ['push', ArrayProto_push, 1],
    ['shift', ArrayProto_shift, 0],
    ['slice', ArrayProto_slice, 2],
    ['sort', ArrayProto_sort, 1],
    ['splice', ArrayProto_splice, 2],
    ['toString', ArrayProto_toString, 0],
    ['unshift', ArrayProto_unshift, 1],
    ['values', ArrayProto_values, 0],
  ]);

  bootstrapArrayPrototypeShared(
    realmRec,
    proto,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => { },
    (O) => LengthOfArrayLike(O),
  );

  proto.DefineOwnProperty(wellKnownSymbols.iterator, X(proto.GetOwnProperty(Value('values'))) as Descriptor);

  {
    const unscopableList = OrdinaryObjectCreate(Value.null);
    Assert(X(CreateDataProperty(unscopableList, Value('copyWithin'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('entries'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('fill'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('find'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('findLast'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('findIndex'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('findLastIndex'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('flat'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('flatMap'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('includes'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('keys'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, Value('values'), Value.true)) === Value.true);
    X(proto.DefineOwnProperty(wellKnownSymbols.unscopables, Descriptor({
      Value: unscopableList,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  // Used in `arguments` objects.
  realmRec.Intrinsics['%Array.prototype.values%'] = X(Get(proto, Value('values'))) as FunctionObject;

  realmRec.Intrinsics['%Array.prototype%'] = proto;
}
