/* @flow */

/* ::
import type {
  NumberValue,
  ObjectValue,
} from '../value.mjs';
import type {
  Realm,
} from '../realm.mjs';
*/

import {
  Value,
  UndefinedValue,
  NullValue,
  ArrayValue,
  wellKnownSymbols,
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  surroundingAgent,
  IsConcatSpreadable,
} from '../engine.mjs';
import {
  Assert,
  Construct,
  CreateBuiltinFunction,
  CreateDataPropertyOrThrow,
  Get,
  Set,
  GetFunctionRealm,
  HasProperty,
  IsArray,
  IsConstructor,
  SameValue,
  ToLength,
  ToObject,
  ToString,
  ToInteger,
  DeletePropertyOrThrow,
  IsCallable,
  Call,
  ToBoolean,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
} from '../completion.mjs';

import { ArrayCreate } from './Array.mjs';

function ArraySpeciesCreate(originalArray, length /* : NumberValue */) {
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
    /* :: C = ((C: any): ObjectValue); */
    C = Q(Get(C, wellKnownSymbols.species));
    if (C instanceof NullValue) {
      C = NewValue(undefined);
    }
  }
  if (C instanceof UndefinedValue) {
    return Q(ArrayCreate(length));
  }
  if (IsConstructor(C) === false) {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(Construct(C, [length]));
}

function ArrayConcat(realm, args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  const A = Q(ArraySpeciesCreate(O, NewValue(0)));
  let n = 0;
  const items = [O, ...args];
  while (items.length) {
    const E = items.shift();
    const spreadable = Q(IsConcatSpreadable(E));
    if (spreadable.isTrue()) {
      /* :: E = ((E: any): ObjectValue); */
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

function ArrayCopyWithin(realm, [target, start, end], { thisValue }) {
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
  if (end instanceof UndefinedValue) {
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

function ArrayEntries(realm, args, { thisValue }) {
  const O = Q(ToObject(thisValue));
  return CreateArrayIterator(O, 'key+value');
}

function ArrayEvery(realm, [callbackFn, thisArg], { thisValue }) {
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

export function CreateArrayPrototype(realmRec /* : Realm */) {
  const proto = new ArrayValue(realmRec);

  [
    ['concat', ArrayConcat],
    ['copyWithin', ArrayCopyWithin],
    ['entries', ArrayEntries],
    ['every', ArrayEvery],
  ].forEach(([name, nativeFunction]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(nativeFunction, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%ArrayPrototype%'] = proto;

  realmRec.Intrinsics['%ArrayProto_entries%'] = proto.Get(NewValue('entries'));
}
