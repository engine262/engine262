import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-%setiteratorprototype%.next
function SetIteratorPrototype_next(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, throw a TypeError exception.
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Set Iterator.prototype.next', O);
  }
  // 3. If O does not have all of the internal slots of a Set Iterator Instance (23.2.5.3), throw a TypeError exception.
  if (!('IteratedSet' in O && 'SetNextIndex' in O && 'SetIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Set Iterator.prototype.next', O);
  }
  // 4. Let s be O.[[IteratedSet]].
  const s = O.IteratedSet;
  // 5. Let index be O.[[SetNextIndex]].
  let index = O.SetNextIndex;
  // 6. Let itemKind be O.[[SetIterationKind]].
  const itemKind = O.SetIterationKind;
  // 7. If s is undefined, return CreateIterResultObject(undefined, true).
  if (s === Value.undefined) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  // 8. Assert: s has a [[SetData]] internal slot.
  Assert('SetData' in s);
  // 9. Let entries be the List that is s.[[SetData]].
  const entries = s.SetData;
  // 10. Let numEntries be the number of elements of entries.
  const numEntries = entries.length;
  // 11. NOTE: numEntries must be redetermined each time this method is evaluated.
  while (index < numEntries) {
    // a. Repeat, while index is less than numEntries,
    const e = entries[index];
    // b. Set index to index + 1.
    index += 1;
    // c. Set O.[[SetNextIndex]] to index.
    O.SetNextIndex = index;
    // e. If e is not empty, then
    if (e !== undefined) {
      // i. If itemKind is key+value, then
      if (itemKind === 'key+value') {
        // 1. If itemKind is key+value, then
        return CreateIterResultObject(CreateArrayFromList([e, e]), Value.false);
      }
      // ii. Assert: itemKind is value.
      Assert(itemKind === 'value');
      // iii. Return CreateIterResultObject(e, false).
      return CreateIterResultObject(e, Value.false);
    }
  }
  // 13. Set O.[[IteratedSet]] to undefined.
  O.IteratedSet = Value.undefined;
  // 14. Return CreateIterResultObject(undefined, true).
  return CreateIterResultObject(Value.undefined, Value.true);
}

export function BootstrapSetIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', SetIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Set Iterator');

  realmRec.Intrinsics['%SetIteratorPrototype%'] = proto;
}
