import { Value } from '../value.mjs';
import { StringValue, NumericValue } from '../static-semantics/all.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-literals-runtime-semantics-evaluation
// Literal :
//   NullLiteral
//   BooleanLiteral
//   NumericLiteral
//   StringLiteral
export function Evaluate_Literal(Literal) {
  switch (Literal.type) {
    case 'NullLiteral':
      // 1. Return null.
      return Value.null;
    case 'BooleanLiteral':
      // 1. If BooleanLiteral is the token false, return false.
      if (Literal.value === false) {
        return Value.false;
      }
      // 2. If BooleanLiteral is the token true, return true.
      if (Literal.value === true) {
        return Value.true;
      }
      throw new OutOfRange('Evaluate_Literal', Literal);
    case 'NumericLiteral':
      // 1. Return the NumericValue of NumericLiteral as defined in 11.8.3.
      return NumericValue(Literal);
    case 'StringLiteral':
      return StringValue(Literal);
    default:
      throw new OutOfRange('Evaluate_Literal', Literal);
  }
}
