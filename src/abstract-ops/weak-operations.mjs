import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { NormalCompletion, Q } from '../completion.mjs';
import { Assert, Call } from './all.mjs';

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

// https://tc39.es/proposal-weakrefs/#sec-cleanup-finalization-registry
export function CleanupFinalizationRegistry(finalizationRegistry, callback) {
  // 1. Assert: finalizationRegistry has [[Cells]] and [[CleanupCallback]] internal slots.
  Assert('Cells' in finalizationRegistry);
  // 2. If callback is not present or undefined, set callback to finalizationRegistry.[[CleanupCallback]].
  if (callback === undefined || callback === Value.undefined) {
    callback = finalizationRegistry.CleanupCallback;
  }
  // 3. While finalizationRegistry.[[Cells]] contains a Record cell such that cell.[[WeakRefTarget]] is empty, do
  for (let i = 0; i < finalizationRegistry.Cells.length; i += 1) {
    // a. Choose any such _cell_.
    const cell = finalizationRegistry.Cells[i];
    if (cell.WeakRefTarget !== undefined) {
      continue;
    }
    // b. Remove cell from finalizationRegistry.[[Cells]].
    finalizationRegistry.Cells.splice(i, 1);
    i -= 1;
    // c. Perform ? Call(callback, undefined, « cell.[[HeldValue]] »).
    Q(Call(callback, Value.undefined, [cell.HeldValue]));
  }
  // 4. Return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}
