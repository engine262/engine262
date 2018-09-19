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

function MapIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (!('IteratedMap' in O && 'MapNextIndex' in O && 'MapIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError');
  }
  const s = O.IteratedMap;
  let index = O.MapNextIndex;
  const itemKind = O.MapIterationKind;
  if (Type(s) === 'Undefined') {
    return CreateIterResultObject(NewValue(undefined), NewValue(true));
  }
  Assert('MapData' in s);
  const entries = s.MapData;
  const numEntries = entries.length;
  while (index < numEntries) {
    const e = entries[index];
    index += 1;
    O.MapNextIndex = index;
    if (e.Key !== undefined) {
      let result;
      if (itemKind === 'key') {
        result = e.Key;
      } else if (itemKind === 'value') {
        result = e.Value;
      } else {
        Assert(itemKind === 'key+value');
        result = CreateArrayFromList([e.Key, e.Value]);
      }
      return CreateIterResultObject(result, NewValue(false));
    }
  }
  O.IteratedMap = NewValue(undefined);
  return CreateIterResultObject(NewValue(undefined), NewValue(true));
}

export function CreateMapIteratorPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%IteratorPrototype%']);

  {
    const fn = CreateBuiltinFunction(MapIteratorPrototype_next, [], realmRec);
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
    Value: NewValue('Map Iterator'),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));

  realmRec.Intrinsics['%MapIteratorPrototype%'] = proto;
}
