import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { IsCallable, OrdinaryCreateFromConstructor } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// https://tc39.es/proposal-weakrefs/#sec-finalization-group-cleanup-callback
function FinalizationGroupConstructor([cleanupCallback = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', 'FinalizationGroup');
  }
  // 2. If IsCallable(cleanupCallback) is false, throw a TypeError exception.
  if (IsCallable(cleanupCallback) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', cleanupCallback);
  }
  // 3. Let finalizationGroup be ? OrdinaryCreateFromConstructor(NewTarget, "%FinalizationGroupPrototype%", « [[Realm]], [[CleanupCallback]], [[Cells]], [[IsFinalizationGroupCleanupJobActive]] »).
  const finalizationGroup = Q(OrdinaryCreateFromConstructor(NewTarget, '%FinalizationGroup.prototype%', [
    'Realm',
    'CleanupCallback',
    'Cells',
    'IsFinalizationGroupCleanupJobActive',
  ]));
  // 4. Let fn be the active function object.
  const fn = surroundingAgent.activeFunctionObject;
  // 5. Set finalizationGroup.[[Realm]] to fn.[[Realm]].
  finalizationGroup.Realm = fn.Realm;
  // 6. Set finalizationGroup.[[CleanupCallback]] to cleanupCallback.
  finalizationGroup.CleanupCallback = cleanupCallback;
  // 7. Set finalizationGroup.[[Cells]] to be an empty List.
  finalizationGroup.Cells = [];
  // 8. Set finalizationGroup.[[IsFinalizationGroupCleanupJobActive]] to false.
  finalizationGroup.IsFinalizationGroupCleanupJobActive = false;
  // 9. Return finalizationGroup.
  return finalizationGroup;
}

export function BootstrapFinalizationGroup(realmRec) {
  const finalizationGroupConstructor = BootstrapConstructor(
    realmRec, FinalizationGroupConstructor, 'FinalizationGroup', 1,
    realmRec.Intrinsics['%FinalizationGroup.prototype%'], [],
  );

  realmRec.Intrinsics['%FinalizationGroup%'] = finalizationGroupConstructor;
}
