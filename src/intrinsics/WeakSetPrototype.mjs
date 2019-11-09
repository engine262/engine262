import { surroundingAgent } from '../engine.mjs';
import {
  SameValue,
  RequireInternalSlot,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';


// 23.4.3.1 #sec-weakset.prototype.add
function WeakSetProto_add([value = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'WeakSetData'));
  if (Type(value) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', value);
  }
  const entries = S.WeakSetData;
  for (const e of entries) {
    if (e !== undefined && SameValue(e, value) === Value.true) {
      return S;
    }
  }
  entries.push(value);
  return S;
}

// 23.4.3.3 #sec-weakset.prototype.delete
function WeakSetProto_delete([value = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'WeakSetData'));
  if (Type(value) !== 'Object') {
    return Value.false;
  }
  const entries = S.WeakSetData;
  for (const [i, e] of entries.entries()) {
    if (e !== undefined && SameValue(e, value) === Value.true) {
      entries.remove(i);
      return Value.true;
    }
  }
  return Value.false;
}

// 23.4.3.4 #sec-weakset.prototype.has
function WeakSetProto_has([value = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'WeakSetData'));
  const entries = S.WeakSetData;
  for (const e of entries) {
    if (e !== undefined && SameValue(e, value) === Value.true) {
      return Value.true;
    }
  }
  return Value.false;
}

export function CreateWeakSetPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['add', WeakSetProto_add, 1],
    ['delete', WeakSetProto_delete, 1],
    ['has', WeakSetProto_has, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'WeakSet');

  realmRec.Intrinsics['%WeakSet.prototype%'] = proto;
}
