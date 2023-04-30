// @ts-nocheck
/** http://tc39.es/ecma262/#sec-static-semantics-bodytext */
//  RegularExpressionLiteral :: `/` RegularExpressionBody `/` RegularExpressionFlags
export function BodyText(RegularExpressionLiteral) {
  return RegularExpressionLiteral.RegularExpressionBody;
}
