import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { Type, Value, wellKnownSymbols } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

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
    return CreateIterResultObject(new Value(undefined), new Value(true));
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
        return CreateIterResultObject(CreateArrayFromList([e, e]), new Value(false));
      }
      return CreateIterResultObject(e, new Value(false));
    }
  }
  O.IteratedSet = new Value(undefined);
  return CreateIterResultObject(new Value(undefined), new Value(true));
}

export function CreateSetIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', SetIteratorPrototype_next, 0],
    [wellKnownSymbols.toStringTag, new Value('Set Iterator')],
  ], realmRec.Intrinsics['%IteratorPrototype%']);

  realmRec.Intrinsics['%SetIteratorPrototype%'] = proto;
}
