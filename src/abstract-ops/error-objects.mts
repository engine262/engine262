import { ObjectValue, Value, Descriptor } from '../value.mts';
import {
  Q, X, NormalCompletion, type ValueEvaluator,
} from '../completion.mts';
import { HasProperty, Get, DefinePropertyOrThrow } from './all.mts';

/** https://tc39.es/ecma262/#sec-errorobjects-install-error-cause */
export function* InstallErrorCause(O: ObjectValue, options: Value): ValueEvaluator<Value> {
  // 1. If Type(options) is Object and ? HasProperty(options, "cause") is true, then
  if (options instanceof ObjectValue) {
    // nested if statement due to macro expansion
    if (Q(yield* HasProperty(options, Value('cause'))) === Value.true) {
      // a. Let cause be ? Get(options, "cause").
      const cause = Q(yield* Get(options, Value('cause')));
      // b. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "cause", cause).
      X(DefinePropertyOrThrow(O, Value('cause'), Descriptor({
        Value: cause,
        Writable: Value.true,
        Enumerable: Value.false,
        Configurable: Value.true,
      })));
    }
  }
  // 2. Return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}
