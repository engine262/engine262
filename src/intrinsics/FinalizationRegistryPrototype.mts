// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Value, ObjectValue } from '../value.mjs';
import {
  CleanupFinalizationRegistry,
  IsCallable,
  RequireInternalSlot,
  SameValue,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-finalization-registry.prototype.cleanupSome */
function FinalizationRegistryProto_cleanupSome([callback = Value.undefined], { thisValue }) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If callback is present and IsCallable(callback) is false, throw a TypeError exception.
  if (callback !== Value.undefined && !IsCallable(callback)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callback);
  }
  // 4. Perform ? CleanupFinalizationRegistry(finalizationRegistry, callback).
  Q(CleanupFinalizationRegistry(finalizationRegistry, callback));
  // 5. Return *undefined*.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-finalization-registry.prototype.register */
function FinalizationRegistryProto_register([target = Value.undefined, heldValue = Value.undefined, unregisterToken = Value.undefined], { thisValue }) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 4. If SameValue(target, heldValue), throw a TypeError exception.
  if (SameValue(target, heldValue) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'TargetMatchesHeldValue', heldValue);
  }
  // 5. If Type(unregisterToken) is not Object,
  if (!(unregisterToken instanceof ObjectValue)) {
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

/** https://tc39.es/ecma262/#sec-finalization-registry.prototype.unregister */
function FinalizationRegistryProto_unregister([unregisterToken = Value.undefined], { thisValue }) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If Type(unregisterToken) is not Object, throw a TypeError exception.
  if (!(unregisterToken instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', unregisterToken);
  }
  // 4. Let removed be false.
  let removed = Value.false;
  // 5. For each Record { [[WeakRefTarget]], [[HeldValue]], [[UnregisterToken]] } cell that is an element of finalizationRegistry.[[Cells]], do
  finalizationRegistry.Cells = finalizationRegistry.Cells.filter((cell) => {
    let r = true;
    // a. If cell.[[UnregisterToken]] is not empty and SameValue(cell.[[UnregisterToken]], unregisterToken) is true, then
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

export function bootstrapFinalizationRegistryPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    surroundingAgent.feature('cleanup-some')
      ? ['cleanupSome', FinalizationRegistryProto_cleanupSome, 0]
      : undefined,
    ['register', FinalizationRegistryProto_register, 2],
    ['unregister', FinalizationRegistryProto_unregister, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'FinalizationRegistry');

  realmRec.Intrinsics['%FinalizationRegistry.prototype%'] = proto;
}
