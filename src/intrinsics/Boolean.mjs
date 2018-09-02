import {
  CreateBuiltinFunction,
  OrdinaryCreateFromConstructor,
  ToBoolean,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
} from '../value.mjs';
import { Q } from '../completion.mjs';

function BooleanConstructor([value], { NewTarget }) {
  const b = ToBoolean(value);
  if (NewTarget.value === undefined) {
    return b;
  }
  const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%BooleanPrototype%', ['BooleanData']));
  O.BooleanData = b;
  return O;
}

export function CreateBoolean(realmRec) {
  const booleanPrototype = realmRec.Intrinsics['%BooleanPrototype%'];

  const booleanConstructor = CreateBuiltinFunction(BooleanConstructor, [], realmRec);

  booleanPrototype.DefineOwnProperty(NewValue('constructor'), {
    Value: booleanConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  return booleanConstructor;
}
