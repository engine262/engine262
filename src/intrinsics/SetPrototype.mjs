import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  IsCallable,
  ObjectCreate,
  SameValueZero,
  RequireInternalSlot,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// 23.2.5.1 #sec-createsetiterator
function CreateSetIterator(set, kind) {
  Q(RequireInternalSlot(set, 'SetData'));
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%SetIteratorPrototype%'), [
    'IteratedSet',
    'SetNextIndex',
    'SetIterationKind',
  ]);
  iterator.IteratedSet = set;
  iterator.SetNextIndex = 0;
  iterator.SetIterationKind = kind;
  return iterator;
}

function SetProto_add([value = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'SetData'));
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      return S;
    }
  }
  if (Type(value) === 'Number' && Object.is(value.numberValue(), -0)) {
    value = new Value(0);
  }
  entries.push(value);
  return S;
}

function SetProto_clear(args, { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'SetData'));
  const entries = S.SetData;
  for (let i = 0; i < entries.length; i += 1) {
    entries[i] = undefined;
  }
  return Value.undefined;
}

function SetProto_delete([value = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'SetData'));
  const entries = S.SetData;
  for (let i = 0; i < entries.length; i += 1) {
    const e = entries[i];
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      entries[i] = undefined;
      return Value.true;
    }
  }
  return Value.false;
}

function SetProto_entries(args, { thisValue }) {
  const S = thisValue;
  return Q(CreateSetIterator(S, 'key+value'));
}

function SetProto_forEach([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'SetData'));
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined) {
      Q(Call(callbackfn, thisArg, [e, e, S]));
    }
  }
  return Value.undefined;
}

function SetProto_has([value = Value.undefined], { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'SetData'));
  const entries = S.SetData;
  for (const e of entries) {
    if (e !== undefined && SameValueZero(e, value) === Value.true) {
      return Value.true;
    }
  }
  return Value.false;
}

function SetProto_values(args, { thisValue }) {
  const S = thisValue;
  return Q(CreateSetIterator(S, 'value'));
}

function SetProto_sizeGetter(args, { thisValue }) {
  const S = thisValue;
  Q(RequireInternalSlot(S, 'SetData'));
  const entries = S.SetData;
  let count = 0;
  for (const e of entries) {
    if (e !== undefined) {
      count += 1;
    }
  }
  return new Value(count);
}

export function BootstrapSetPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['add', SetProto_add, 1],
    ['clear', SetProto_clear, 0],
    ['delete', SetProto_delete, 1],
    ['entries', SetProto_entries, 0],
    ['forEach', SetProto_forEach, 1],
    ['has', SetProto_has, 1],
    ['size', [SetProto_sizeGetter]],
    ['values', SetProto_values, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Set');

  const valuesFunc = X(proto.GetOwnProperty(new Value('values')));
  X(proto.DefineOwnProperty(new Value('keys'), valuesFunc));
  X(proto.DefineOwnProperty(wellKnownSymbols.iterator, valuesFunc));

  realmRec.Intrinsics['%Set.prototype%'] = proto;
}
