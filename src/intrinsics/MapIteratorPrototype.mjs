import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';


// #sec-%mapiteratorprototype%.next
function MapIteratorPrototype_next(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, throw a TypeError exception.
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Map Iterator', O);
  }
  // 3. If O does not have all of the internal slots of a Map Iterator Instance (23.1.5.3), throw a TypeError exception.
  if (!('IteratedMap' in O && 'MapNextIndex' in O && 'MapIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Map Iterator', O);
  }
  // 4. Let m be O.[[IteratedMap]].
  const m = O.IteratedMap;
  // 5. Let index be O.[[MapNextIndex]].
  let index = O.MapNextIndex;
  // 6. Let index be O.[[MapNextIndex]].
  const itemKind = O.MapIterationKind;
  // 7. If m is undefined, return CreateIterResultObject(undefined, true).
  if (m === Value.undefined) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  // 8. Assert: m has a [[MapData]] internal slot.
  Assert('MapData' in m);
  // 9. Let entries be the List that is m.[[MapData]].
  const entries = m.MapData;
  // 10. Let numEntries be the number of elements of entries.
  const numEntries = entries.length;
  // 11. NOTE: numEntries must be redetermined each time this method is evaluated.
  // 12. Repeat, while index is less than numEntries,
  while (index < numEntries) {
    // a. Let e be the Record { [[Key]], [[Value]] } that is the value of entries[index].
    const e = entries[index];
    // b. Set index to index + 1.
    index += 1;
    // c. Set O.[[MapNextIndex]] to index.
    O.MapNextIndex = index;
    // d. If e.[[Key]] is not empty, then
    if (e.Key !== undefined) {
      let result;
      // i. If itemKind is key, let result be e.[[Key]].
      if (itemKind === 'key') {
        result = e.Key;
      } else if (itemKind === 'value') { // ii. Else if itemKind is value, let result be e.[[Value]].
        result = e.Value;
      } else { // iii. Else,
        // 1. Assert: itemKind is key+value.
        Assert(itemKind === 'key+value');
        // 2. Let result be ! CreateArrayFromList(« e.[[Key]], e.[[Value]] »).
        result = X(CreateArrayFromList([e.Key, e.Value]));
      }
      // iv. Return CreateIterResultObject(result, false).
      return CreateIterResultObject(result, Value.false);
    }
  }
  // 13. Set O.[[IteratedMap]] to undefined.
  O.IteratedMap = Value.undefined;
  // 14. Return CreateIterResultObject(undefined, true).
  return CreateIterResultObject(Value.undefined, Value.true);
}

export function BootstrapMapIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', MapIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Map Iterator');

  realmRec.Intrinsics['%MapIteratorPrototype%'] = proto;
}
