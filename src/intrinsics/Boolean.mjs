import {
  CreateBuiltinFunction,
  OrdinaryCreateFromConstructor,
  ToBoolean,
} from '../abstract-ops/all';
import {
  New as NewValue,
} from '../value';
import { Q } from '../completion';

function BooleanConstructor(realm, [value], { NewTarget }) {
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
