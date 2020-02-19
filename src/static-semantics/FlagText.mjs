// #sec-static-semantics-flagtext
//   RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function FlagText(RegularExpressionLiteral) {
  return RegularExpressionLiteral.RegularExpressionFlags;
}
