import {
  ArrayValue,
  New as NewValue,
} from '../value.mjs';

import {
  surroundingAgent,

  Assert,
  Type,

  SameValue,

  IsConstructor,
  IsConcatSpreadable,
  IsArray,

  ToObject,
  ToString,
  ToLength,

  GetFunctionRealm,

  HasProperty,
  Get,

  Construct,

  CreateDataPropertyOrThrow,

  CreateBuiltinFunction,
} from '../engine.mjs';

import { ArrayCreate } from './Array.mjs';

function ArraySpeciesCreate(originalArray, length) {
  Assert(Type(length) === 'Number' && length.value >= 0);
  const isArray = IsArray(originalArray);
  if (isArray === false) {
    return ArrayCreate(length);
  }
  let C = Get(originalArray, 'constructor');
  if (IsConstructor(C) === true) {
    const thisRealm = surroundingAgent.currentRealmRecord;
    const realmC = GetFunctionRealm(C);
    if (thisRealm !== realmC) {
      if (SameValue(C, realmC.Intrinsics['%Array%']) === true) {
        C = NewValue(undefined);
      }
    }
  }
  if (Type(C) === 'Object') {
    C = Get(C, C.realm.Intrinsics['@@species']);
    if (C.value === null) {
      C = NewValue(undefined);
    }
  }
  if (C.value === undefined) {
    return ArrayCreate(length);
  }
  if (IsConstructor(C) === false) {
    C.realm.exception.TypeError();
  }
  return Construct(C, [length]);
}

function ArrayConcat(realm, args, { thisArgument }) {
  const O = ToObject(thisArgument);
  const A = ArraySpeciesCreate(O, 0);
  let n = 0;
  const items = [O, ...args];
  while (items.length) {
    const E = items.shift();
    const spreadable = IsConcatSpreadable(E);
    if (spreadable === true) {
      let k = 0;
      const len = ToLength(Get(E, 'length'));
      if (n + len > (2 ** 53) - 1) {
        realm.exception.TypeError();
      }
      while (k < len) {
        const P = ToString(k);
        const exists = HasProperty(E, P);
        if (exists === true) {
          const subElement = Get(E, P);
          CreateDataPropertyOrThrow(A, ToString(n), subElement);
        }
        n += 1;
        k += 1;
      }
    } else {
      if (n >= (2 ** 53) - 1) {
        realm.exception.TypeError();
      }
      CreateDataPropertyOrThrow(A, ToString(n), E);
      n += 1;
    }
  }
  Set(A, 'length', n, true);
  return true;
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
