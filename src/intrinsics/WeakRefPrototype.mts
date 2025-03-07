// @ts-nocheck
import { RequireInternalSlot, WeakRefDeref } from '../abstract-ops/all.mts';
import { Q, X } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-weak-ref.prototype.deref */
function WeakRefProto_deref(args, { thisValue }) {
  // 1. Let weakRef be the this value.
  const weakRef = thisValue;
  // 2. Perform ? RequireInternalSlot(weakRef, [[WeakRefTarget]]).
  Q(RequireInternalSlot(weakRef, 'WeakRefTarget'));
  // 3. Return ! WeakRefDeref(weakRef).
  return X(WeakRefDeref(weakRef));
}

export function bootstrapWeakRefPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['deref', WeakRefProto_deref, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'WeakRef');

  realmRec.Intrinsics['%WeakRef.prototype%'] = proto;
}
