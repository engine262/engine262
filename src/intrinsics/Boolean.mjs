import {
  OrdinaryCreateFromConstructor,
  ToBoolean,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function BooleanConstructor([value = Value.undefined], { NewTarget }) {
  const b = ToBoolean(value);
  if (Type(NewTarget) === 'Undefined') {
    return b;
  }
  const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%Boolean.prototype%', ['BooleanData']));
  O.BooleanData = b;
  return O;
}

export function BootstrapBoolean(realmRec) {
  const cons = BootstrapConstructor(
    realmRec, BooleanConstructor, 'Boolean', 1,
    realmRec.Intrinsics['%Boolean.prototype%'], [],
  );

  realmRec.Intrinsics['%Boolean%'] = cons;
}
