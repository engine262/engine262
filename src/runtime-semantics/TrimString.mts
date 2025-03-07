// @ts-nocheck
import { Assert, RequireObjectCoercible, ToString } from '../abstract-ops/all.mts';
import { Value } from '../value.mts';
import { Q } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-trimstring */
export function TrimString(string, where) {
  const str = Q(RequireObjectCoercible(string));
  const S = Q(ToString(str)).stringValue();
  let T;
  if (where === 'start') {
    T = S.trimStart();
  } else if (where === 'end') {
    T = S.trimEnd();
  } else {
    Assert(where === 'start+end');
    T = S.trim();
  }
  return Value(T);
}
