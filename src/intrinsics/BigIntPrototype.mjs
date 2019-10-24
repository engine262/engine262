import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import { Assert, ToInteger, ToString } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-thisbigintvalue
function thisBigIntValue(value) {
  // 1. If Type(value) is BigInt, return value.
  if (Type(value) === 'BigInt') {
    return value;
  }
  // 2. If Type(value) is Object and value has a [[BigIntData]] internal slot, then
  if (Type(value) === 'Object' && 'BigIntData' in value) {
    // a. Assert: Type(value.[[BigIntData]]) is BigInt.
    Assert(Type(value.BigIntData) === 'BigInt');
    // b. Return value.[[BigIntData]].
    return value.BigIntData;
  }
  // 3. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError');
}

// #sec-bigint.prototype.tolocalestring
function BigIntProto_toLocalString(args, { thisValue }) {
  return BigIntProto_toString(args, { thisValue });
}

// #sec-bigint.prototype.tostring
function BigIntProto_toString([radix], { thisValue }) {
  // 1. Let x be ? thisBigIntValue(this value).
  const x = Q(thisBigIntValue(thisValue));
  // 2. If radix is not present, let radixNumber be 10.
  let radixNumber;
  if (radix === undefined) {
    radixNumber = 10;
  } else if (radix === Value.undefined) {
    // 3. Else if radix is undefined, let radixNumber be 10.
    radixNumber = 10;
  } else {
    // 4. Else, let radixNumber be ? ToInteger(radix).
    radixNumber = Q(ToInteger(radix)).numberValue();
  }
  // 5. If radixNumber < 2 or radixNumber > 36, throw a RangeError exception.
  if (radixNumber < 2 || radixNumber > 36) {
    return surroundingAgent.Throw('RangeError');
  }
  // 6. If radixNumber = 10, return ! ToString(x).
  if (radixNumber === 10) {
    return X(ToString(x));
  }
  // 7. Return the String representation of this Number value using the radix specified by
  //    radixNumber. Letters a-z are used for digits with values 10 through 35. The precise
  //    algorithm is implementation-dependent, however the algorithm should be a
  //    generalization of that specified in 6.1.6.2.23.
  // TODO: Implementation stringification
  return new Value(x.bigintValue().toString(radixNumber));
}

// #sec-bigint.prototype.tostring
function BigIntProto_valueOf(args, { thisValue }) {
  // Return ? thisBigIntValue(this value).
  return Q(thisBigIntValue(thisValue));
}

export function CreateBigIntPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['toLocaleString', BigIntProto_toLocalString, 0],
    ['toString', BigIntProto_toString, 0],
    ['valueOf', BigIntProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'BigInt');

  realmRec.Intrinsics['%BigInt.prototype%'] = proto;
}
