import { surroundingAgent } from '../host-defined/engine.mts';
import {
  UndefinedValue, Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import {
  AddToKeptObjects, CanBeHeldWeakly, OrdinaryCreateFromConstructor, Realm, type FunctionObject, type OrdinaryObject,
} from '../abstract-ops/all.mts';
import { Q, X } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

export interface WeakRefObject extends OrdinaryObject {
  WeakRefTarget: Value | undefined;
}
export function isWeakRef(object: object): object is WeakRefObject {
  return 'WeakRefTarget' in object && !('HeldValue' in object);
}
/** https://tc39.es/ecma262/#sec-weak-ref-target */
function* WeakRefConstructor(this: FunctionObject, [target = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. If CanBeHeldWeakly(target) is false, throw a TypeError exception.
  if (CanBeHeldWeakly(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAWeakKey', target);
  }
  // 3. Let weakRef be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakRefPrototype%", « [[WeakRefTarget]] »).
  const weakRef = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%WeakRef.prototype%', ['WeakRefTarget'])) as Mutable<WeakRefObject>;
  // 4. Perform ! AddToKeptObjects(target).
  X(AddToKeptObjects(target));
  // 5. Set weakRef.[[WeakRefTarget]] to target.
  weakRef.WeakRefTarget = target;
  // 6. Return weakRef
  return weakRef;
}

export function bootstrapWeakRef(realmRec: Realm) {
  const bigintConstructor = bootstrapConstructor(realmRec, WeakRefConstructor, 'WeakRef', 1, realmRec.Intrinsics['%WeakRef.prototype%'], []);

  realmRec.Intrinsics['%WeakRef%'] = bigintConstructor;
}
