import {
  ToBoolean,
  CreateBuiltinFunction,
  OrdinaryCreateFromConstructor,
} from '../engine.mjs';

import {
  New as NewValue,
} from '../value.mjs';

export function CreateBoolean(realmRec) {
  const booleanPrototype = realmRec.Intrinsics['%BooleanPrototype%'];

  const booleanConstructor = CreateBuiltinFunction((thisValue, argumentsList, NewTarget) => {
    const [value] = argumentsList;
    const b = ToBoolean(value);
    if (NewTarget.value === undefined) {
      return b;
    }
    const O = OrdinaryCreateFromConstructor(NewTarget, '%BooleanPrototype%', ['BooleanData']);
    O.BooleanData = b;
    return O;
  }, [], realmRec, booleanPrototype);

  booleanPrototype.DefineOwnProperty(NewValue(realmRec, 'constructor'), {
    Value: booleanConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  return booleanConstructor;
}
