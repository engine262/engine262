import { surroundingAgent } from '../engine.mjs';
import { IsInteger, Assert } from '../abstract-ops/all.mjs';
import { Value, Type } from '../value.mjs';

// #sec-numbertobigint
export function NumberToBigInt(number) {
  // 1. Assert: Type(number) is Number.
  Assert(Type(number) === 'Number');
  // 2. If IsInteger(number) is false, throw a RangeError exception.
  if (IsInteger(number) === Value.false) {
    return surroundingAgent.Throw('RangeError', 'CannotConvertDecimalToBigInt', number);
  }
  // 3. Return the BigInt value that represents the mathematical value of number.
  return new Value(BigInt(number.numberValue()));
}
