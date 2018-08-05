/* @flow */

/* ::
import type {
  NumberValue,
} from '../value.mjs';
*/

import {
  surroundingAgent,
} from '../engine.mjs';

import {
  Assert,
  CreateBuiltinFunction,
  GetPrototypeFromConstructor,
} from '../abstract-ops/all.mjs';

import {
  ArrayValue,
  UndefinedValue,
  New as NewValue,
} from '../value.mjs';

export function ArrayCreate(length /* : NumberValue */, proto) {
  Assert(length.numberValue() >= 0);
  if (Object.is(length.numberValue(), -0)) {
    length = NewValue(0);
  }
  if (length.numberValue() > (2 ** 32) - 1) {
    surroundingAgent.Throw('RangeError');
  }
  if (proto instanceof UndefinedValue) {
    proto = surroundingAgent.intrinsic('%ArrayPrototype%');
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
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    return ArrayCreate(NewValue(0), proto);
  }
}

export function CreateArray(realmRec /* : Realm */) {
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
