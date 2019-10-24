import { surroundingAgent } from '../engine.mjs';
import { IsInteger, Assert } from '../abstract-ops/all.mjs';
import { Value, Type } from '../value.mjs';
import { msg } from '../helpers.mjs';

export function NumberToBigInt(number) {
  Assert(Type(number) === 'Number');
  if (IsInteger(number) === Value.false) {
    return surroundingAgent.Throw('RangeError', msg('CannotConvertDecimalToBigInt', number));
  }
  return new Value(BigInt(number.numberValue()));
}
