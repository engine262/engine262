import { surroundingAgent } from '../engine.mjs';
import { RequireInternalSlot, CreateIterResultObject } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function FinalizationGroupCleanupIteratorPrototype_next(args, { thisValue }) {
  // 1. Let iterator be the this value.
  const iterator = thisValue;
  // 2. If Type(iterator) is not Object, throw a TypeError exception.
  // 3. If iterator does not have a [[FinalizationGroup]] internal slot, throw a TypeError exception.
  Q(RequireInternalSlot(iterator, 'FinalizationGroup'));
  // 4. If iterator.[[FinalizationGroup]] is empty, throw a TypeError exception.
  if (iterator.FinalizationGroup === undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', Value.undefined);
  }
  // 5. Let finalizationGroup be iterator.[[FinalizationGroup]].
  const finalizationGroup = iterator.FinalizationGroup;
  // 6. Assert: Type(finalizationGroup) is Object.
  // 7. Assert: finalizationGroup has a [[Cells]] internal slot.
  X(RequireInternalSlot(finalizationGroup, 'Cells'));
  // 8. If finalizationGroup.[[Cells]] contains a Record cell such that cell.[[WeakRefTarget]] is empty, then an implementation may perform the following steps,
  const index = finalizationGroup.Cells.findIndex((cell) => cell.WeakRefTarget === undefined);
  if (index !== -1) {
    // a. Choose any such cell.
    const cell = finalizationGroup.Cells[index];
    // b. Remove cell from finalizationGroup.[[Cells]].
    finalizationGroup.Cells.splice(index, 1);
    // c. Return CreateIterResultObject(cell.[[HeldValue]], false).
    return CreateIterResultObject(cell.HeldValue, Value.false);
  }
  // 9. If the preceding steps were not performed,
  //   a. Return CreateIterResultObject(undefined, true).
  return CreateIterResultObject(Value.undefined, Value.true);
}

export function BootstrapFinalizationGroupCleanupIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', FinalizationGroupCleanupIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'FinalizationGroup Cleanup Iterator');

  realmRec.Intrinsics['%FinalizationGroupCleanupIteratorPrototype%'] = proto;
}
