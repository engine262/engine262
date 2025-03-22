import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Value, type Arguments, type FunctionCallContext, BooleanValue,
} from '../value.mts';
import {
  CanBeHeldWeakly,
  CleanupFinalizationRegistry,
  IsCallable,
  Realm,
  RequireInternalSlot,
  SameValue,
  type FunctionObject,
} from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import type { FinalizationRegistryCell, FinalizationRegistryObject } from './FinalizationRegistry.mts';

/** https://tc39.es/ecma262/#sec-finalization-registry.prototype.cleanupSome */
function* FinalizationRegistryProto_cleanupSome([callback = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If callback is present and IsCallable(callback) is false, throw a TypeError exception.
  if (callback !== Value.undefined && IsCallable(callback) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callback);
  }
  // 4. Perform ? CleanupFinalizationRegistry(finalizationRegistry, callback).
  Q(yield* CleanupFinalizationRegistry(finalizationRegistry as FinalizationRegistryObject, { Callback: callback as FunctionObject, HostDefined: undefined }));
  // 5. Return *undefined*.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-finalization-registry.prototype.register */
function FinalizationRegistryProto_register([target = Value.undefined, heldValue = Value.undefined, unregisterToken = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue as FinalizationRegistryObject;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If CanBeHeldWeakly(target) is false, throw a TypeError exception.
  if (CanBeHeldWeakly(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAWeakKey', target);
  }
  // 4. If SameValue(target, heldValue), throw a TypeError exception.
  if (SameValue(target, heldValue) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'TargetMatchesHeldValue', heldValue);
  }
  // 5. If CanBeHeldWeakly(unregisterToken) is false, then
  if (CanBeHeldWeakly(unregisterToken) === Value.false) {
    // a. If unregisterToken is not undefined, throw a TypeError exception.
    if (unregisterToken !== Value.undefined) {
      return surroundingAgent.Throw('TypeError', 'NotAWeakKey', unregisterToken);
    }
    // b. Set unregisterToken to empty.
    unregisterToken = undefined!;
  }
  // 6. Let cell be the Record { [[WeakRefTarget]] : target, [[HeldValue]]: heldValue, [[UnregisterToken]]: unregisterToken }.
  const cell: FinalizationRegistryCell = {
    WeakRefTarget: target,
    HeldValue: heldValue,
    UnregisterToken: unregisterToken,
  };
  // 7. Append cell to finalizationRegistry.[[Cells]].
  Q(surroundingAgent.debugger_tryTouchDuringPreview(finalizationRegistry));
  finalizationRegistry.Cells.push(cell);
  // 8. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-finalization-registry.prototype.unregister */
function FinalizationRegistryProto_unregister([unregisterToken = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let finalizationRegistry be the this value.
  const finalizationRegistry = thisValue as FinalizationRegistryObject;
  // 2. Perform ? RequireInternalSlot(finalizationRegistry, [[Cells]]).
  Q(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 3. If CanBeHeldWeakly(unregisterToken) is false, throw a TypeError exception.
  if (CanBeHeldWeakly(unregisterToken) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAWeakKey', unregisterToken);
  }
  // 4. Let removed be false.
  let removed: BooleanValue = Value.false;
  Q(surroundingAgent.debugger_tryTouchDuringPreview(finalizationRegistry));
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

export function bootstrapFinalizationRegistryPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    surroundingAgent.feature('cleanup-some')
      ? ['cleanupSome', FinalizationRegistryProto_cleanupSome, 0]
      : undefined,
    ['register', FinalizationRegistryProto_register, 2],
    ['unregister', FinalizationRegistryProto_unregister, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'FinalizationRegistry');

  realmRec.Intrinsics['%FinalizationRegistry.prototype%'] = proto;
}
