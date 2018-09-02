import {
  ArrayValue,
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
  CreateDataPropertyOrThrow,
  DeletePropertyOrThrow,
  Get,
  GetFunctionRealm,
  HasProperty,
  IsArray,
  IsCallable,
  IsConstructor,
  SameValue,
  Set,
  SetFunctionLength,
  SetFunctionName,
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

function ArrayProto_concat(realm, args, { thisValue }) {
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

function ArrayProto_copyWithin(realm, [target, start, end], { thisValue }) {
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

function ArrayProto_entries(realm, args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key+value');
}

function ArrayProto_every(realm, [callbackFn, thisArg], { thisValue }) {
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

function ArrayProto_fill(realm, [value, start, end], { thisValue }) {
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

function ArrayProto_filter(realm, [callbackfn, thisArg], { thisValue }) {
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

function ArrayProto_find(realm, [predicate, thisArg], { thisValue }) {
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

function ArrayProto_findIndex(realm, [predicate, thisArg], { thisValue }) {
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

function ArrayProto_forEach(realm, [callbackfn, thisArg], { thisValue }) {
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

function ArrayProto_values(realm, args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'value');
}

export function CreateArrayPrototype(realmRec) {
  const proto = new ArrayValue(undefined, realmRec);

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

  realmRec.Intrinsics['%ArrayPrototype%'] = proto;

  realmRec.Intrinsics['%ArrayProto_entries%'] = proto.Get(NewValue('entries'));
}
