import { Assert, RequireObjectCoercible, ToString } from '../abstract-ops/all.mts';
import { JSStringValue, Value } from '../value.mts';
import { Q, type ValueEvaluator } from '../completion.mts';

/** https://tc39.es/ecma262/#sec-trimstring */
export function* TrimString(string: Value, where: 'start' | 'end' | 'start+end'): ValueEvaluator<JSStringValue> {
  Q(RequireObjectCoercible(string));
  const S = Q(yield* ToString(string)).stringValue();
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
