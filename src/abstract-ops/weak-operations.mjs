import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { NormalCompletion, AbruptCompletion, X } from '../completion.mjs';
import {
  Assert,
  Call,
  OrdinaryObjectCreate,
  RequireInternalSlot,
} from './all.mjs';

// https://tc39.es/proposal-weakrefs/#sec-clear-kept-objects
export function ClearKeptObjects() {
  // 1. Let agent be the surrounding agent.
  const agent = surroundingAgent;
  // 2. Set agent.[[KeptAlive]] to a new empty List.
  agent.KeptAlive = new Set();
}

// https://tc39.es/proposal-weakrefs/#sec-clear-kept-objects
export function AddToKeptObjects(object) {
  // 1. Let agent be the surrounding agent.
  const agent = surroundingAgent;
  // 2. Append object to agent.[[KeptAlive]].
  agent.KeptAlive.add(object);
}

// https://tc39.es/proposal-weakrefs/#sec-check-for-empty-cells
export function CheckForEmptyCells(finalizationRegistry) {
  // 1. Assert: finalizationRegistry has an [[Cells]] internal slot.
  Assert('Cells' in finalizationRegistry);
  // 2. For each cell in finalizationRegistry.[[Cells]], do
  for (const cell of finalizationRegistry.Cells) {
    // a. If cell.[[WeakRefTarget]] is empty, then
    if (cell.WeakRefTarget === undefined) {
      // i. Return true.
      return Value.true;
    }
  }
  // 3. Return false.
  return Value.false;
}

// https://tc39.es/proposal-weakrefs/#sec-createfinalizationregistrycleanupiterator
function CreateFinalizationRegistryCleanupIterator(finalizationRegistry) {
  // 1. Assert: Type(finalizationRegistry) is Object.
  // 2. Assert: finalizationRegistry has a [[Cells]] internal slot.
  X(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. Assert: finalizationRegistry.[[Realm]].[[Intrinsics]].[[%FinalizationRegistryCleanupIteratorPrototype%]] exists and has been initialized.
  Assert(finalizationRegistry.Realm.Intrinsics['%FinalizationRegistryCleanupIteratorPrototype%']);
  // 4. Let prototype be finalizationRegistry.[[Realm]].[[Intrinsics]].[[%FinalizationRegistryCleanupIteratorPrototype%]].
  const prototype = finalizationRegistry.Realm.Intrinsics['%FinalizationRegistryCleanupIteratorPrototype%'];
  // 5. Let iterator be OrdinaryObjectCreate(prototype, « [[FinalizationRegistry]] »).
  const iterator = OrdinaryObjectCreate(prototype, ['FinalizationRegistry']);
  // 6. Set iterator.[[FinalizationRegistry]] to finalizationRegistry.
  iterator.FinalizationRegistry = finalizationRegistry;
  // 7. Return iterator.
  return iterator;
}

// https://tc39.es/proposal-weakrefs/#sec-cleanup-finalization-registry
export function CleanupFinalizationRegistry(finalizationRegistry, callback) {
  // 1. Assert: finalizationRegistry has [[Cells]], [[CleanupCallback]], and [[IsFinalizationRegistryCleanupJobActive]] internal slots.
  Assert('Cells' in finalizationRegistry);
  // 2. If CheckForEmptyCells(finalizationRegistry) is false, return.
  if (CheckForEmptyCells(finalizationRegistry) === Value.false) {
    return NormalCompletion(Value.undefined);
  }
  // 3. Let iterator be ! CreateFinalizationRegistryCleanupIterator(finalizationRegistry).
  const iterator = X(CreateFinalizationRegistryCleanupIterator(finalizationRegistry));
  // 4. If callback is not present or undefined, set callback to finalizationRegistry.[[CleanupCallback]].
  if (callback === undefined || callback === Value.undefined) {
    callback = finalizationRegistry.CleanupCallback;
  }
  // 5. Set finalizationRegistry.[[IsFinalizationRegistryCleanupJobActive]] to true.
  finalizationRegistry.IsFinalizationRegistryCleanupJobActive = true;
  // 6. Let result be Call(callback, undefined, « iterator »).
  const result = Call(callback, Value.undefined, [iterator]);
  // 7. Set finalizationRegistry.[[IsFinalizationRegistryCleanupJobActive]] to false.
  finalizationRegistry.IsFinalizationRegistryCleanupJobActive = false;
  // 8. Set iterator.[[FinalizationRegistry]] to empty.
  iterator.FinalizationRegistry = undefined;
  // 9. If result is an abrupt completion, return result.
  if (result instanceof AbruptCompletion) {
    return result;
  }
  // 10. Else, return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}
