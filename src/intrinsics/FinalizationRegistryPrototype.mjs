import { surroundingAgent } from '../engine.mjs';
import { Value, Type } from '../value.mjs';
import {
  CleanupFinalizationRegistry,
  RequireInternalSlot,
  IsCallable,
  SameValue,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// https://tc39.es/proposal-weakrefs/#sec-finalization-registry.prototype.register
function FinalizationRegistryProto_register([target = Value.undefined, heldValue = Value.undefined, unregisterToken = Value.undefined], { thisValue }) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If Type(target) is not Object, throw a TypeError exception.
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 4. If SameValue(target, heldValue), throw a TypeError exception.
  if (SameValue(target, heldValue) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'TargetMatchesHeldValue', heldValue);
  }
  // 5. If Type(unregisterToken) is not Object,
  if (Type(unregisterToken) !== 'Object') {
    // a. If unregisterToken is not undefined, throw a TypeError exception.
    if (unregisterToken !== Value.undefined) {
      return surroundingAgent.Throw('TypeError', 'NotAnObject', unregisterToken);
    }
    // b. Set unregisterToken to empty.
    unregisterToken = undefined;
  }
  // 6. Let cell be the Record { [[WeakRefTarget]] : target, [[HeldValue]]: heldValue, [[UnregisterToken]]: unregisterToken }.
  const cell = {
    WeakRefTarget: target,
    HeldValue: heldValue,
    UnregisterToken: unregisterToken,
  };
  // 7. Append cell to finalizationRegistry.[[Cells]].
  finalizationRegistry.Cells.push(cell);
  // 8. Return undefined.
  return Value.undefined;
}

// https://tc39.es/proposal-weakrefs/#sec-finalization-registry.prototype.unregister
function FinalizationRegistryProto_unregister([unregisterToken = Value.undefined], { thisValue }) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If Type(unregisterToken) is not Object, throw a TypeError exception.
  if (Type(unregisterToken) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', unregisterToken);
  }
  // 4. Let removed be false.
  let removed = Value.false;
  // 5. For each Record { [[WeakRefTarget]], [[HeldValue]], [[UnregisterToken]] } cell that is an element of finalizationRegistry.[[Cells]], do
  finalizationRegistry.Cells = finalizationRegistry.Cells.filter((cell) => {
    let r = true;
    // a. If SameValue(cell.[[UnregisterToken]], unregisterToken) is true, then
    if (cell.UnregisterToken !== undefined && SameValue(cell.UnregisterToken, unregisterToken) === Value.true) {
      // i. Remove cell from finalizationRegistry.Cells.
      r = false;
      // ii. Set removed to true.
      removed = Value.true;
    }
    return r;
  });
  // 6. Return removed.
  return removed;
}

// https://tc39.es/proposal-weakrefs/#sec-finalization-registry.prototype.cleanupSome
function FinalizationRegistryProto_cleanupSome([callback = Value.undefined], { thisValue }) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If finalizationRegistry.[[IsFinalizationRegistryCleanupJobActive]] is true, throw a TypeError exception.
  if (finalizationRegistry.IsFinalizationRegistryCleanupJobActive) {
    return surroundingAgent.Throw('TypeError', 'FinalizationRegistryCleanupJobActive');
  }
  // 4. If callback is not undefined and IsCallable(callback) is false, throw a TypeError exception.
  if (callback !== Value.undefined && IsCallable(callback) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callback);
  }
  // 5. Perform ? CleanupFinalizationRegistry(finalizationRegistry, callback).
  Q(CleanupFinalizationRegistry(finalizationRegistry, callback));
  // 6. Return undefined.
  return Value.undefined;
}

export function BootstrapFinalizationRegistryPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['register', FinalizationRegistryProto_register, 2],
    ['unregister', FinalizationRegistryProto_unregister, 1],
    ['cleanupSome', FinalizationRegistryProto_cleanupSome, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'FinalizationRegistry');

  realmRec.Intrinsics['%FinalizationRegistry.prototype%'] = proto;
}
