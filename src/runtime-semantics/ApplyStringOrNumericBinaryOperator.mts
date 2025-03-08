import { surroundingAgent } from '../engine.mts';
import {
  Type, JSStringValue, Value,
  NumberValue,
  BigIntValue,
} from '../value.mts';
import {
  Assert, ToNumeric, ToPrimitive, ToString,
} from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';

export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '**' | '<<' | '>>' | '>>>' | '&' | '^' | '|';
/** https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator */
export function ApplyStringOrNumericBinaryOperator(lval: Value, opText: BinaryOperator, rval: Value) {
  // 1. If opText is +, then
  if (opText === '+') {
    // a. Let lprim be ? ToPrimitive(lval).
    const lprim = Q(ToPrimitive(lval));
    // b. Let rprim be ? ToPrimitive(rval).
    const rprim = Q(ToPrimitive(rval));
    // c. If Type(lprim) is String or Type(rprim) is String, then
    if (lprim instanceof JSStringValue || rprim instanceof JSStringValue) {
      // i. Let lstr be ? ToString(lprim).
      const lstr = Q(ToString(lprim));
      // ii. Let rstr be ? ToString(rprim).
      const rstr = Q(ToString(rprim));
      // iii. Return the string-concatenation of lstr and rstr.
      return Value(lstr.stringValue() + rstr.stringValue());
    }
    // d. Set lval to lprim.
    lval = lprim;
    // e. Set rval to rprim.
    rval = rprim;
  }
  // 2. NOTE: At this point, it must be a numeric operation.
  // 3. Let lnum be ? ToNumeric(lval).
  const lnum = Q(ToNumeric(lval));
  // 4. Let rnum be ? ToNumeric(rval).
  const rnum = Q(ToNumeric(rval));
  // 5. If Type(lnum) is different from Type(rnum), throw a TypeError exception.
  if (Type(lnum) !== Type(rnum)) {
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  }
  if (lnum instanceof BigIntValue) {
    const operations = {
      '**': BigIntValue.exponentiate,
      '*': BigIntValue.multiply,
      '/': BigIntValue.divide,
      '%': BigIntValue.remainder,
      '+': BigIntValue.add,
      '-': BigIntValue.subtract,
      '<<': BigIntValue.leftShift,
      '>>': BigIntValue.signedRightShift,
      '>>>': BigIntValue.unsignedRightShift,
      '&': BigIntValue.bitwiseAND,
      '^': BigIntValue.bitwiseXOR,
      '|': BigIntValue.bitwiseOR,
    };
    return Q(operations[opText](lnum, rnum as BigIntValue));
  } else {
    Assert(lnum instanceof NumberValue);
    const operations = {
      '**': NumberValue.exponentiate,
      '*': NumberValue.multiply,
      '/': NumberValue.divide,
      '%': NumberValue.remainder,
      '+': NumberValue.add,
      '-': NumberValue.subtract,
      '<<': NumberValue.leftShift,
      '>>': NumberValue.signedRightShift,
      '>>>': NumberValue.unsignedRightShift,
      '&': NumberValue.bitwiseAND,
      '^': NumberValue.bitwiseXOR,
      '|': NumberValue.bitwiseOR,
    };
    return Q(operations[opText](lnum, rnum as NumberValue));
  }
}
