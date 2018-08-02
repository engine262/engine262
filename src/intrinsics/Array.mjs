import {
  surroundingAgent,
  Assert,
  CreateBuiltinFunction,
  GetPrototypeFromConstructor,
} from '../engine.mjs';

import {
  ArrayValue,
  New as NewValue,
} from '../value.mjs';

export function ArrayCreate(length, proto) {
  Assert(length >= 0);
  if (Object.is(length, -0)) {
    length = 0;
  }
  if (length > (2 ** 32) - 1) {
    surroundingAgent.Throw('RangeError');
  }
  if (proto === undefined) {
    proto = surroundingAgent.currentRealmRecord.Intrinsics['%ArrayPrototype%'];
  }
  const A = new ArrayValue(surroundingAgent.currentRealmRecord);

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
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    return ArrayCreate(0, proto);
  }
}

export function CreateArray(realmRec) {
  const constructor = CreateBuiltinFunction(ArrayConstructor, [], realmRec);

  constructor.DefineOwnProperty(NewValue('constructor'), {
    Value: realmRec.Intrinsics['%ArrayPrototype%'],
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%ArrayPrototype%'].DefineOwnProperty(
    NewValue('constructor'), {
      Value: constructor,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    },
  );

  realmRec.Intrinsics['%Array%'] = constructor;
}
