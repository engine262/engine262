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

// 20.1.3.2 #sec-number.prototype.toexponential
function NumberProto_toExponential(/* [fractionDigits] */) {
  return surroundingAgent.Throw('Error', 'Number.prototype.toExponential is not implemented');
}

// 20.1.3.3 #sec-number.prototype.tofixed
function NumberProto_toFixed(/* [fractionDigits] */) {
  return surroundingAgent.Throw('Error', 'Number.prototype.toFixed is not implemented');
}

// 20.1.3.4 #sec-number.prototype.tolocalestring
function NumberProto_toLocaleString() {
  return surroundingAgent.Throw('Error', 'Number.prototype.toLocaleString is not implemented');
}

// 20.1.3.5 #sec-number.prototype.toprecision
function NumberProto_toPrecision(/* [precision] */) {
  return surroundingAgent.Throw('Error', 'Number.prototype.toPrecision is not implemented');
}

// 20.1.3.6 #sec-number.prototype.tostring
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

// 20.1.3.7 #sec-number.prototype.valueof
function NumberProto_valueOf(args, { thisValue }) {
  return Q(thisNumberValue(thisValue));
}

export function CreateNumberPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['toExponential', NumberProto_toExponential, 1],
    ['toFixed', NumberProto_toFixed, 1],
    ['toLocaleString', NumberProto_toLocaleString, 0],
    ['toPrecision', NumberProto_toPrecision, 1],
    ['toString', NumberProto_toString, 0],
    ['valueOf', NumberProto_valueOf, 0],
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  proto.NumberData = new Value(0);

  realmRec.Intrinsics['%NumberPrototype%'] = proto;
}
