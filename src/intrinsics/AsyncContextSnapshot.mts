// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { AsyncContextSnapshot, OrdinaryCreateFromConstructor } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** https://tc39.es/proposal-async-context/#sec-asynccontext-snapshot */
function SnapshotConstructor(args, { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let snapshotMapping be AsyncContextSnapshot().
  const snapshotMapping = AsyncContextSnapshot();
  // 3. Let asyncSnapshot be ? OrdinaryCreateFromConstructor(NewTarget, "%AsyncContext.Snapshot.prototype%", « [[AsyncSnapshotMapping]] »).
  const asyncSnapshot = Q(OrdinaryCreateFromConstructor(NewTarget, '%AsyncContext.Snapshot.prototype%', ['AsyncSnapshotMapping']));
  // 4. Set asyncSnapshot.[[AsyncSnapshotMapping]] to snapshotMapping.
  asyncSnapshot.AsyncContextMapping = snapshotMapping;
  // 5. Return asyncSnapshot.
  return asyncSnapshot;
}

export function bootstrapAsyncContextSnapshot(realmRec) {
  const snapshotConstructor = bootstrapConstructor(realmRec, SnapshotConstructor, 'Snapshot', 0, realmRec.Intrinsics['%AsyncContext.Snapshot.prototype%']);

  realmRec.Intrinsics['%AsyncContext.Snapshot%'] = snapshotConstructor;
}
