import { F } from '../abstract-ops/all.mjs';

// 7.1.3.1.1 #sec-runtime-semantics-mv-s
//   StringNumericLiteral :::
//     [empty]
//     StrWhiteSpace
//     StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
export function MV_StringNumericLiteral(StringNumericLiteral) {
  return F(Number(StringNumericLiteral));
}
