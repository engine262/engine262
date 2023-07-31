// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  Assert, IsIntegralNumber, Z, R,
} from '../abstract-ops/all.mjs';
import { Value, NumberValue } from '../value.mjs';

/** https://tc39.es/ecma262/#sec-numbertobigint */
export function NumberToBigInt(number) {
  // 1. Assert: Type(number) is Number.
  Assert(number instanceof NumberValue);
  // 2. If IsIntegralNumber(number) is false, throw a RangeError exception.
  if (IsIntegralNumber(number) === Value.false) {
    return surroundingAgent.Throw('RangeError', 'CannotConvertDecimalToBigInt', number);
  }
  // 3. Return the BigInt value that represents the mathematical value of number.
  return Z(BigInt(R(number)));
}
