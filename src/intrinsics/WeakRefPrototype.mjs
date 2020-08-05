import { RequireInternalSlot, WeakRefDeref } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-weak-ref.prototype.deref
function WeakRefProto_deref(args, { thisValue }) {
  // 1. Let weakRef be the this value.
  const weakRef = thisValue;
  // 2. Perform ? RequireInternalSlot(weakRef, [[WeakRefTarget]]).
  Q(RequireInternalSlot(weakRef, 'WeakRefTarget'));
  // 3. Return ! WeakRefDeref(weakRef).
  return X(WeakRefDeref(weakRef));
}

export function BootstrapWeakRefPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['deref', WeakRefProto_deref, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'WeakRef');

  realmRec.Intrinsics['%WeakRef.prototype%'] = proto;
}
