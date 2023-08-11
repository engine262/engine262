// @ts-nocheck
import { Q } from '../completion.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';
import { EvaluateStringOrNumericBinaryExpression } from './all.mjs';

/** https://tc39.es/ecma262/#sec-binary-bitwise-operators-runtime-semantics-evaluation */
//   BitwiseANDExpression : BitwiseANDExpression `&` EqualityExpression
//   BitwiseXORExpression : BitwiseXORExpression `^` BitwiseANDExpression
//   BitwiseORExpression : BitwiseORExpression `|` BitwiseXORExpression
// The production A : A @ B, where @ is one of the bitwise operators in the
// productions above, is evaluated as follows:
export function* Evaluate_BinaryBitwiseExpression({ A, operator, B }: ParseNode.BitwiseANDExpression | ParseNode.BitwiseXORExpression | ParseNode.BitwiseORExpression) {
  return Q(yield* EvaluateStringOrNumericBinaryExpression(A, operator, B));
}
