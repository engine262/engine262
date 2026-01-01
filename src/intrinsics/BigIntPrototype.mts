import { surroundingAgent } from '../host-defined/engine.mts';
import {
  ObjectValue, BigIntValue, Value,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  Q, X, type ValueCompletion, type ValueEvaluator,
} from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import {
  Assert, ToIntegerOrInfinity, ToString, R,
} from '#self';
import type { Realm } from '#self';

/** https://tc39.es/ecma262/#sec-thisbigintvalue */
function thisBigIntValue(value: Value) {
  // 1. If Type(value) is BigInt, return value.
  if (value instanceof BigIntValue) {
    return value;
  }
  // 2. If Type(value) is Object and value has a [[BigIntData]] internal slot, then
  if (value instanceof ObjectValue && 'BigIntData' in value) {
    // a. Assert: Type(value.[[BigIntData]]) is BigInt.
    Assert(value.BigIntData instanceof BigIntValue);
    // b. Return value.[[BigIntData]].
    return value.BigIntData;
  }
  // 3. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'BigInt', value);
}

/** https://tc39.es/ecma262/#sec-bigint.prototype.tolocalestring */
function BigIntProto_toLocaleString(args: Arguments, context: FunctionCallContext): ValueEvaluator {
  return BigIntProto_toString(args, context);
}

/** https://tc39.es/ecma262/#sec-bigint.prototype.tostring */
function* BigIntProto_toString([radix]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
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
    // 4. Else, let radixNumber be ? ToIntegerOrInfinity(radix).
    radixNumber = Q(yield* ToIntegerOrInfinity(radix));
  }
  // 5. If radixNumber < 2 or radixNumber > 36, throw a RangeError exception.
  if (radixNumber < 2 || radixNumber > 36) {
    return surroundingAgent.Throw('RangeError', 'InvalidRadix');
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
  return Value(R(x).toString(radixNumber));
}

/** https://tc39.es/ecma262/#sec-bigint.prototype.tostring */
function BigIntProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // Return ? thisBigIntValue(this value).
  return Q(thisBigIntValue(thisValue));
}

export function bootstrapBigIntPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['toLocaleString', BigIntProto_toLocaleString, 0],
    ['toString', BigIntProto_toString, 0],
    ['valueOf', BigIntProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'BigInt');

  realmRec.Intrinsics['%BigInt.prototype%'] = proto;
}
