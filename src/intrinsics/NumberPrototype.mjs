import {
  Type,
  Value,
} from '../value.mjs';
import {
  ToInteger,
  ToString,
} from '../abstract-ops/all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function thisNumberValue(value) {
  if (Type(value) === 'Number') {
    return value;
  }
  if (Type(value) === 'Object' && 'NumberData' in value) {
    return value.NumberData;
  }
  return surroundingAgent.Throw('TypeError');
}

function NumberProto_toString(args, { thisValue }) {
  const [radix] = args;
  const x = Q(thisNumberValue(thisValue));
  let radixNumber;
  if (args.length === 0 || Type(radix) === 'Undefined') {
    radixNumber = 10;
  } else {
    radixNumber = Q(ToInteger(radix)).numberValue();
  }
  if (radixNumber < 2 || radixNumber > 36) {
    return surroundingAgent.Throw('TypeError');
  }
  if (radixNumber === 10) {
    return X(ToString(x));
  }
  // FIXME(devsnek): Return the String representation of this Number
  // value using the radix specified by radixNumber. Letters a-z are
  // used for digits with values 10 through 35. The precise algorithm
  // is implementation-dependent, however the algorithm should be a
  // generalization of that specified in 7.1.12.1.
  return surroundingAgent.Throw('TypeError', 'NumberToString');
}

function NumberProto_valueOf(args, { thisValue }) {
  return Q(thisNumberValue(thisValue));
}

export function CreateNumberPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['toString', NumberProto_toString, 0],
    ['valueOf', NumberProto_valueOf, 0],
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  proto.NumberData = new Value(0);

  realmRec.Intrinsics['%NumberPrototype%'] = proto;
}
