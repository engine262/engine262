import { RequireInternalSlot, AddToKeptObjects } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// https://tc39.es/proposal-weakrefs/#sec-weak-ref.prototype.deref
function WeakRefProto_deref(args, { thisValue }) {
  // 1. Let weakRef be the this value.
  const weakRef = thisValue;
  // 2. Perform ? RequireInternalSlot(weakRef, [[WeakRefTarget]]).
  Q(RequireInternalSlot(weakRef, 'WeakRefTarget'));
  // 3. Let target be the value of weakRef.[[WeakRefTarget]].
  const target = weakRef.WeakRefTarget;
  // 4. If target is not empty,
  if (target !== undefined) {
    // a. Perform ! AddToKeptObjects(target).
    X(AddToKeptObjects(target));
    // b. Return target.
    return target;
  }
  // 5. Return undefined.
  return Value.undefined;
}

export function BootstrapWeakRefPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['deref', WeakRefProto_deref, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'WeakRef');

  realmRec.Intrinsics['%WeakRef.prototype%'] = proto;
}
