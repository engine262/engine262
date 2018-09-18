import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateBuiltinFunction,
  CreateIterResultObject,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { Type, New as NewValue, wellKnownSymbols } from '../value.mjs';
import { X } from '../completion.mjs';

function SetIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('IteratedSet' in O && 'SetNextIndex' in O && 'SetIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError');
  }
  const s = O.IteratedSet;
  let index = O.SetNextIndex;
  const itemKind = O.SetIterationKind;
  if (Type(s) === 'Undefined') {
    return CreateIterResultObject(NewValue(undefined), NewValue(true));
  }
  Assert('SetData' in s);
  const entries = s.SetData;
  const numEntries = entries.length;
  while (index < numEntries) {
    const e = entries[index];
    index += 1;
    O.SetNextIndex = index;
    if (e !== undefined) {
      if (itemKind === 'key+value') {
        return CreateIterResultObject(CreateArrayFromList([e, e]), NewValue(false));
      }
      return CreateIterResultObject(e, NewValue(false));
    }
  }
  O.IteratedSet = NewValue(undefined);
  return CreateIterResultObject(NewValue(undefined), NewValue(true));
}

export function CreateSetIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%IteratorPrototype%']);

  {
    const fn = CreateBuiltinFunction(SetIteratorPrototype_next, [], realmRec);
    SetFunctionName(fn, NewValue('next'));
    SetFunctionLength(fn, NewValue(0));
    X(proto.DefineOwnProperty(NewValue('next'), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    }));
  }

  X(proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Set Iterator'),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));

  realmRec.Intrinsics['%SetIteratorPrototype%'] = proto;
}
