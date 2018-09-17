import {
  ArrayExoticObjectValue,
  New as NewValue,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  IsConcatSpreadable,
  surroundingAgent,
} from '../engine.mjs';
import {
  ArrayCreate,
  Assert,
  Call,
  Construct,
  CreateArrayIterator,
  CreateBuiltinFunction,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  DeletePropertyOrThrow,
  Get,
  GetFunctionRealm,
  HasProperty,
  IsArray,
  IsCallable,
  IsConstructor,
  ObjectCreate,
  SameValue,
  SameValueZero,
  Set,
  SetFunctionLength,
  SetFunctionName,
  StrictEqualityComparision,
  ToBoolean,
  ToInteger,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
} from '../completion.mjs';

function ArraySpeciesCreate(originalArray, length) {
  Assert(Type(length) === 'Number' && length.numberValue() >= 0);
  const isArray = Q(IsArray(originalArray));
  if (isArray.isFalse()) {
    return Q(ArrayCreate(length));
  }
  let C = Q(Get(originalArray, NewValue('constructor')));
  if (IsConstructor(C) === true) {
    const thisRealm = surroundingAgent.currentRealmRecord;
    const realmC = Q(GetFunctionRealm(C));
    if (thisRealm !== realmC) {
      if (SameValue(C, realmC.Intrinsics['%Array%']) === true) {
        C = NewValue(undefined);
      }
    }
  }
  if (Type(C) === 'Object') {
    C = Q(Get(C, wellKnownSymbols.species));
    if (Type(C) === 'Null') {
      C = NewValue(undefined);
    }
  }
  if (Type(C) === 'Undefined') {
    return Q(ArrayCreate(length));
  }
  if (IsConstructor(C) === false) {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(Construct(C, [length]));
}

function ArrayProto_concat(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  const A = Q(ArraySpeciesCreate(O, NewValue(0)));
  let n = 0;
  const items = [O, ...args];
  while (items.length) {
    const E = items.shift();
    const spreadable = Q(IsConcatSpreadable(E));
    if (spreadable.isTrue()) {
      let k = 0;
      const len = Q(ToLength(Q(Get(E, NewValue('length')))));
      if (n + len.numberValue() > (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError');
      }
      while (k < len.numberValue()) {
        const P = X(ToString(NewValue(k)));
        const exists = Q(HasProperty(E, P));
        if (exists.isTrue()) {
          const subElement = Q(Get(E, P));
          Q(CreateDataPropertyOrThrow(A, X(ToString(NewValue(n))), subElement));
        }
        n += 1;
        k += 1;
      }
    } else {
      if (n >= (2 ** 53) - 1) {
        return surroundingAgent.Throw('TypeError');
      }
      Q(CreateDataPropertyOrThrow(A, X(ToString(NewValue(n))), E));
      n += 1;
    }
  }
  Q(Set(A, NewValue('length'), NewValue(n), NewValue(true)));
  return NewValue(true);
}

function ArrayProto_copyWithin([target, start, end], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length')))));
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
  if (Type(end) === 'Undefined') {
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
    const fromKey = X(ToString(NewValue(from)));
    const toKey = X(ToString(NewValue(to)));
    const fromPresent = Q(HasProperty(O, fromKey));
    if (fromPresent.isTrue()) {
      const fromVal = Q(Get(O, fromKey));
      Q(Set(O, toKey, fromVal, NewValue(true)));
    } else {
      Q(DeletePropertyOrThrow(O, toKey));
    }
    from += direction;
    to += direction;
    count -= 1;
  }
  return O;
}

function ArrayProto_entries(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key+value');
}

function ArrayProto_every([callbackFn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length')))));
  if (IsCallable(callbackFn).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  let T;
  if (thisArg instanceof Value) {
    T = thisArg;
  } else {
    T = NewValue(undefined);
  }
  let k = 0;
  while (k < len.numberValue()) {
    const Pk = X(ToString(NewValue(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent.isTrue()) {
      const kValue = Q(Get(O, Pk));
      const testResult = ToBoolean(Q(Call(callbackFn, T, [kValue, NewValue(k), O])));
      if (testResult.isFalse()) {
        return NewValue(false);
      }
    }
    k += 1;
  }
  return NewValue(true);
}

function ArrayProto_fill([value, start, end], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
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
    const Pk = X(ToString(k));
    Q(Set(O, Pk, value, NewValue(true)));
    k += 1;
  }
  return O;
}

function ArrayProto_filter([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (IsCallable(callbackfn).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
  }
  const T = thisArg || NewValue(undefined);
  const A = Q(ArraySpeciesCreate(O, 0));
  let k = 0;
  let to = 0;
  while (k < len) {
    const Pk = X(ToString(NewValue(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent.isTrue()) {
      const kValue = Q(Get(O, Pk));
      const selected = ToBoolean(Q(Call(callbackfn, T, [kValue, NewValue(k), O])));
      if (selected.isTrue()) {
        Q(CreateDataPropertyOrThrow(A, ToString(NewValue(to)), kValue));
        to += 1;
      }
    }
    k += 1;
  }
  return A;
}

function ArrayProto_find([predicate, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (IsCallable(predicate).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'predicate is not callable');
  }
  const T = thisArg || NewValue(undefined);
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(NewValue(k)));
    const kValue = Q(Get(O, Pk));
    const testResult = ToBoolean(Q(Call(predicate, T, [kValue, NewValue(k), O])));
    if (testResult.isTrue()) {
      return kValue;
    }
    k += 1;
  }
  return NewValue(undefined);
}

function ArrayProto_findIndex([predicate, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (IsCallable(predicate).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'predicate is not callable');
  }
  const T = thisArg || NewValue(undefined);
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(NewValue(k)));
    const kValue = Q(Get(O, Pk));
    const testResult = ToBoolean(Q(Call(predicate, T, [kValue, NewValue(k), O])));
    if (testResult.isTrue()) {
      return NewValue(k);
    }
    k += 1;
  }
  return NewValue(-1);
}

function ArrayProto_forEach([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (IsCallable(callbackfn).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
  }
  const T = thisArg || NewValue(undefined);
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(NewValue(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent.isTrue()) {
      const kValue = Q(Get(O, Pk));
      Q(Call(callbackfn, T, [kValue, NewValue(k), O]));
    }
    k += 1;
  }
  return NewValue(undefined);
}

function ArrayProto_includes([searchElement, fromIndex], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (len === 0) {
    return NewValue(false);
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
    const elementK = Q(Get(O, X(ToString(NewValue(k)))));
    if (SameValueZero(searchElement, elementK).isTrue()) {
      return NewValue(true);
    }
    k += 1;
  }
  return NewValue(false);
}

function ArrayProto_indexOf([searchElement, fromIndex = NewValue(0)], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (len === 0) {
    return NewValue(-1);
  }
  const n = Q(ToInteger(fromIndex)).numberValue();
  // Assert: If fromIndex is undefined, then n is 0.
  if (n >= len) {
    return NewValue(-1);
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
    const kPresent = Q(HasProperty(O, X(ToString(NewValue(k)))));
    if (kPresent.isTrue()) {
      const elementK = Get(O, X(ToString(NewValue(k))));
      const same = StrictEqualityComparision(searchElement, elementK);
      if (same.isTrue()) {
        return NewValue(k);
      }
    }
    k += 1;
  }
  return NewValue(-1);
}

function ArrayProto_join([separator = NewValue(undefined)], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
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
    const element = Q(Get(O, X(ToString(NewValue(k)))));
    let next;
    if (Type(element) === 'Undefined' || Type(element) === 'Null') {
      next = '';
    } else {
      next = Q(ToString(element)).stringValue();
    }
    R = `${R}${next}`;
    k += 1;
  }
  return NewValue(R);
}

function ArrayProto_keys(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key');
}

function ArrayProto_lastIndexOf([searchElement, fromIndex], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (len === 0) {
    return NewValue(-1);
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
    const kPresent = Q(HasProperty(O, X(ToString(NewValue(k)))));
    if (kPresent.isTrue()) {
      const elementK = Q(Get(O, X(ToString(NewValue(k)))));
      const same = StrictEqualityComparision(searchElement, elementK);
      if (same.isTrue()) {
        return NewValue(k);
      }
    }
    k -= 1;
  }
  return NewValue(-1);
}

function ArrayProto_map([callbackfn, thisArg], { thisValue }) {
  const O = Q(ToObject(thisValue));
  const len = Q(ToLength(Q(Get(O, NewValue('length'))))).numberValue();
  if (IsCallable(callbackfn).isFalse()) {
    return surroundingAgent.Throw('TypeError', 'callbackfn is not callable');
  }
  const T = thisArg || NewValue(undefined);
  const A = Q(ArraySpeciesCreate(O, 0));
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(NewValue(k)));
    const kPresent = Q(HasProperty(O, Pk));
    if (kPresent.isTrue()) {
      const kValue = Q(Get(O, Pk));
      const mappedValue = Q(Call(callbackfn, T, [kValue, NewValue(k), O]));
      Q(CreateDataPropertyOrThrow(A, Pk, mappedValue));
    }
    k += 1;
  }
  return A;
}

function ArrayProto_toString(a, { thisValue }) {
  const array = Q(ToObject(thisValue));
  let func = Q(Get(array, NewValue('join')));
  if (IsCallable(func).isFalse()) {
    func = surroundingAgent.intrinsic('%ObjProto_toString%');
  }
  return Q(Call(func, array));
}

function ArrayProto_values(args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'value');
}

export function CreateArrayPrototype(realmRec) {
  const proto = new ArrayExoticObjectValue();
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];
  proto.Extensible = true;
  proto.properties.set(NewValue('length'), {
    Value: NewValue(0),
    Writable: true,
    Enumerable: false,
    Configurable: false,
  });

  [
    ['concat', ArrayProto_concat, 1],
    ['copyWithin', ArrayProto_copyWithin, 2],
    ['entries', ArrayProto_entries, 0],
    ['every', ArrayProto_every, 1],
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
    // pop
    // push
    // reduce
    // reduceRight
    // reverse
    // shift
    // slice
    // some
    // sort
    // splice
    // toLocaleString
    ['toString', ArrayProto_toString, 0],
    // unshift
    ['values', ArrayProto_values, 0],
  ].forEach(([name, nativeFunction, length]) => {
    const fn = CreateBuiltinFunction(nativeFunction, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(length));
    proto.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  proto.DefineOwnProperty(wellKnownSymbols.iterator, proto.GetOwnProperty(NewValue('values')));

  {
    const unscopableList = ObjectCreate(NewValue(null));
    CreateDataProperty(unscopableList, NewValue('copyWithin'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('entries'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('fill'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('find'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('findIndex'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('includes'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('keys'), NewValue(true));
    CreateDataProperty(unscopableList, NewValue('values'), NewValue(true));
    X(proto.DefineOwnProperty(wellKnownSymbols.unscopables, {
      Value: unscopableList,
      Writable: false,
      Enumerable: false,
      Configurable: false,
    }));
  }

  realmRec.Intrinsics['%ArrayPrototype%'] = proto;

  realmRec.Intrinsics['%ArrayProto_keys%'] = proto.Get(NewValue('keys'), proto);
  realmRec.Intrinsics['%ArrayProto_entries%'] = proto.Get(NewValue('entries'), proto);
}
