import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { IsCallable, OrdinaryCreateFromConstructor } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-finalization-registry-cleanup-callback
function FinalizationRegistryConstructor([cleanupCallback = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', 'FinalizationRegistry');
  }
  // 2. If IsCallable(cleanupCallback) is false, throw a TypeError exception.
  if (IsCallable(cleanupCallback) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', cleanupCallback);
  }
  // 3. Let finalizationGroup be ? OrdinaryCreateFromConstructor(NewTarget, "%FinalizationRegistryPrototype%", « [[Realm]], [[CleanupCallback]], [[Cells]] »).
  const finalizationGroup = Q(OrdinaryCreateFromConstructor(NewTarget, '%FinalizationRegistry.prototype%', [
    'Realm',
    'CleanupCallback',
    'Cells',
  ]));
  // 4. Let fn be the active function object.
  const fn = surroundingAgent.activeFunctionObject;
  // 5. Set finalizationGroup.[[Realm]] to fn.[[Realm]].
  finalizationGroup.Realm = fn.Realm;
  // 6. Set finalizationGroup.[[CleanupCallback]] to cleanupCallback.
  finalizationGroup.CleanupCallback = cleanupCallback;
  // 7. Set finalizationGroup.[[Cells]] to be an empty List.
  finalizationGroup.Cells = [];
  // 8. Return finalizationGroup.
  return finalizationGroup;
}

export function BootstrapFinalizationRegistry(realmRec) {
  const cons = BootstrapConstructor(
    realmRec, FinalizationRegistryConstructor, 'FinalizationRegistry', 1,
    realmRec.Intrinsics['%FinalizationRegistry.prototype%'], [],
  );

  realmRec.Intrinsics['%FinalizationRegistry%'] = cons;
}
