import type { ParseNode } from '../parser/ParseNode.mjs';

/** https://tc39.es/ecma262/#sec-static-semantics-flagtext */
//   RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function FlagText(RegularExpressionLiteral: ParseNode.RegularExpressionLiteral) {
  return RegularExpressionLiteral.RegularExpressionFlags;
}
