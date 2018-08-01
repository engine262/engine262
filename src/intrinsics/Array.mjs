import {
  currentRealmRecord,
  activeFunctionObject,
  Assert,
  IsArrayIndex,
  IsPropertyKey,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  CreateBuiltinFunction,
  GetPrototypeFromConstructor,
} from '../engine.mjs';

import {
  ObjectValue,
  ArrayValue,
} from '../value.mjs';

function ArraySetLength() {}

export function ArrayCreate(length, proto) {
  Assert(length >= 0);
  if (Object.is(length, -0)) {
    length = 0;
  }
  if (length > (2 ** 32) - 1) {
    currentRealmRecord().exception.RangeError();
  }
  if (proto === undefined) {
    proto = currentRealmRecord().Intrinsics['%ArrayPrototype%'];
  }
  const A = new ArrayValue(currentRealmRecord());
  // Set A's essential internal methods except for [[DefineOwnProperty]]
  // to the default ordinary object definitions specified in 9.1.
  A.DefineOwnProperty = function DefineOwnProperty(P, Desc) {
    Assert(IsPropertyKey(P));
    if (P.value === 'length') {
      return ArraySetLength(A, Desc);
    }

    if (IsArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, 'length');
    }

    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}

function ArrayConstructor(thisArgument, argumentsList, newTarget) {
  const numberOfArgs = argumentsList.length;
  if (numberOfArgs === 0) {
    // 22.1.1.1 Array ( )
    Assert(numberOfArgs === 0);
    if (newTarget.value === undefined) {
      newTarget = activeFunctionObject();
    }
    const proto = GetPrototypeFromConstructor(newTarget, '%ArrayPrototype%');
    return ArrayCreate(0, proto);
  }
}

export function CreateArray(realmRec) {
  const arrayPrototype = new ObjectValue(realmRec);
  const constructor = CreateBuiltinFunction(ArrayConstructor, [], realmRec, arrayPrototype);

  return constructor;
}
