import { Value } from '../value.mjs';
import { RegExpCreate } from '../abstract-ops/all.mjs';

// 12.2.8.2 #sec-regular-expression-literals-runtime-semantics-evaluation
// (implicit)
//   PrimaryExpression : RegularExpressionLiteral
export function Evaluate_RegularExpressionLiteral(RegularExpressionLiteral) {
  const pattern = new Value(RegularExpressionLiteral.regex.pattern);
  const flags = new Value(RegularExpressionLiteral.regex.flags);
  return RegExpCreate(pattern, flags);
}
