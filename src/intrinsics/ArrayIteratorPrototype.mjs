import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
  Get,
  ToLength,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function ArrayIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', '%ArrayIteratorPrototype%.next called on a non-object');
  }
  if (!('IteratedObject' in O)
      || !('ArrayIteratorNextIndex' in O)
      || !('ArrayIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', '%ArrayIteratorPrototype%.next called on incompatible receiver');
  }
  const a = O.IteratedObject;
  if (Type(a) === 'Undefined') {
    return CreateIterResultObject(new Value(undefined), new Value(true));
  }
  const index = O.ArrayIteratorNextIndex;
  const itemKind = O.ArrayIterationKind;
  let len;
  if ('TypedArrayName' in a) {
    // a. If IsDetachedBuffer(a.[[ViewedArrayBuffer]]) is true, throw a TypeError exception.
    // b Let len be a.[[ArrayLength]].
  } else {
    const lenProp = Q(Get(a, new Value('length')));
    len = Q(ToLength(lenProp));
  }
  if (index >= len.numberValue()) {
    O.IteratedObject = new Value(undefined);
    return CreateIterResultObject(new Value(undefined), new Value(true));
  }
  O.ArrayIteratorNextIndex = index + 1;
  if (itemKind === 'key') {
    return CreateIterResultObject(new Value(index), new Value(false));
  }
  const elementKey = X(ToString(new Value(index)));
  const elementValue = Q(Get(a, elementKey));
  let result;
  if (itemKind === 'value') {
    result = elementValue;
  } else {
    Assert(itemKind === 'key+value');
    result = CreateArrayFromList([new Value(index), elementValue]);
  }
  return CreateIterResultObject(result, new Value(false));
}

export function CreateArrayIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', ArrayIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Array Iterator');

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
