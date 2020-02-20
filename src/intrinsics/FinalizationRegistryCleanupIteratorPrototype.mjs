import { surroundingAgent } from '../engine.mjs';
import { RequireInternalSlot, CreateIterResultObject } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function FinalizationRegistryCleanupIteratorPrototype_next(args, { thisValue }) {
  // 1. Let iterator be the this value.
  const iterator = thisValue;
  // 2. If Type(iterator) is not Object, throw a TypeError exception.
  // 3. If iterator does not have a [[FinalizationRegistry]] internal slot, throw a TypeError exception.
  Q(RequireInternalSlot(iterator, 'FinalizationRegistry'));
  // 4. If iterator.[[FinalizationRegistry]] is empty, throw a TypeError exception.
  if (iterator.FinalizationRegistry === undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', Value.undefined);
  }
  // 5. Let finalizationRegistry be iterator.[[FinalizationRegistry]].
  const finalizationRegistry = iterator.FinalizationRegistry;
  // 6. Assert: Type(finalizationRegistry) is Object.
  // 7. Assert: finalizationRegistry has a [[Cells]] internal slot.
  X(RequireInternalSlot(finalizationRegistry, 'Cells'));
  // 8. If finalizationRegistry.[[Cells]] contains a Record cell such that cell.[[WeakRefTarget]] is empty, then an implementation may perform the following steps,
  const index = finalizationRegistry.Cells.findIndex((cell) => cell.WeakRefTarget === undefined);
  if (index !== -1) {
    // a. Choose any such cell.
    const cell = finalizationRegistry.Cells[index];
    // b. Remove cell from finalizationRegistry.[[Cells]].
    finalizationRegistry.Cells.splice(index, 1);
    // c. Return CreateIterResultObject(cell.[[HeldValue]], false).
    return CreateIterResultObject(cell.HeldValue, Value.false);
  }
  // 9. If the preceding steps were not performed,
  //   a. Return CreateIterResultObject(undefined, true).
  return CreateIterResultObject(Value.undefined, Value.true);
}

export function BootstrapFinalizationRegistryCleanupIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', FinalizationRegistryCleanupIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'FinalizationRegistry Cleanup Iterator');

  realmRec.Intrinsics['%FinalizationRegistryCleanupIteratorPrototype%'] = proto;
}
