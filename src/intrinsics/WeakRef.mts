// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { AddToKeptObjects, CanBeHeldWeakly, OrdinaryCreateFromConstructor } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-weak-ref-target */
function WeakRefConstructor([target = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. If CanBeHeldWeakly(target) is false, throw a TypeError exception.
  if (CanBeHeldWeakly(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'WeakRefNotObject', target);
  }
  // 3. Let weakRef be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakRef.prototype%", « [[WeakRefTarget]] »).
  const weakRef = Q(OrdinaryCreateFromConstructor(NewTarget, '%WeakRef.prototype%', ['WeakRefTarget']));
  // 4. Perform AddToKeptObjects(target).
  AddToKeptObjects(target);
  // 5. Set weakRef.[[WeakRefTarget]] to target.
  weakRef.WeakRefTarget = target;
  // 6. Return weakRef.
  return weakRef;
}

export function bootstrapWeakRef(realmRec) {
  const bigintConstructor = bootstrapConstructor(realmRec, WeakRefConstructor, 'WeakRef', 1, realmRec.Intrinsics['%WeakRef.prototype%'], []);

  realmRec.Intrinsics['%WeakRef%'] = bigintConstructor;
}
