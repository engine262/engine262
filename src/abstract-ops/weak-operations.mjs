import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { NormalCompletion, AbruptCompletion, X } from '../completion.mjs';
import {
  Assert,
  Call,
  ObjectCreate,
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
export function CheckForEmptyCells(finalizationGroup) {
  // 1. Assert: finalizationGroup has an [[Cells]] internal slot.
  Assert('Cells' in finalizationGroup);
  // 2. For each cell in finalizationGroup.[[Cells]], do
  for (const cell of finalizationGroup.Cells) {
    // a. If cell.[[WeakRefTarget]] is empty, then
    if (cell.WeakRefTarget === undefined) {
      // i. Return true.
      return Value.true;
    }
  }
  // 3. Return false.
  return Value.false;
}

// https://tc39.es/proposal-weakrefs/#sec-createfinalizationgroupcleanupiterator
function CreateFinalizationGroupCleanupIterator(finalizationGroup) {
  // 1. Assert: Type(finalizationGroup) is Object.
  // 2. Assert: finalizationGroup has a [[Cells]] internal slot.
  X(RequireInternalSlot(finalizationGroup, 'Cells'));
  // 3. Assert: finalizationGroup.[[Realm]].[[Intrinsics]].[[%FinalizationGroupCleanupIteratorPrototype%]] exists and has been initialized.
  Assert(finalizationGroup.Realm.Intrinsics['%FinalizationGroupCleanupIteratorPrototype%']);
  // 4. Let prototype be finalizationGroup.[[Realm]].[[Intrinsics]].[[%FinalizationGroupCleanupIteratorPrototype%]].
  const prototype = finalizationGroup.Realm.Intrinsics['%FinalizationGroupCleanupIteratorPrototype%'];
  // 5. Let iterator be ObjectCreate(prototype, « [[FinalizationGroup]] »).
  const iterator = ObjectCreate(prototype, ['FinalizationGroup']);
  // 6. Set iterator.[[FinalizationGroup]] to finalizationGroup.
  iterator.FinalizationGroup = finalizationGroup;
  // 7. Return iterator.
  return iterator;
}

// https://tc39.es/proposal-weakrefs/#sec-cleanup-finalization-group
export function CleanupFinalizationGroup(finalizationGroup, callback) {
  // 1. Assert: finalizationGroup has [[Cells]], [[CleanupCallback]], and [[IsFinalizationGroupCleanupJobActive]] internal slots.
  Assert('Cells' in finalizationGroup);
  // 2. If CheckForEmptyCells(finalizationGroup) is false, return.
  if (CheckForEmptyCells(finalizationGroup) === Value.false) {
    return NormalCompletion(Value.undefined);
  }
  // 3. Let iterator be ! CreateFinalizationGroupCleanupIterator(finalizationGroup).
  const iterator = X(CreateFinalizationGroupCleanupIterator(finalizationGroup));
  // 4. If callback is not present or undefined, set callback to finalizationGroup.[[CleanupCallback]].
  if (callback === undefined || callback === Value.undefined) {
    callback = finalizationGroup.CleanupCallback;
  }
  // 5. Set finalizationGroup.[[IsFinalizationGroupCleanupJobActive]] to true.
  finalizationGroup.IsFinalizationGroupCleanupJobActive = true;
  // 6. Let result be Call(callback, undefined, « iterator »).
  const result = Call(callback, Value.undefined, [iterator]);
  // 7. Set finalizationGroup.[[IsFinalizationGroupCleanupJobActive]] to false.
  finalizationGroup.IsFinalizationGroupCleanupJobActive = false;
  // 8. Set iterator.[[FinalizationGroup]] to empty.
  iterator.FinalizationGroup = undefined;
  // 9. If result is an abrupt completion, return result.
  if (result instanceof AbruptCompletion) {
    return result;
  }
  // 10. Else, return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}
