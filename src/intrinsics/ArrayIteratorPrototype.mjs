import {
  surroundingAgent,
} from '../engine.mjs';
import {
  New as NewValue,
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateBuiltinFunction,
  CreateIterResultObject,
  Get,
  ObjectCreate,
  ToLength,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';

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
    return CreateIterResultObject(NewValue(undefined), NewValue(true));
  }
  const index = O.ArrayIteratorNextIndex;
  const itemKind = O.ArrayIterationKind;
  let len;
  if ('TypedArrayName' in a) {
    // a. If IsDetachedBuffer(a.[[ViewedArrayBuffer]]) is true, throw a TypeError exception.
    // b Let len be a.[[ArrayLength]].
  } else {
    const lenProp = Q(Get(a, NewValue('length')));
    len = Q(ToLength(lenProp));
  }
  if (index >= len.numberValue()) {
    O.IteratedObject = NewValue(undefined);
    return CreateIterResultObject(NewValue(undefined), NewValue(true));
  }
  O.ArrayIteratorNextIndex = index + 1;
  if (itemKind === 'key') {
    return CreateIterResultObject(NewValue(index), NewValue(false));
  }
  const elementKey = X(ToString(NewValue(index)));
  const elementValue = Q(Get(a, elementKey));
  let result;
  if (itemKind === 'value') {
    result = elementValue;
  } else {
    Assert(itemKind === 'key+value');
    result = CreateArrayFromList([NewValue(index), elementValue]);
  }
  return CreateIterResultObject(result, NewValue(false));
}

export function CreateArrayIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%IteratorPrototype%']);

  proto.DefineOwnProperty(NewValue('next'), {
    Value: CreateBuiltinFunction(ArrayIteratorPrototype_next, [], realmRec),
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Array Iterator'),
    Writable: false,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
