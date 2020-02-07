import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateIterResultObject,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function SetIteratorPrototype_next(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Set Iterator.prototype.next', O);
  }
  if (!('IteratedSet' in O && 'SetNextIndex' in O && 'SetIterationKind' in O)) {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Set Iterator.prototype.next', O);
  }
  const s = O.IteratedSet;
  let index = O.SetNextIndex;
  const itemKind = O.SetIterationKind;
  if (Type(s) === 'Undefined') {
    return CreateIterResultObject(Value.undefined, Value.true);
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
        return CreateIterResultObject(CreateArrayFromList([e, e]), Value.false);
      }
      return CreateIterResultObject(e, Value.false);
    }
  }
  O.IteratedSet = Value.undefined;
  return CreateIterResultObject(Value.undefined, Value.true);
}

export function BootstrapSetIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['next', SetIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Set Iterator');

  realmRec.Intrinsics['%SetIteratorPrototype%'] = proto;
}
