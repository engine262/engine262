// #sec-static-semantics-bodytext
//  RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function BodyText(RegularExpressionLiteral) {
  return RegularExpressionLiteral.RegularExpressionBody;
}
