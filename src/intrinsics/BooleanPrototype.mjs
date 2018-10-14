import {
  Type,
  Value,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import { Assert } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function thisBooleanValue(value) {
  if (Type(value) === 'Boolean') {
    return value;
  }

  if (Type(value) === 'Object' && 'BooleanData' in value) {
    Assert(Type(value.BooleanData) === 'Boolean');
    return value.BooleanData;
  }

  return surroundingAgent.Throw('TypeError');
}

function BooleanProto_toString(argList, { thisValue }) {
  const b = Q(thisBooleanValue(thisValue));
  if (b === Value.true) {
    return new Value('true');
  }
  return new Value('false');
}

function BooleanProto_valueOf(argList, { thisValue }) {
  return Q(thisBooleanValue(thisValue));
}

export function CreateBooleanPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['toString', BooleanProto_toString, 0],
    ['valueOf', BooleanProto_valueOf, 0],
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  proto.BooleanData = Value.false;

  realmRec.Intrinsics['%BooleanPrototype%'] = proto;
}
