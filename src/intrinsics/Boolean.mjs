import {
  OrdinaryCreateFromConstructor,
  ToBoolean,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

// #sec-boolean-constructor-boolean-value
function BooleanConstructor([value = Value.undefined], { NewTarget }) {
  // 1. Let b be ! ToBoolean(value).
  const b = X(ToBoolean(value));
  // 2. If NewTarget is undefined, return b.
  if (NewTarget === Value.undefined) {
    return b;
  }
  // 3. Let O be ? OrdinaryCreateFromConstructor(NewTarget, "%Boolean.prototype%", « [[BooleanData]] »).
  const O = Q(OrdinaryCreateFromConstructor(NewTarget, '%Boolean.prototype%', ['BooleanData']));
  // 4. Set O.[[BooleanData]] to b.
  O.BooleanData = b;
  // 5. Return O.
  return O;
}

export function bootstrapBoolean(realmRec) {
  const cons = bootstrapConstructor(
    realmRec,
    BooleanConstructor,
    'Boolean',
    1,
    realmRec.Intrinsics['%Boolean.prototype%'],
    [],
  );

  realmRec.Intrinsics['%Boolean%'] = cons;
}
