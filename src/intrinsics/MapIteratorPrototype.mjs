import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

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
    return CreateIterResultObject(Value.undefined, Value.true);
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
      return CreateIterResultObject(result, Value.false);
    }
  }
  O.IteratedMap = Value.undefined;
  return CreateIterResultObject(Value.undefined, Value.true);
}

export function CreateMapIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', MapIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Map Iterator');

  realmRec.Intrinsics['%MapIteratorPrototype%'] = proto;
}
