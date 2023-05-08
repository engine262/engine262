// @ts-nocheck
/** https://tc39.es/ecma262/#sec-static-semantics-flagtext */
//   RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function FlagText(RegularExpressionLiteral) {
  return RegularExpressionLiteral.RegularExpressionFlags;
}
