import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor } from '../value.mjs';
import {
  CreateMethodProperty,
  ToString,
  IterableToList,
  OrdinaryCreateFromConstructor,
  DefinePropertyOrThrow,
  InstallErrorCause,
  CreateArrayFromList,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { captureStack } from '../helpers.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** http://tc39.es/ecma262/#sec-aggregate-error-constructor */
function AggregateErrorConstructor([errors = Value.undefined, message = Value.undefined, options = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, let newTarget be the active function object, else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%AggregateError.prototype%", « [[ErrorData]] »).
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%AggregateError.prototype%', [
    'ErrorData',
  ]));
  // 3. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(ToString(message));
    // b. Perform ! CreateMethodProperty(O, "message", msg).
    X(CreateMethodProperty(O, new Value('message'), msg));
  }
  // 4. Let errorsList be ? IterableToList(errors).
  const errorsList = Q(IterableToList(errors));
  // 5. Perform ! DefinePropertyOrThrow(O, "errors", Property Descriptor { [[Configurable]]: true, [[Enumerable]]: false, [[Writable]]: true, [[Value]]: ! CreateArrayFromList(errorsList) }).
  X(DefinePropertyOrThrow(O, new Value('errors'), Descriptor({
    Configurable: Value.true,
    Enumerable: Value.false,
    Writable: Value.true,
    Value: X(CreateArrayFromList(errorsList)),
  })));

  // 6. Perform ? InstallErrorCause(O, options).
  Q(InstallErrorCause(O, options));

  // NON-SPEC
  X(captureStack(O));

  // 7. Return O.
  return O;
}

export function bootstrapAggregateError(realmRec) {
  const c = bootstrapConstructor(realmRec, AggregateErrorConstructor, 'AggregateError', 2, realmRec.Intrinsics['%AggregateError.prototype%'], []);
  c.Prototype = realmRec.Intrinsics['%Error%'];
  realmRec.Intrinsics['%AggregateError%'] = c;
}
