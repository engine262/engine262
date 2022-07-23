import {
  Type,
  Value,
  NumberValue,
} from '../value.mjs';
import {
  Assert,
  ToIntegerOrInfinity,
  ToString,
  F,
} from '../abstract-ops/all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

function thisNumberValue(value) {
  if (Type(value) === 'Number') {
    return value;
  }
  if (Type(value) === 'Object' && 'NumberData' in value) {
    const n = value.NumberData;
    Assert(Type(n) === 'Number');
    return n;
  }
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Number', value);
}

// #sec-number.prototype.toexponential
function NumberProto_toExponential([fractionDigits = Value.undefined], { thisValue }) {
  const x = Q(thisNumberValue(thisValue));
  const f = Q(ToIntegerOrInfinity(fractionDigits));
  Assert(fractionDigits !== Value.undefined || f === 0);
  if (!x.isFinite()) {
    return NumberValue.toString(x);
  }
  if (f < 0 || f > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toExponential');
  }
  return new Value(x.numberValue().toExponential(fractionDigits === Value.undefined ? undefined : f));
}

// 20.1.3.3 #sec-number.prototype.tofixed
function NumberProto_toFixed([fractionDigits = Value.undefined], { thisValue }) {
  const x = Q(thisNumberValue(thisValue));
  const f = Q(ToIntegerOrInfinity(fractionDigits));
  Assert(fractionDigits !== Value.undefined || f === 0);
  if (f < 0 || f > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toFixed');
  }
  if (!x.isFinite()) {
    return X(NumberValue.toString(x));
  }
  return new Value(x.numberValue().toFixed(f));
}

// 20.1.3.4 #sec-number.prototype.tolocalestring
function NumberProto_toLocaleString(args, { thisValue }) {
  return NumberProto_toString([], { thisValue });
}

// 20.1.3.5 #sec-number.prototype.toprecision
function NumberProto_toPrecision([precision = Value.undefined], { thisValue }) {
  const x = Q(thisNumberValue(thisValue));
  if (precision === Value.undefined) {
    return X(ToString(x));
  }
  const p = Q(ToIntegerOrInfinity(precision));
  if (!x.isFinite()) {
    return X(NumberValue.toString(x));
  }
  if (p < 1 || p > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toPrecision');
  }
  return new Value(x.numberValue().toPrecision(p));
}

// 20.1.3.6 #sec-number.prototype.tostring
function NumberProto_toString([radix = Value.undefined], { thisValue }) {
  const x = Q(thisNumberValue(thisValue));
  let radixNumber;
  if (radix === Value.undefined) {
    radixNumber = 10;
  } else {
    radixNumber = Q(ToIntegerOrInfinity(radix));
  }
  if (radixNumber < 2 || radixNumber > 36) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toString');
  }
  if (radixNumber === 10) {
    return X(ToString(x));
  }
  // FIXME(devsnek): Return the String representation of this Number
  // value using the radix specified by radixNumber. Letters a-z are
  // used for digits with values 10 through 35. The precise algorithm
  // is implementation-dependent, however the algorithm should be a
  // generalization of that specified in 7.1.12.1.
  return new Value(x.numberValue().toString(radixNumber));
}

// 20.1.3.7 #sec-number.prototype.valueof
function NumberProto_valueOf(args, { thisValue }) {
  return Q(thisNumberValue(thisValue));
}

export function bootstrapNumberPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['toExponential', NumberProto_toExponential, 1],
    ['toFixed', NumberProto_toFixed, 1],
    ['toLocaleString', NumberProto_toLocaleString, 0],
    ['toPrecision', NumberProto_toPrecision, 1],
    ['toString', NumberProto_toString, 1],
    ['valueOf', NumberProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  proto.NumberData = F(+0);

  realmRec.Intrinsics['%Number.prototype%'] = proto;
}
