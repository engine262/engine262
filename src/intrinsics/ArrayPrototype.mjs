import {
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
  GetFunctionRealm,
  HasProperty,
  IsArray,
  IsConstructor,
  SameValue,
  ToLength,
  ToObject,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
} from '../completion.mjs';

import { ArrayCreate } from './Array.mjs';

function ArraySpeciesCreate(originalArray, length) {
  Assert(Type(length) === 'Number' && length.value >= 0);
  const isArray = Q(IsArray(originalArray));
  if (isArray.isFalse()) {
    return Q(ArrayCreate(length));
  }
  let C = Q(Get(originalArray, 'constructor'));
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
    if (C instanceof NullValue) {
      C = NewValue(undefined);
    }
  }
  if (C instanceof UndefinedValue) {
    return Q(ArrayCreate(length));
  }
  if (IsConstructor(C) === false) {
    surroundingAgent.Throw('TypeError');
  }
  return Q(Construct(C, [length]));
}

function ArrayConcat(realm, args, { thisArgument }) {
  const O = Q(ToObject(thisArgument));
  const A = Q(ArraySpeciesCreate(O, 0));
  let n = 0;
  const items = [O, ...args];
  while (items.length) {
    const E = items.shift();
    const spreadable = Q(IsConcatSpreadable(E));
    if (spreadable.isTrue()) {
      let k = 0;
      const len = Q(ToLength(Q(Get(E, 'length'))));
      if (n + len > (2 ** 53) - 1) {
        surroundingAgent.Throw('TypeError');
      }
      while (k < len) {
        const P = X(ToString(k));
        const exists = Q(HasProperty(E, P));
        if (exists.isTrue()) {
          const subElement = Q(Get(E, P));
          Q(CreateDataPropertyOrThrow(A, X(ToString(n)), subElement));
        }
        n += 1;
        k += 1;
      }
    } else {
      if (n >= (2 ** 53) - 1) {
        surroundingAgent.Throw('TypeError');
      }
      Q(CreateDataPropertyOrThrow(A, X(ToString(n)), E));
      n += 1;
    }
  }
  Q(Set(A, NewValue('length'), NewValue(n), NewValue(true)));
  return NewValue(true);
}

export function CreateArrayPrototype(realmRec) {
  const proto = new ArrayValue(realmRec);

  [
    ['concat', ArrayConcat],
  ].forEach(([name, nativeFunction]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(nativeFunction, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%ArrayPrototype%'] = proto;
}
