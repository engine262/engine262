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
  New as NewValue,
} from '../value.mjs';

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

  return A;
}

function ArrayConstructor(realm, argumentsList, { NewTarget }) {
  const numberOfArgs = argumentsList.length;
  if (numberOfArgs === 0) {
    // 22.1.1.1 Array ( )
    Assert(numberOfArgs === 0);
    if (NewTarget.value === undefined) {
      NewTarget = activeFunctionObject();
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    return ArrayCreate(0, proto);
  }
}

export function CreateArray(realmRec) {
  const constructor = CreateBuiltinFunction(ArrayConstructor, [], realmRec);

  realmRec.Intrinsics['%ArrayPrototype%'].DefineOwnProperty(
    NewValue(realmRec, 'constructor'), {
      Value: constructor,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    },
  );

  realmRec.Intrinsics['%Array%'] = constructor;
}
