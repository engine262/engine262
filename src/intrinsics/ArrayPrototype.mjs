import { surroundingAgent } from '../engine.mjs';
import {
  ArrayExoticObjectValue,
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  ArraySpeciesCreate,
  Assert,
  Call,
  CreateArrayIterator,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  DeletePropertyOrThrow,
  Get,
  HasProperty,
  IsCallable,
  IsConcatSpreadable,
  ObjectCreate,
  Set,
  SortCompare,
  ToBoolean,
  ToInteger,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { msg } from '../helpers.mjs';
import { assignProps } from './Bootstrap.mjs';
import { ArrayProto_sortBody, CreateArrayPrototypeShared } from './ArrayPrototypeShared.mjs';

// 22.1.3.1 #sec-array.prototype.concat
function ArrayProto_concat(args, { thisValue, callLength }) {
  const O = Q(ToObject(thisValue));
  const A = Q(ArraySpeciesCreate(O, new Value(0)));
  let n = 0;
  // TODO(27)
  const items = [O, ...args.slice(0, callLength)];
  while (items.length > 0) {
    const E = items.shift();
    const spreadable = Q(IsConcatSpreadable(E));
    if (spreadable === Value.true) {
      let k = 0;
      const lenProp = Q(Get(E, new Value('length')));
      const len = Q(ToLength(lenProp)).numberValue();
      if (n + len > (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError', msg('ArrayPastSafeLength'));
      }
      while (k < len) {
        const P = X(ToString(new Value(k)));
        const exists = Q(HasProperty(E, P));
        if (exists === Value.true) {
          const subElement = Q(Get(E, P));
          const nStr = X(ToString(new Value(n)));
          Q(CreateDataPropertyOrThrow(A, nStr, subElement));
        }
        n += 1;
        k += 1;
      }
    } else {
      if (n >= (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError', msg('ArrayPastSafeLength'));
      }
      const nStr = X(ToString(new Value(n)));
      Q(CreateDataPropertyOrThrow(A, nStr, E));
      n += 1;
    }
  }
  Q(Set(A, new Value('length'), new Value(n), Value.true));
  return A;
}

// 22.1.3.3 #sec-array.prototype.copywithin
function ArrayProto_copyWithin([target, start, end = Value.undefined], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp));
  const relativeTarget = Q(ToInteger(target));
  let to;
  if (relativeTarget.numberValue() < 0) {
    to = Math.max(len.numberValue() + relativeTarget.numberValue(), 0);
  } else {
    to = Math.min(relativeTarget.numberValue(), len.numberValue());
  }
  const relativeStart = Q(ToInteger(start));
  let from;
  if (relativeStart.numberValue() < 0) {
    from = Math.max(len.numberValue() + relativeStart.numberValue(), 0);
  } else {
    from = Math.min(relativeStart.numberValue(), len.numberValue());
  }
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToInteger(end));
  }
  let final;
  if (relativeEnd.numberValue() < 0) {
    final = Math.max(len.numberValue() + relativeEnd.numberValue(), 0);
  } else {
    final = Math.min(relativeEnd.numberValue(), len.numberValue());
  }
  let count = Math.min(final - from, len.numberValue() - to);
  let direction;
  if (from < to && to < from + count) {
    direction = -1;
    from += count - 1;
    to += count - 1;
  } else {
    direction = 1;
  }
  while (count > 0) {
    const fromKey = X(ToString(new Value(from)));
    const toKey = X(ToString(new Value(to)));
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

// 22.1.3.4 #sec-array.prototype.entries
function ArrayProto_entries(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key+value');
}

// 22.1.3.6 #sec-array.prototype.fill
function ArrayProto_fill([value, start = Value.undefined, end = Value.undefined], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  const relativeStart = Q(ToInteger(start)).numberValue();
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (Type(end) === 'Undefined') {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToInteger(end)).numberValue();
  }
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  while (k < final) {
    const Pk = X(ToString(new Value(k)));
    Q(Set(O, Pk, value, Value.true));
    k += 1;
  }
  return O;
}

// 22.1.3.7 #sec-array.prototype.filter
function ArrayProto_filter([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
  }
  const T = thisArg || Value.undefined;
  const A = Q(ArraySpeciesCreate(O, new Value(0)));
  let k = 0;
  let to = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      const selected = ToBoolean(Q(Call(callbackfn, T, [kValue, new Value(k), O])));
      if (selected === Value.true) {
        Q(CreateDataPropertyOrThrow(A, ToString(new Value(to)), kValue));
        to += 1;
      }
    }
    k += 1;
  }
  return A;
}

// 22.1.3.14 #sec-array.prototype.keys
function ArrayProto_keys(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key');
}

// 22.1.3.16 #sec-array.prototype.map
function ArrayProto_map([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
  }
  const T = thisArg || Value.undefined;
  const A = Q(ArraySpeciesCreate(O, new Value(0)));
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      const mappedValue = Q(Call(callbackfn, T, [kValue, new Value(k), O]));
      Q(CreateDataPropertyOrThrow(A, Pk, mappedValue));
    }
    k += 1;
  }
  return A;
}

// 22.1.3.17 #sec-array.prototype.pop
function ArrayProto_pop(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  if (len === 0) {
    Q(Set(O, new Value('length'), new Value(0), Value.true));
    return Value.undefined;
  } else {
    const newLen = len - 1;
    const index = Q(ToString(new Value(newLen)));
    const element = Q(Get(O, index));
    Q(DeletePropertyOrThrow(O, index));
    Q(Set(O, new Value('length'), new Value(newLen), Value.true));
    return element;
  }
}

// 22.1.3.18 #sec-array.prototype.push
function ArrayProto_push([...items], { thisValue }) {
  const O = Q(ToObject(thisValue));
  let len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  const argCount = items.length;
  if (len + argCount > (2 ** 53) - 1) {
    return surroundingAgent.Throw('TypeError', msg('ArrayPastSafeLength'));
  }
  while (items.length > 0) {
    const E = items.shift();
    Q(Set(O, X(ToString(new Value(len))), E, Value.true));
    len += 1;
  }
  Q(Set(O, new Value('length'), new Value(len), Value.true));
  return new Value(len);
}

// 22.1.3.22 #sec-array.prototype.shift
function ArrayProto_shift(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  if (len === 0) {
    Q(Set(O, new Value('length'), new Value(0), Value.true));
    return Value.undefined;
  }
  const first = Q(Get(O, new Value('0')));
  let k = 1;
  while (k < len) {
    const from = X(ToString(new Value(k)));
    const to = X(ToString(new Value(k - 1)));
    const fromPresent = Q(HasProperty(O, from));
    if (fromPresent === Value.true) {
      const fromVal = Q(Get(O, from));
      Q(Set(O, to, fromVal, Value.true));
    } else {
      Q(DeletePropertyOrThrow(O, to));
    }
    k += 1;
  }
  Q(DeletePropertyOrThrow(O, X(ToString(new Value(len - 1)))));
  Q(Set(O, new Value('length'), new Value(len - 1), Value.true));
  return first;
}

// 22.1.3.23 #sec-array.prototype.slice
function ArrayProto_slice([start, end], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  const relativeStart = Q(ToInteger(start)).numberValue();
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (Type(end) === 'Undefined') {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToInteger(end)).numberValue();
  }
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  const count = Math.max(final - k, 0);
  const A = Q(ArraySpeciesCreate(O, new Value(count)));
  let n = 0;
  while (k < final) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      Q(CreateDataPropertyOrThrow(A, X(ToString(new Value(n))), kValue));
    }
    k += 1;
    n += 1;
  }
  Q(Set(A, new Value('length'), new Value(n), Value.true));
  return A;
}

// 22.1.3.25 #sec-array.prototype.sort
function ArrayProto_sort([comparefn], { thisValue }) {
  if (comparefn !== Value.undefined && IsCallable(comparefn) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAFunction', comparefn));
  }
  const obj = Q(ToObject(thisValue));
  const lenProp = Q(Get(obj, new Value('length')));
  const len = Q(ToLength(lenProp));

  return ArrayProto_sortBody(obj, len, (x, y) => SortCompare(x, y, comparefn));
}

// 22.1.3.26 #sec-array.prototype.splice
function ArrayProto_splice([start, deleteCount, ...items], { thisValue, callLength }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  const relativeStart = Q(ToInteger(start)).numberValue();
  let actualStart;
  if (relativeStart < 0) {
    actualStart = Math.max(len + relativeStart, 0);
  } else {
    actualStart = Math.min(relativeStart, len);
  }
  let insertCount;
  let actualDeleteCount;
  if (callLength === 0) {
    insertCount = 0;
    actualDeleteCount = 0;
  } else if (callLength === 1) {
    insertCount = 0;
    actualDeleteCount = len - actualStart;
  } else {
    insertCount = callLength - 2;
    const dc = Q(ToInteger(deleteCount)).numberValue();
    actualDeleteCount = Math.min(Math.max(dc, 0), len - actualStart);
  }
  if (len + insertCount - actualDeleteCount > (2 ** 53) - 1) {
    return surroundingAgent.Throw('TypeError');
  }
  const A = Q(ArraySpeciesCreate(O, new Value(actualDeleteCount)));
  let k = 0;
  while (k < actualDeleteCount) {
    const from = X(ToString(new Value(actualStart + k)));
    const fromPresent = Q(HasProperty(O, from));
    if (fromPresent === Value.true) {
      const fromValue = Q(Get(O, from));
      Q(CreateDataPropertyOrThrow(A, X(ToString(new Value(k))), fromValue));
    }
    k += 1;
  }
  Q(Set(A, new Value('length'), new Value(actualDeleteCount), Value.true));
  const itemCount = items.length;
  if (itemCount < actualDeleteCount) {
    k = actualStart;
    while (k < len - actualDeleteCount) {
      const from = X(ToString(new Value(k + actualDeleteCount)));
      const to = X(ToString(new Value(k + itemCount)));
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
      Q(DeletePropertyOrThrow(O, X(ToString(new Value(k - 1)))));
      k -= 1;
    }
  } else if (itemCount > actualDeleteCount) {
    k = len - actualDeleteCount;
    while (k > actualStart) {
      const from = X(ToString(new Value(k + actualDeleteCount - 1)));
      const to = X(ToString(new Value(k + itemCount - 1)));
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
    const E = items.shift();
    Q(Set(O, X(ToString(new Value(k))), E, Value.true));
    k += 1;
  }
  Q(Set(O, new Value('length'), new Value(len - actualDeleteCount + itemCount), Value.true));
  return A;
}

// 22.1.3.28 #sec-array.prototype.tostring
function ArrayProto_toString(a, { thisValue }) {
  const array = Q(ToObject(thisValue));
  let func = Q(Get(array, new Value('join')));
  if (IsCallable(func) === Value.false) {
    func = surroundingAgent.intrinsic('%ObjProto_toString%');
  }
  return Q(Call(func, array));
}

// #sec-array.prototype.unshift
function ArrayProto_unshift(args, { thisValue, callLength }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  const argCount = callLength;
  if (argCount > 0) {
    if (len + argCount > (2 ** 53) - 1) {
      return surroundingAgent.Throw('TypeError', msg('ArrayPastSafeLength'));
    }
    let k = len;
    while (k > 0) {
      const from = X(ToString(new Value(k - 1)));
      const to = X(ToString(new Value(k + argCount - 1)));
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
      const E = items.shift();
      const jStr = X(ToString(new Value(j)));
      Q(Set(O, jStr, E, Value.true));
      j += 1;
    }
  }
  Q(Set(O, new Value('length'), new Value(len + argCount), Value.true));
  return new Value(len + argCount);
}

// 22.1.3.30 #sec-array.prototype.values
function ArrayProto_values(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'value');
}

export function CreateArrayPrototype(realmRec) {
  const proto = new ArrayExoticObjectValue();
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];
  proto.Extensible = Value.true;
  proto.properties.set(new Value('length'), Descriptor({
    Value: new Value(0),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  assignProps(realmRec, proto, [
    ['concat', ArrayProto_concat, 1],
    ['copyWithin', ArrayProto_copyWithin, 2],
    ['entries', ArrayProto_entries, 0],
    ['fill', ArrayProto_fill, 1],
    ['filter', ArrayProto_filter, 1],
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

  CreateArrayPrototypeShared(
    realmRec,
    proto,
    () => {},
    (O) => Get(O, new Value('length')),
  );

  proto.DefineOwnProperty(wellKnownSymbols.iterator, proto.GetOwnProperty(new Value('values')));

  {
    const unscopableList = ObjectCreate(Value.null);
    Assert(X(CreateDataProperty(unscopableList, new Value('copyWithin'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('entries'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('fill'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('find'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('findIndex'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('includes'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('keys'), Value.true)) === Value.true);
    Assert(X(CreateDataProperty(unscopableList, new Value('values'), Value.true)) === Value.true);
    X(proto.DefineOwnProperty(wellKnownSymbols.unscopables, Descriptor({
      Value: unscopableList,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  realmRec.Intrinsics['%ArrayPrototype%'] = proto;

  realmRec.Intrinsics['%ArrayProto_keys%'] = proto.Get(new Value('keys'), proto);
  realmRec.Intrinsics['%ArrayProto_entries%'] = proto.Get(new Value('entries'), proto);
  realmRec.Intrinsics['%ArrayProto_values%'] = proto.Get(new Value('values'), proto);
}
