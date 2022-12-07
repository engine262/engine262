import { surroundingAgent } from '../engine.mjs';
import {
  Type, JSStringValue, TypeForMethod, Value,
} from '../value.mjs';
import { ToNumeric, ToPrimitive, ToString } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-applystringornumericbinaryoperator  */
export function ApplyStringOrNumericBinaryOperator(lval, opText, rval) {
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
      return new Value(lstr.stringValue() + rstr.stringValue());
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
  // 6. Let T be Type(lnum).
  const T = TypeForMethod(lnum);
  // 7. Let operation be the abstract operation associated with opText in the following table:
  const operation = {
    '**': T.exponentiate,
    '*': T.multiply,
    '/': T.divide,
    '%': T.remainder,
    '+': T.add,
    '-': T.subtract,
    '<<': T.leftShift,
    '>>': T.signedRightShift,
    '>>>': T.unsignedRightShift,
    '&': T.bitwiseAND,
    '^': T.bitwiseXOR,
    '|': T.bitwiseOR,
  }[opText];
  // 8. Return ? operation(lnum, rnum).
  return Q(operation(lnum, rnum));
}
