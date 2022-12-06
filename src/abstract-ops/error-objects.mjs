import { ObjectValue, Value, Descriptor } from '../value.mjs';
import { Q, X, NormalCompletion } from '../completion.mjs';
import { HasProperty, Get, DefinePropertyOrThrow } from './all.mjs';

// #sec-errorobjects-install-error-cause
export function InstallErrorCause(O, options) {
  // 1. If Type(options) is Object and ? HasProperty(options, "cause") is true, then
  if (options instanceof ObjectValue) {
    // nested if statement due to macro expansion
    if (Q(HasProperty(options, new Value('cause'))) === Value.true) {
      // a. Let cause be ? Get(options, "cause").
      const cause = Q(Get(options, new Value('cause')));
      // b. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "cause", cause).
      X(DefinePropertyOrThrow(O, new Value('cause'), Descriptor({
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
