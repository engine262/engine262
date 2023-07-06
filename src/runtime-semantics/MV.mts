// @ts-nocheck
import { 𝔽 } from '../abstract-ops/all.mjs';

/** https://tc39.es/ecma262/#sec-runtime-semantics-mv-s */
//   StringNumericLiteral :::
//     [empty]
//     StrWhiteSpace
//     StrWhiteSpace_opt StrNumericLiteral StrWhiteSpace_opt
export function MV_StringNumericLiteral(StringNumericLiteral) {
  return 𝔽(Number(StringNumericLiteral));
}
