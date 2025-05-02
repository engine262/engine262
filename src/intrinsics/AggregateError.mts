import { surroundingAgent } from '../host-defined/engine.mts';
import {
  Value, Descriptor, type Arguments, type FunctionCallContext,
  UndefinedValue,
} from '../value.mts';
import {
  ToString,
  IteratorToList,
  OrdinaryCreateFromConstructor,
  DefinePropertyOrThrow,
  InstallErrorCause,
  CreateArrayFromList,
  Realm,
  type FunctionObject,
  CreateNonEnumerableDataPropertyOrThrow,
  GetIterator,
} from '../abstract-ops/all.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { captureStack, errorStackToString } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import type { ErrorObject } from './Error.mts';

/** https://tc39.es/ecma262/#sec-aggregate-error-constructor */
function* AggregateErrorConstructor([errors = Value.undefined, message = Value.undefined, options = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. If NewTarget is undefined, let newTarget be the active function object, else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget instanceof UndefinedValue) {
    newTarget = surroundingAgent.activeFunctionObject as FunctionObject;
  } else {
    newTarget = NewTarget;
  }
  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%AggregateError.prototype%", « [[ErrorData]] »).
  const O = Q(yield* OrdinaryCreateFromConstructor(newTarget, '%AggregateError.prototype%', [
    'ErrorData',
    'HostDefinedErrorStack',
  ])) as ErrorObject;
  // 3. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(yield* ToString(message));
    // b. Perform ! CreateMethodProperty(O, "message", msg).
    X(CreateNonEnumerableDataPropertyOrThrow(O, Value('message'), msg));
  }
  Q(yield* InstallErrorCause(O, options));
  // 4. Let errorsList be ? IterableToList(errors).
  const errorsList = Q(yield* IteratorToList(Q(yield* GetIterator(errors, 'sync'))));
  // 5. Perform ! DefinePropertyOrThrow(O, "errors", Property Descriptor { [[Configurable]]: true, [[Enumerable]]: false, [[Writable]]: true, [[Value]]: ! CreateArrayFromList(errorsList) }).
  X(DefinePropertyOrThrow(O, Value('errors'), Descriptor({
    Configurable: Value.true,
    Enumerable: Value.false,
    Writable: Value.true,
    Value: CreateArrayFromList(errorsList),
  })));

  // NON-SPEC
  const S = captureStack();
  O.HostDefinedErrorStack = S.stack;
  O.ErrorData = X(errorStackToString(O, S.stack, S.nativeStack));

  // 7. Return O.
  return O;
}

export function bootstrapAggregateError(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, AggregateErrorConstructor, 'AggregateError', 2, realmRec.Intrinsics['%AggregateError.prototype%'], []);
  c.Prototype = realmRec.Intrinsics['%Error%'];
  realmRec.Intrinsics['%AggregateError%'] = c;
}
