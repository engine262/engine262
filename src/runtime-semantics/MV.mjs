import { F } from '../abstract-ops/all.mjs';

/** http://tc39.es/ecma262/#sec-runtime-semantics-mv-s */
//   StringNumericLiteral :::
//     [empty]
//     StrWhiteSpace
//     StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
export function MV_StringNumericLiteral(StringNumericLiteral) {
  return F(Number(StringNumericLiteral));
}
