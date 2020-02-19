import { Value } from '../value.mjs';
import { RegExpCreate } from '../abstract-ops/all.mjs';
import { BodyText, FlagText } from '../static-semantics/all.mjs';

// #sec-regular-expression-literals-runtime-semantics-evaluation
//   RegularExpressionLiteral :
//     `/` RegularExpressionBody `/` RegularExpressionFlags
export function Evaluate_RegularExpressionLiteral(RegularExpressionLiteral) {
  // 1. Let pattern be ! UTF16Encode(BodyText of RegularExpressionLiteral).
  const pattern = new Value(BodyText(RegularExpressionLiteral));
  // 2. Let flags be ! UTF16Encode(FlagText of RegularExpressionLiteral).
  const flags = new Value(FlagText(RegularExpressionLiteral));
  // 3. Return RegExpCreate(pattern, flags).
  return RegExpCreate(pattern, flags);
}
