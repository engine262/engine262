// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIteratorFromClosure,
  GeneratorResume,
  RequireInternalSlot,
  Yield,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

const kSetIteratorPrototype = Value.of('%SetIteratorPrototype%');

/** http://tc39.es/ecma262/#sec-createsetiterator */
export function CreateSetIterator(set, kind) {
  // 1. Assert: kind is key+value or value.
  Assert(kind === 'key+value' || kind === 'value');
  // 2. Perform ? RequireInternalSlot(set, [[SetData]]).
  Q(RequireInternalSlot(set, 'SetData'));
  // 3. Let closure be a new Abstract Closure with no parameters that captures set and kind and performs the following steps when called:
  const closure = function* closure() {
    // a. Let index be 0.
    let index = 0;
    // b. Let entries be the List that is set.[[SetData]].
    const entries = set.SetData;
    // c. Let numEntries be the number of elements of entries.
    let numEntries = entries.length;
    // d. Repeat, while index < numEntries,
    while (index < numEntries) {
      // i. Let e be entries[index].
      const e = entries[index];
      // ii. Set index to index + 1.
      index += 1;
      // iii. If e is not empty, then
      if (e !== undefined) {
        // 1. If kind is key+value, then
        if (kind === 'key+value') {
          // a. Perform ? Yield(! CreateArrayFromList(« e, e »)).
          Q(yield* Yield(X(CreateArrayFromList([e, e]))));
        } else { // 2. Else,
          // a. Assert: kind is value.
          Assert(kind === 'value');
          // b. Perform ? Yield(e).
          Q(yield* Yield(e));
        }
      }
      // iv. Set numEntries to the number of elements of entries.
      numEntries = entries.length;
    }
    // e. Return undefined.
    return Value.undefined;
  };
  // 4. Return ! CreateIteratorFromClosure(closure, "%SetIteratorPrototype%", %SetIteratorPrototype%).
  return X(CreateIteratorFromClosure(closure, kSetIteratorPrototype, surroundingAgent.intrinsic('%SetIteratorPrototype%')));
}

/** http://tc39.es/ecma262/#sec-%setiteratorprototype%.next */
function SetIteratorPrototype_next(args, { thisValue }) {
  // 1. Return ? GeneratorResume(this value, empty, "%SetIteratorPrototype%").
  return Q(GeneratorResume(thisValue, undefined, kSetIteratorPrototype));
}

export function bootstrapSetIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', SetIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Set Iterator');

  realmRec.Intrinsics['%SetIteratorPrototype%'] = proto;
}
