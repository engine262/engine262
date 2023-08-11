// @ts-nocheck
import { Value } from '../value.mjs';
import { RegExpCreate } from '../abstract-ops/all.mjs';
import { BodyText, FlagText } from '../static-semantics/all.mjs';
import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-regular-expression-literals-runtime-semantics-evaluation */
//   RegularExpressionLiteral :
//     `/` RegularExpressionBody `/` RegularExpressionFlags
export function Evaluate_RegularExpressionLiteral(RegularExpressionLiteral: ParseNode.RegularExpressionLiteral) {
  // 1. Let pattern be ! UTF16Encode(BodyText of RegularExpressionLiteral).
  const pattern = Value(BodyText(RegularExpressionLiteral));
  // 2. Let flags be ! UTF16Encode(FlagText of RegularExpressionLiteral).
  const flags = Value(FlagText(RegularExpressionLiteral));
  // 3. Return RegExpCreate(pattern, flags).
  return RegExpCreate(pattern, flags);
}
