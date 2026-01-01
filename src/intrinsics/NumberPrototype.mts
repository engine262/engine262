import {
  ObjectValue,
  Value,
  NumberValue,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Q, X, type ValueCompletion, type ValueEvaluator,
} from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import type { NumberObject } from './Number.mts';
import {
  Assert,
  ToIntegerOrInfinity,
  ToString,
  F, R,
  Realm,
} from '#self';

function thisNumberValue(value: Value) {
  if (value instanceof NumberValue) {
    return value;
  }
  if (value instanceof ObjectValue && 'NumberData' in value) {
    const n = value.NumberData;
    Assert(n instanceof NumberValue);
    return n;
  }
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Number', value);
}

/** https://tc39.es/ecma262/#sec-number.prototype.toexponential */
function* NumberProto_toExponential([fractionDigits = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const x = Q(thisNumberValue(thisValue));
  const f = Q(yield* ToIntegerOrInfinity(fractionDigits));
  Assert(fractionDigits !== Value.undefined || f === 0);
  if (!x.isFinite()) {
    return NumberValue.toString(x, 10);
  }
  if (f < 0 || f > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toExponential');
  }
  return Value(R(x).toExponential(fractionDigits === Value.undefined ? undefined : f));
}

/** https://tc39.es/ecma262/#sec-number.prototype.tofixed */
function* NumberProto_toFixed([fractionDigits = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const x = Q(thisNumberValue(thisValue));
  const f = Q(yield* ToIntegerOrInfinity(fractionDigits));
  Assert(fractionDigits !== Value.undefined || f === 0);
  if (f < 0 || f > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toFixed');
  }
  if (!x.isFinite()) {
    return X(NumberValue.toString(x, 10));
  }
  return Value(R(x).toFixed(f));
}

/** https://tc39.es/ecma262/#sec-number.prototype.tolocalestring */
function NumberProto_toLocaleString(_args: Arguments, context: FunctionCallContext): ValueEvaluator {
  return NumberProto_toString([], context);
}

/** https://tc39.es/ecma262/#sec-number.prototype.toprecision */
function* NumberProto_toPrecision([precision = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const x = Q(thisNumberValue(thisValue));
  if (precision === Value.undefined) {
    return X(ToString(x));
  }
  const p = Q(yield* ToIntegerOrInfinity(precision));
  if (!x.isFinite()) {
    return X(NumberValue.toString(x, 10));
  }
  if (p < 1 || p > 100) {
    return surroundingAgent.Throw('RangeError', 'NumberFormatRange', 'toPrecision');
  }
  return Value(R(x).toPrecision(p));
}

/** https://tc39.es/ecma262/#sec-number.prototype.tostring */
function* NumberProto_toString([radix = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const x = Q(thisNumberValue(thisValue));
  let radixNumber;
  if (radix === Value.undefined) {
    radixNumber = 10;
  } else {
    radixNumber = Q(yield* ToIntegerOrInfinity(radix));
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
  return Value(R(x).toString(radixNumber));
}

/** https://tc39.es/ecma262/#sec-number.prototype.valueof */
function NumberProto_valueOf(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  return Q(thisNumberValue(thisValue));
}

export function bootstrapNumberPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['toExponential', NumberProto_toExponential, 1],
    ['toFixed', NumberProto_toFixed, 1],
    ['toLocaleString', NumberProto_toLocaleString, 0],
    ['toPrecision', NumberProto_toPrecision, 1],
    ['toString', NumberProto_toString, 1],
    ['valueOf', NumberProto_valueOf, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  (proto as Mutable<NumberObject>).NumberData = F(+0);

  realmRec.Intrinsics['%Number.prototype%'] = proto;
}
