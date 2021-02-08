import {
  Type,
  Value,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import { Assert } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';


function thisBooleanValue(value) {
  if (Type(value) === 'Boolean') {
    return value;
  }

  if (Type(value) === 'Object' && 'BooleanData' in value) {
    const b = value.BooleanData;
    Assert(Type(b) === 'Boolean');
    return b;
  }

  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Boolean', value);
}

// #sec-boolean.prototype.tostring
function BooleanProto_toString(argList, { thisValue }) {
  // 1. Let b be ? thisBooleanValue(this value).
  const b = Q(thisBooleanValue(thisValue));
  // 2. If b is true, return "true"; else return "false".
  if (b === Value.true) {
    return new Value('true');
  }
  return new Value('false');
}

// #sec-boolean.prototype.valueof
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
