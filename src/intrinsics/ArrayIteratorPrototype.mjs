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
import { msg } from '../helpers.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function ArrayIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', msg('NotAnTypeObject', 'Array Iterator', O));
  }
  if (!('IteratedObject' in O)
      || !('ArrayIteratorNextIndex' in O)
      || !('ArrayIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotAnTypeObject', 'Array Iterator', O));
  }
  const a = O.IteratedObject;
  if (Type(a) === 'Undefined') {
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  const index = O.ArrayIteratorNextIndex;
  const itemKind = O.ArrayIterationKind;
  let len;
  if ('TypedArrayName' in a) {
    if (IsDetachedBuffer(a.ViewedArrayBuffer)) {
      return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
    }
    len = a.ArrayLength;
  } else {
    len = Q(LengthOfArrayLike(a));
  }
  if (index >= len.numberValue()) {
    O.IteratedObject = Value.undefined;
    return CreateIterResultObject(Value.undefined, Value.true);
  }
  O.ArrayIteratorNextIndex = index + 1;
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

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
