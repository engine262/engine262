// @ts-nocheck
import { surroundingAgent, HostCallJobCallback } from '../engine.mts';
import { BooleanValue, Value } from '../value.mts';
import { NormalCompletion, Q, X } from '../completion.mts';
import { Assert, KeyForSymbol } from './all.mts';

/** https://tc39.es/ecma262/#sec-clear-kept-objects */
export function ClearKeptObjects() {
  // 1. Let agentRecord be the surrounding agent's Agent Record.
  const agentRecord = surroundingAgent.AgentRecord;
  // 2. Set agentRecord.[[KeptAlive]] to a new empty List.
  agentRecord.KeptAlive = new Set();
}

/** https://tc39.es/ecma262/#sec-addtokeptobjects */
export function AddToKeptObjects(object) {
  // 1. Let agentRecord be the surrounding agent's Agent Record.
  const agentRecord = surroundingAgent.AgentRecord;
  // 2. Append object to agentRecord.[[KeptAlive]].
  agentRecord.KeptAlive.add(object);
}

/** https://tc39.es/ecma262/#sec-weakrefderef */
export function WeakRefDeref(weakRef) {
  // 1. Let target be weakRef.[[WeakRefTarget]].
  const target = weakRef.WeakRefTarget;
  // 2. If target is not empty, then
  if (target !== undefined) {
    // a. Perform ! AddToKeptObjects(target).
    X(AddToKeptObjects(target));
    // b. Return target.
    return target;
  }
  // 3. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-cleanup-finalization-registry */
export function CleanupFinalizationRegistry(finalizationRegistry, callback) {
  // 1. Assert: finalizationRegistry has [[Cells]] and [[CleanupCallback]] internal slots.
  Assert('Cells' in finalizationRegistry && 'CleanupCallback' in finalizationRegistry);
  // 2. Set callback to finalizationRegistry.[[CleanupCallback]].
  if (callback === undefined || callback === Value.undefined) {
    callback = finalizationRegistry.CleanupCallback;
  }
  // 3. While finalizationRegistry.[[Cells]] contains a Record cell such that cell.[[WeakRefTarget]] is empty, an implementation may perform the following steps:
  for (let i = 0; i < finalizationRegistry.Cells.length; i += 1) {
    // a. Choose any such _cell_.
    const cell = finalizationRegistry.Cells[i];
    if (cell.WeakRefTarget !== undefined) {
      continue;
    }
    // b. Remove cell from finalizationRegistry.[[Cells]].
    finalizationRegistry.Cells.splice(i, 1);
    i -= 1;
    // c. Perform ? HostCallJobCallback(callback, undefined, « cell.[[HeldValue]] »).
    Q(HostCallJobCallback(callback, Value.undefined, [cell.HeldValue]));
  }
  // 4. Return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}

/** https://tc39.es/ecma262/#sec-canbeheldweakly */
export function CanBeHeldWeakly(value: Value): BooleanValue {
  // 1. If v is an Object, return true.
  if (value.type === 'Object') {
    return Value.true;
  }
  // 2. If v is a Symbol and KeyForSymbol(v) is undefined, return true.
  if (value.type === 'Symbol' && KeyForSymbol(value) === Value.undefined) {
    return Value.true;
  }

  // 3, Return false.
  return Value.false;
}
