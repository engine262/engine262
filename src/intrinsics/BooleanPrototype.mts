// @ts-nocheck
import {
  ObjectValue,
  BooleanValue,
  Value,
} from '../value.mts';
import {
  surroundingAgent,
} from '../engine.mts';
import { Assert } from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';


function thisBooleanValue(value) {
  if (value instanceof BooleanValue) {
    return value;
  }

  if (value instanceof ObjectValue && 'BooleanData' in value) {
    const b = value.BooleanData;
    Assert(b instanceof BooleanValue);
    return b;
  }

  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Boolean', value);
}

/** https://tc39.es/ecma262/#sec-boolean.prototype.tostring */
function BooleanProto_toString(argList, { thisValue }) {
  // 1. Let b be ? thisBooleanValue(this value).
  const b = Q(thisBooleanValue(thisValue));
  // 2. If b is true, return "true"; else return "false".
  if (b === Value.true) {
    return Value('true');
  }
  return Value('false');
}

/** https://tc39.es/ecma262/#sec-boolean.prototype.valueof */
function BooleanProto_valueOf(argList, { thisValue }) {
  // 1. Return ? thisBooleanValue(this value).
  return Q(thisBooleanValue(thisValue));
}

export function bootstrapBooleanPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['toString', BooleanProto_toString, 0],
    ['valueOf', BooleanProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  proto.BooleanData = Value.false;

  realmRec.Intrinsics['%Boolean.prototype%'] = proto;
}
