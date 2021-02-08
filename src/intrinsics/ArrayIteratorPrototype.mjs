import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
  Get,
  IsDetachedBuffer,
  LengthOfArrayLike,
  ToString,
  𝔽,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-%arrayiteratorprototype%-object
function ArrayIteratorPrototype_next(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, throw a TypeError exception.
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Array Iterator', O);
  }
  // 3. If O does not have all of the internal slots of an Array Iterator Instance (22.1.5.3), throw a TypeError exception.
  if (!('IteratedArrayLike' in O)
      || !('ArrayLikeNextIndex' in O)
      || !('ArrayLikeIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Array Iterator', O);
  }
  // 4. Let a be O.[[IteratedArrayLike]].
  const a = O.IteratedArrayLike;
  // 5. If a is undefined, return CreateIterResultObject(undefined, true).
  if (a === Value.undefined) {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  // 6. Let index be O.[[ArrayLikeNextIndex]].
  const index = O.ArrayLikeNextIndex;
  // 7. Let itemKind be O.[[ArrayLikeIterationKind]].
  const itemKind = O.ArrayLikeIterationKind;
  let len;
  // 8. If a has a [[TypedArrayName]] internal slot, then
  if ('TypedArrayName' in a) {
    // a. If IsDetachedBuffer(a.[[ViewedArrayBuffer]]) is true, throw a TypeError exception.
    if (IsDetachedBuffer(a.ViewedArrayBuffer) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
    }
    // b. Let len be a.[[ArrayLength]].
    len = a.ArrayLength;
  } else { // 9. Else,
    // a. Let len be ? LengthOfArrayLike(a).
    len = Q(LengthOfArrayLike(a));
  }
  // 10. If index ≥ len, then
  if (index >= len) {
    // a. Set O.[[IteratedArrayLike]] to undefined.
    O.IteratedArrayLike = Value.undefined;
    // b. Return CreateIterResultObject(undefined, true).
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  // 11. Set O.[[ArrayLikeNextIndex]] to index + 1.
  O.ArrayLikeNextIndex = index + 1;
  // 12. If itemKind is key, return CreateIterResultObject(index, false).
  if (itemKind === 'key') {
    return CreateIterResultObject(𝔽(index), Value.false);
  }
  // 13. Let elementKey be ! ToString(index).
  const elementKey = X(ToString(𝔽(index)));
  // 14. Let elementValue be ? Get(a, elementKey).
  const elementValue = Q(Get(a, elementKey));
  // 15. If itemKind is value, let result be elementValue.
  let result;
  // 15. If itemKind is value, let result be elementValue.
  if (itemKind === 'value') {
    result = elementValue;
  } else { // 16. Else,
    // a. Assert: itemKind is key+value.
    Assert(itemKind === 'key+value');
    // b. Let result be ! CreateArrayFromList(« index, elementValue »).
    result = X(CreateArrayFromList([𝔽(index), elementValue]));
  }
  // 17. Return CreateIterResultObject(result, false).
  return CreateIterResultObject(result, Value.false);
}

export function bootstrapArrayIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', ArrayIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Array Iterator');

  realmRec.Intrinsics['%ArrayIterator.prototype%'] = proto;
}
