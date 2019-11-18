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
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function ArrayIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Array Iterator', O);
  }
  if (!('IteratedArrayLike' in O)
      || !('ArrayLikeNextIndex' in O)
      || !('ArrayLikeIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Array Iterator', O);
  }
  const a = O.IteratedArrayLike;
  if (Type(a) === 'Undefined') {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  const index = O.ArrayLikeNextIndex;
  const itemKind = O.ArrayLikeIterationKind;
  let len;
  if ('TypedArrayName' in a) {
    if (IsDetachedBuffer(a.ViewedArrayBuffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    len = a.ArrayLength;
  } else {
    len = Q(LengthOfArrayLike(a));
  }
  if (index >= len.numberValue()) {
    O.IteratedArrayLike = Value.undefined;
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  O.ArrayLikeNextIndex = index + 1;
  if (itemKind === 'key') {
    return CreateIterResultObject(new Value(index), Value.false);
  }
  const elementKey = X(ToString(new Value(index)));
  const elementValue = Q(Get(a, elementKey));
  let result;
  if (itemKind === 'value') {
    result = elementValue;
  } else {
    Assert(itemKind === 'key+value');
    result = X(CreateArrayFromList([new Value(index), elementValue]));
  }
  return CreateIterResultObject(result, Value.false);
}

export function CreateArrayIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', ArrayIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Array Iterator');

  realmRec.Intrinsics['%ArrayIterator.prototype%'] = proto;
}
