import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import { ToPrimitive, ToBigInt, ToIndex } from '../abstract-ops/all.mjs';
import { NumberToBigInt } from '../runtime-semantics/all.mjs';
import { Q } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

// #sec-bigint-constructor
function BigIntConstructor([value], { NewTarget }) {
  // 1. If NewTarget is not undefined, throw a TypeError exception.
  if (NewTarget !== Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', 'BigInt');
  }
  // 2. Let prim be ? ToPrimitive(value, number).
  const prim = Q(ToPrimitive(value, 'number'));
  // 3. If Type(prim) is Number, return ? NumberToBigInt(prim).
  // 4. Otherwise, return ? ToBigInt(value).
  if (Type(prim) === 'Number') {
    return Q(NumberToBigInt(prim));
  } else {
    return Q(ToBigInt(value));
  }
}

// #sec-bigint.asintn
function BigInt_asIntN([bits = Value.undefined, bigint = Value.undefined]) {
  // 1. Set bits to ? ToIndex(bits).
  bits = Q(ToIndex(bits));
  // 2. Set bigint to ? ToBigInt(bigint).
  bigint = Q(ToBigInt(bigint));
  // 3. Let mod be the BigInt value that represents bigint modulo 2bits.
  // 4. If mod ≥ 2^bits - 1, return mod - 2^bits; otherwise, return mod.
  return new Value(BigInt.asIntN(bits.numberValue(), bigint.bigintValue()));
}

// #sec-bigint.asuintn
function BigInt_asUintN([bits = Value.undefined, bigint = Value.undefined]) {
  // 1. Set bits to ? ToIndex(bits).
  bits = Q(ToIndex(bits));
  // 2. Set bigint to ? ToBigInt(bigint).
  bigint = Q(ToBigInt(bigint));
  // 3. Return the BigInt value that represents bigint modulo 2^bits.
  return new Value(BigInt.asUintN(bits.numberValue(), bigint.bigintValue()));
}

export function BootstrapBigInt(realmRec) {
  const bigintConstructor = bootstrapConstructor(realmRec, BigIntConstructor, 'BigInt', 1, realmRec.Intrinsics['%BigInt.prototype%'], [
    ['asIntN', BigInt_asIntN, 2],
    ['asUintN', BigInt_asUintN, 2],
  ]);

  realmRec.Intrinsics['%BigInt%'] = bigintConstructor;
}
