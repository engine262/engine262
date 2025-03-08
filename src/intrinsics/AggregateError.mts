import { surroundingAgent } from '../engine.mts';
import {
  Value, Descriptor, type Arguments, type FunctionCallContext,
  UndefinedValue,
} from '../value.mts';
import {
  CreateMethodProperty,
  ToString,
  IterableToList,
  OrdinaryCreateFromConstructor,
  DefinePropertyOrThrow,
  InstallErrorCause,
  CreateArrayFromList,
  Realm,
  type FunctionObject,
} from '../abstract-ops/all.mts';
import { Q, X, type ExpressionCompletion } from '../completion.mts';
import { captureStack } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-aggregate-error-constructor */
function AggregateErrorConstructor([errors = Value.undefined, message = Value.undefined, options = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ExpressionCompletion {
  // 1. If NewTarget is undefined, let newTarget be the active function object, else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget instanceof UndefinedValue) {
    newTarget = surroundingAgent.activeFunctionObject as FunctionObject;
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
    X(CreateMethodProperty(O, Value('message'), msg));
  }
  // 4. Let errorsList be ? IterableToList(errors).
  const errorsList = Q(IterableToList(errors));
  // 5. Perform ! DefinePropertyOrThrow(O, "errors", Property Descriptor { [[Configurable]]: true, [[Enumerable]]: false, [[Writable]]: true, [[Value]]: ! CreateArrayFromList(errorsList) }).
  X(DefinePropertyOrThrow(O, Value('errors'), Descriptor({
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

export function bootstrapAggregateError(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, AggregateErrorConstructor, 'AggregateError', 2, realmRec.Intrinsics['%AggregateError.prototype%'], []);
  c.Prototype = realmRec.Intrinsics['%Error%'];
  realmRec.Intrinsics['%AggregateError%'] = c;
}
