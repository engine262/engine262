import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { captureStack } from '../helpers.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-error-constructor
function ErrorConstructor([message = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, let newTarget be the active function object; else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%Error.prototype%", « [[ErrorData]] »).
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%Error.prototype%', ['ErrorData']));
  // 3. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(ToString(message));
    // b. Let msgDesc be the PropertyDescriptor { [[Value]]: msg, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: true }.
    const msgDesc = Descriptor({
      Value: msg,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    });
    // c. Perform ! DefinePropertyOrThrow(O, "message", msgDesc).
    X(DefinePropertyOrThrow(O, new Value('message'), msgDesc));
  }

  X(captureStack(O)); // NON-SPEC

  // 4. Return O.
  return O;
}

export function BootstrapError(realmRec) {
  const error = BootstrapConstructor(realmRec, ErrorConstructor, 'Error', 1, realmRec.Intrinsics['%Error.prototype%'], []);

  realmRec.Intrinsics['%Error%'] = error;
}
