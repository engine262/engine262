import { Value } from '../value.mts';
import { StringValue, NumericValue } from '../static-semantics/all.mts';
import { OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { NormalCompletion } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-literals-runtime-semantics-evaluation */
// Literal :
//   NullLiteral
//   BooleanLiteral
//   NumericLiteral
//   StringLiteral
export function Evaluate_Literal(Literal: ParseNode.Literal): NormalCompletion<Value> {
  switch (Literal.type) {
    case 'NullLiteral':
      // 1. Return null.
      return NormalCompletion(Value.null);
    case 'BooleanLiteral':
      // 1. If BooleanLiteral is the token false, return false.
      if (Literal.value === false) {
        return NormalCompletion(Value.false);
      }
      // 2. If BooleanLiteral is the token true, return true.
      if (Literal.value === true) {
        return NormalCompletion(Value.true);
      }
      throw new OutOfRange('Evaluate_Literal', Literal);
    case 'NumericLiteral':
      // 1. Return the NumericValue of NumericLiteral as defined in 11.8.3.
      return NormalCompletion(NumericValue(Literal));
    case 'StringLiteral':
      return NormalCompletion(StringValue(Literal));
    default:
      throw new OutOfRange('Evaluate_Literal', Literal);
  }
}
