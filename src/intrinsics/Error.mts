import {
  Descriptor,
  Value,
  type Arguments,
  type FunctionCallContext,
  type JSStringValue,
  type ObjectValue,
  type UndefinedValue,
} from '../value.mts';
import { Q, X, type ValueEvaluator } from '../completion.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  captureStack, callSiteToErrorString, type CallSite, CallFrame,
} from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  InstallErrorCause,
  ToString,
  type FunctionObject,
  IsError,
  Realm,
} from '#self';

export interface ErrorObject extends ObjectValue {
  ErrorData: JSStringValue;
  HostDefinedErrorStack?: (CallSite | CallFrame)[] | UndefinedValue;
}

export { IsError as isErrorObject } from '../abstract-ops/error-objects.mts';

/** https://tc39.es/ecma262/#sec-error-constructor */
function* ErrorConstructor([message = Value.undefined, options = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. If NewTarget is undefined, let newTarget be the active function object; else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%Error.prototype%", « [[ErrorData]] »).
  const O = Q(yield* OrdinaryCreateFromConstructor(newTarget as FunctionObject, '%Error.prototype%', [
    'ErrorData',
    'HostDefinedErrorStack',
  ])) as ErrorObject;
  // 3. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(yield* ToString(message));
    // b. Let msgDesc be the PropertyDescriptor { [[Value]]: msg, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: true }.
    const msgDesc = Descriptor({
      Value: msg,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    });
    // c. Perform ! DefinePropertyOrThrow(O, "message", msgDesc).
    X(DefinePropertyOrThrow(O, Value('message'), msgDesc));
  }

  // 4. Perform ? InstallErrorCause(O, options).
  Q(yield* InstallErrorCause(O, options));

  // NON-SPEC
  const S = captureStack();
  O.HostDefinedErrorStack = S.stack;
  O.ErrorData = X(callSiteToErrorString(O, S.stack, S.nativeStack));

  // 5. Return O.
  return O;
}

/** https://tc39.es/proposal-is-error/#sec-error.iserror */
function Error_isError([value = Value.undefined]: Arguments) {
  return Value(IsError(value));
}

export function bootstrapError(realmRec: Realm) {
  const error = bootstrapConstructor(realmRec, ErrorConstructor, 'Error', 1, realmRec.Intrinsics['%Error.prototype%'], [
    ['isError', Error_isError, 1],
  ]);

  realmRec.Intrinsics['%Error%'] = error;
}
