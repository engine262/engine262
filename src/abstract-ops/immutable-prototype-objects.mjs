import { NullValue, ObjectValue, Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { Assert, SameValue } from './all.mjs';

/** http://tc39.es/ecma262/#sec-set-immutable-prototype  */
export function SetImmutablePrototype(O, V) {
  // 1. Assert: Either Type(V) is Object or Type(V) is Null.
  Assert(V instanceof ObjectValue || V instanceof NullValue);
  // 2. Let current be ? O.[[GetPrototypeOf]]().
  const current = Q(O.GetPrototypeOf());
  // 3. If SameValue(V, current) is true, return true.
  if (SameValue(V, current) === Value.true) {
    return Value.true;
  }
  // 4. Return false.
  return Value.false;
}
