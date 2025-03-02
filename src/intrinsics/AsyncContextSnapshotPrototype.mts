// @ts-nocheck
import { AsyncContextSwap, Call, RequireInternalSlot } from '../abstract-ops/all.mjs';
import { Completion } from '../completion.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontext-snapshot.prototype.run */
function SnapshotProto_run([func = Value.undefined, ...args], { thisValue }) {
  // 1. Let asyncSnapshot be the this value.
  const asyncSnapshot = thisValue;
  // 2. Perform ? RequireInternalSlot(asyncSnapshot, [[AsyncSnapshotMapping]]).
  Q(RequireInternalSlot(asyncSnapshot, 'AsyncSnapshotMapping'));
  // 3. Let previousContextMapping be AsyncContextSwap(asyncSnapshot.[[AsyncSnapshotMapping]]).
  const previousContextMapping = AsyncContextSwap(asyncSnapshot.AsyncContextMapping);
  // 4. Let result be Completion(Call(func, undefined, args)).
  const result = Completion(Call(func, Value.undefined, args));
  // 5. AsyncContextSwap(previousContextMapping).
  AsyncContextSwap(previousContextMapping);
  // 6. Return result.
  return result;
}

export function bootstrapAsyncContextSnapshotPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['run', SnapshotProto_run, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'AsyncContext.Snapshot');

  realmRec.Intrinsics['%AsyncContext.Snapshot.prototype%'] = proto;
}
