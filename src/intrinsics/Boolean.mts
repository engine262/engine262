import {
  OrdinaryCreateFromConstructor,
  Realm,
  ToBoolean,
  type OrdinaryObject,
} from '../abstract-ops/all.mts';
import {
  BooleanValue, UndefinedValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface BooleanObject extends OrdinaryObject {
  readonly BooleanData: BooleanValue;
}
export function isBooleanObject(o: Value): o is BooleanObject {
  return 'BooleanData' in o;
}
/** https://tc39.es/ecma262/#sec-boolean-constructor-boolean-value */
function* BooleanConstructor([value = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. Let b be ! ToBoolean(value).
  const b = X(ToBoolean(value));
  // 2. If NewTarget is undefined, return b.
  if (NewTarget instanceof UndefinedValue) {
    return b;
  }
  // 3. Let O be ? OrdinaryCreateFromConstructor(NewTarget, "%Boolean.prototype%", « [[BooleanData]] »).
  const O = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%Boolean.prototype%', ['BooleanData'])) as Mutable<BooleanObject>;
  // 4. Set O.[[BooleanData]] to b.
  O.BooleanData = b;
  // 5. Return O.
  return O;
}

export function bootstrapBoolean(realmRec: Realm) {
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
