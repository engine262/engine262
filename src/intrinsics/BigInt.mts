// @ts-nocheck
import { surroundingAgent } from '../engine.mts';
import { NumberValue, Value } from '../value.mts';
import {
  ToBigInt,
  ToIndex,
  ToPrimitive,
  Z, R,
} from '../abstract-ops/all.mts';
import { NumberToBigInt } from '../runtime-semantics/all.mts';
import { Q } from '../completion.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-bigint-constructor */
function BigIntConstructor([value], { NewTarget }) {
  // 1. If NewTarget is not undefined, throw a TypeError exception.
  if (NewTarget !== Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', 'BigInt');
  }
  // 2. Let prim be ? ToPrimitive(value, number).
  const prim = Q(ToPrimitive(value, 'number'));
  // 3. If Type(prim) is Number, return ? NumberToBigInt(prim).
  // 4. Otherwise, return ? ToBigInt(prim).
  if (prim instanceof NumberValue) {
    return Q(NumberToBigInt(prim));
  } else {
    return Q(ToBigInt(prim));
  }
}

/** https://tc39.es/ecma262/#sec-bigint.asintn */
function BigInt_asIntN([bits = Value.undefined, bigint = Value.undefined]) {
  // 1. Set bits to ? ToIndex(bits).
  bits = Q(ToIndex(bits));
  // 2. Set bigint to ? ToBigInt(bigint).
  bigint = Q(ToBigInt(bigint));
  // 3. Let mod be the BigInt value that represents bigint modulo 2bits.
  // 4. If mod ≥ 2^bits - 1, return mod - 2^bits; otherwise, return mod.
  return Z(BigInt.asIntN(bits, R(bigint)));
}

/** https://tc39.es/ecma262/#sec-bigint.asuintn */
function BigInt_asUintN([bits = Value.undefined, bigint = Value.undefined]) {
  // 1. Set bits to ? ToIndex(bits).
  bits = Q(ToIndex(bits));
  // 2. Set bigint to ? ToBigInt(bigint).
  bigint = Q(ToBigInt(bigint));
  // 3. Let mod be ℝ(bigint) modulo 2 ** bits.
  // 4. If mod ≥ 2 ** (bits - 1), return Z(mod - 2 ** bits); otherwise, return Z(mod).
  return Z(BigInt.asUintN(bits, R(bigint)));
}

export function bootstrapBigInt(realmRec) {
  const bigintConstructor = bootstrapConstructor(realmRec, BigIntConstructor, 'BigInt', 1, realmRec.Intrinsics['%BigInt.prototype%'], [
    ['asIntN', BigInt_asIntN, 2],
    ['asUintN', BigInt_asUintN, 2],
  ]);

  realmRec.Intrinsics['%BigInt%'] = bigintConstructor;
}
