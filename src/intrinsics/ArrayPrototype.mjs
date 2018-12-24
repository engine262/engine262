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
  Invoke,
  IsCallable,
  IsConcatSpreadable,
  ObjectCreate,
  SameValueZero,
  Set,
  StrictEqualityComparison,
  ToBoolean,
  ToInteger,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { assignProps } from './Bootstrap.mjs';
import { CreateArrayPrototypeShared } from './ArrayPrototypeShared.mjs';

// 22.1.3.1 #sec-array.prototype.concat
function ArrayProto_concat(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  const A = Q(ArraySpeciesCreate(O, new Value(0)));
  let n = 0;
  const items = [O, ...args];
  while (items.length) {
    const E = items.shift();
    const spreadable = Q(IsConcatSpreadable(E));
    if (spreadable === Value.true) {
      let k = 0;
      const lenProp = Q(Get(E, new Value('length')));
      const len = Q(ToLength(lenProp));
      if (n + len.numberValue() > (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError');
      }
      while (k < len.numberValue()) {
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
        return surroundingAgent.Throw('TypeError');
      }
      const nStr = X(ToString(new Value(n)));
      Q(CreateDataPropertyOrThrow(A, nStr, E));
      n += 1;
    }
  }
  Q(Set(A, new Value('length'), new Value(n), Value.true));
  return Value.true;
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

// 22.1.3.8 #sec-array.prototype.find
function ArrayProto_find([predicate, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (IsCallable(predicate) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'predicate is not callable');
  }
  const T = thisArg || Value.undefined;
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kValue = Q(Get(O, Pk));
    const testResult = ToBoolean(Q(Call(predicate, T, [kValue, new Value(k), O])));
    if (testResult === Value.true) {
      return kValue;
    }
    k += 1;
  }
  return Value.undefined;
}

// 22.1.3.9 #sec-array.prototype.findindex
function ArrayProto_findIndex([predicate, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (IsCallable(predicate) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'predicate is not callable');
  }
  const T = thisArg || Value.undefined;
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kValue = Q(Get(O, Pk));
    const testResult = ToBoolean(Q(Call(predicate, T, [kValue, new Value(k), O])));
    if (testResult === Value.true) {
      return new Value(k);
    }
    k += 1;
  }
  return new Value(-1);
}

// 22.1.3.10 #sec-array.prototype.foreach
function ArrayProto_forEach([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
  }
  const T = thisArg || Value.undefined;
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      Q(Call(callbackfn, T, [kValue, new Value(k), O]));
    }
    k += 1;
  }
  return Value.undefined;
}

// 22.1.3.11 #sec-array.prototype.includes
function ArrayProto_includes([searchElement, fromIndex], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (len === 0) {
    return Value.false;
  }
  const n = fromIndex ? Q(ToInteger(fromIndex)) : 0;
  let k;
  if (n >= 0) {
    k = n;
  } else {
    k = len + n;
    if (k < 0) {
      k = 0;
    }
  }
  while (k < len) {
    const kStr = X(ToString(new Value(k)));
    const elementK = Q(Get(O, kStr));
    if (SameValueZero(searchElement, elementK) === Value.true) {
      return Value.true;
    }
    k += 1;
  }
  return Value.false;
}

// 22.1.3.12 #sec-array.prototype.indexof
function ArrayProto_indexOf([searchElement, fromIndex = Value.undefined], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  if (len === 0) {
    return new Value(-1);
  }
  const n = Q(ToInteger(fromIndex)).numberValue();
  // Assert: If fromIndex is undefined, then n is 0.
  Assert(!(fromIndex === Value.undefined) || n === 0);
  if (n >= len) {
    return new Value(-1);
  }
  let k;
  if (n >= 0) {
    if (Object.is(-0, n)) {
      k = 0;
    } else {
      k = n;
    }
  } else {
    k = len + n;
    if (k < 0) {
      k = 0;
    }
  }
  while (k < len) {
    const kPresent = Q(HasProperty(O, X(ToString(new Value(k)))));
    if (kPresent === Value.true) {
      const elementK = Q(Get(O, X(ToString(new Value(k)))));
      const same = StrictEqualityComparison(searchElement, elementK);
      if (same === Value.true) {
        return new Value(k);
      }
    }
    k += 1;
  }
  return new Value(-1);
}

// 22.1.3.13 #sec-array.prototype.join
function ArrayProto_join([separator = Value.undefined], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  let sep;
  if (Type(separator) === 'Undefined') {
    sep = ',';
  } else {
    sep = Q(ToString(separator)).stringValue();
  }
  let R = '';
  let k = 0;
  while (k < len) {
    if (k > 0) {
      R = `${R}${sep}`;
    }
    const kStr = X(ToString(new Value(k)));
    const element = Q(Get(O, kStr));
    let next;
    if (Type(element) === 'Undefined' || Type(element) === 'Null') {
      next = '';
    } else {
      next = Q(ToString(element)).stringValue();
    }
    R = `${R}${next}`;
    k += 1;
  }
  return new Value(R);
}

// 22.1.3.14 #sec-array.prototype.keys
function ArrayProto_keys(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key');
}

// 22.1.3.15 #sec-array.prototype.lastindexof
function ArrayProto_lastIndexOf([searchElement, fromIndex], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const lenProp = Q(Get(O, new Value('length')));
  const len = Q(ToLength(lenProp)).numberValue();
  if (len === 0) {
    return new Value(-1);
  }
  let n;
  if (fromIndex !== undefined) {
    n = Q(ToInteger(fromIndex)).numberValue();
  } else {
    n = len - 1;
  }
  let k;
  if (n >= 0) {
    if (Object.is(n, -0)) {
      k = 0;
    } else {
      k = Math.min(n, len - 1);
    }
  } else {
    k = len + n;
  }
  while (k >= 0) {
    const kStr = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, kStr));
    if (kPresent === Value.true) {
      const elementK = Q(Get(O, kStr));
      const same = StrictEqualityComparison(searchElement, elementK);
      if (same === Value.true) {
        return new Value(k);
      }
    }
    k -= 1;
  }
  return new Value(-1);
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
    return surroundingAgent.Throw('TypeError', 'Invalid array length');
  }
  while (items.length > 0) {
    const E = items.shift();
    Q(Set(O, X(ToString(new Value(len))), E, Value.true));
    len += 1;
  }
  Q(Set(O, new Value('length'), new Value(len), Value.true));
  return new Value(len);
}

// 22.1.3.19 #sec-array.prototype.reduce
function ArrayProto_reduce([callbackfn, initialValue], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError');
  }
  if (len === 0 && initialValue === undefined) {
    return surroundingAgent.Throw('TypeError', 'Reduce of empty array with no initial value');
  }
  let k = 0;
  let accumulator = Value.undefined;
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    let kPresent = false;
    while (kPresent === false && k < len) {
      const Pk = X(ToString(new Value(k)));
      kPresent = Q(HasProperty(O, Pk)) === Value.true;
      if (kPresent === true) {
        accumulator = Q(Get(O, Pk));
      }
      k += 1;
    }
    if (kPresent === false) {
      return surroundingAgent.Throw('TypeError');
    }
  }
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      accumulator = Q(Call(callbackfn, Value.undefined, [accumulator, kValue, new Value(k), O]));
    }
    k += 1;
  }
  return accumulator;
}

// 22.1.3.20 #sec-array.prototype.reduceright
function ArrayProto_reduceRight([callbackfn, initialValue], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError');
  }
  if (len === 0 && initialValue === undefined) {
    return surroundingAgent.Throw('TypeError', 'Reduce of empty array with no initial value');
  }
  let k = len - 1;
  let accumulator = Value.undefined;
  if (initialValue !== undefined) {
    accumulator = initialValue;
  } else {
    let kPresent = false;
    while (kPresent === false && k >= 0) {
      const Pk = X(ToString(new Value(k)));
      kPresent = Q(HasProperty(O, Pk)) === Value.true;
      if (kPresent === true) {
        accumulator = Q(Get(O, Pk));
      }
      k -= 1;
    }
    if (kPresent === false) {
      return surroundingAgent.Throw('TypeError');
    }
  }
  while (k >= 0) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      accumulator = Q(Call(callbackfn, Value.undefined, [accumulator, kValue, new Value(k), O]));
    }
    k -= 1;
  }
  return accumulator;
}

// 22.1.3.21 #sec-array.prototype.reverse
function ArrayProto_reverse(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  const middle = Math.floor(len / 2);
  let lower = 0;
  while (lower !== middle) {
    const upper = len - lower - 1;
    const upperP = X(ToString(new Value(upper)));
    const lowerP = X(ToString(new Value(lower)));
    const lowerExists = Q(HasProperty(O, lowerP));
    let lowerValue;
    let upperValue;
    if (lowerExists === Value.true) {
      lowerValue = Q(Get(O, lowerP));
    }
    const upperExists = Q(HasProperty(O, upperP));
    if (upperExists === Value.true) {
      upperValue = Q(Get(O, upperP));
    }
    if (lowerExists === Value.true && upperExists === Value.true) {
      Q(Set(O, lowerP, upperValue, Value.true));
      Q(Set(O, upperP, lowerValue, Value.true));
    } else if (lowerExists === Value.false && upperExists === Value.true) {
      Q(Set(O, lowerP, upperValue, Value.true));
      Q(DeletePropertyOrThrow(O, upperP));
    } else if (lowerExists === Value.true && upperExists === Value.false) {
      Q(DeletePropertyOrThrow(O, lowerP));
      Q(Set(O, upperP, lowerValue, Value.true));
    } else {
      // no further action is required
    }
    lower += 1;
  }
  return O;
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

// 22.1.3.24 #sec-array.prototype.some
function ArrayProto_some([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, new Value('length'))))).numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError');
  }
  let T;
  if (thisArg !== undefined) {
    T = thisArg;
  } else {
    T = Value.undefined;
  }
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent === Value.true) {
      const kValue = Q(Get(O, Pk));
      const testResult = ToBoolean(Q(Call(callbackfn, T, [kValue, new Value(k), O])));
      if (testResult === Value.true) {
        return Value.true;
      }
    }
    k += 1;
  }
  return Value.true;
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

// 22.1.3.27 #sec-array.prototype.tolocalestring
function ArrayProto_toLocaleString(args, { thisValue }) {
  const array = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(array, new Value('length'))))).numberValue();
  const separator = ', ';
  let R = '';
  let k = 0;
  while (k < len) {
    if (k > 0) {
      R = `${R}${separator}`;
    }
    const nextElement = Q(Get(array, X(ToString(new Value(k)))));
    if (Type(nextElement) !== 'Undefined' && Type(nextElement) !== 'Null') {
      const S = Q(Invoke(nextElement, new Value('toLocaleString')));
      R = `${R}${S}`;
    }
    k += 1;
  }
  return R;
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
    ['find', ArrayProto_find, 1],
    ['findIndex', ArrayProto_findIndex, 1],
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
    ['reverse', ArrayProto_reverse, 1],
    ['shift', ArrayProto_shift, 0],
    ['slice', ArrayProto_slice, 2],
    ['some', ArrayProto_some, 1],
    // sort
    ['splice', ArrayProto_splice, 2],
    ['toLocaleString', ArrayProto_toLocaleString, 0],
    ['toString', ArrayProto_toString, 0],
    // unshift
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
