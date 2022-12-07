import { Assert, RequireObjectCoercible, ToString } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';

/** http://tc39.es/ecma262/#sec-trimstring  */
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
  return new Value(T);
}
