import { JSStringValue, Value } from '../value.mts';
import { Q, type ValueEvaluator } from '../completion.mts';
import { Assert, RequireObjectCoercible, ToString } from '#self';

/** https://tc39.es/ecma262/#sec-trimstring */
export function* TrimString(arg: string | Value, where: 'start' | 'end' | 'start+end'): ValueEvaluator<JSStringValue> {
  let string;
  if (typeof arg === 'string') string = arg;
  else {
    Q(RequireObjectCoercible(arg));
    string = Q(yield* ToString(arg));
  }
  let T;
  if (where === 'start') {
    T = string.trimStart();
  } else if (where === 'end') {
    T = string.trimEnd();
  } else {
    Assert(where === 'start+end');
    T = string.trim();
  }
  return Value(T);
}
