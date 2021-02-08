import { surroundingAgent } from '../engine.mjs';
import { Assert, IsIntegralNumber, Z } from '../abstract-ops/all.mjs';
import { Value, Type } from '../value.mjs';

// #sec-numbertobigint
export function NumberToBigInt(number) {
  // 1. Assert: Type(number) is Number.
  Assert(Type(number) === 'Number');
  // 2. If IsIntegralNumber(number) is false, throw a RangeError exception.
  if (IsIntegralNumber(number) === Value.false) {
    return surroundingAgent.Throw('RangeError', 'CannotConvertDecimalToBigInt', number);
  }
  // 3. Return the BigInt value that represents the mathematical value of number.
  return Z(BigInt(number.numberValue()));
}
