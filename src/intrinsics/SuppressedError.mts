import {
  CreateMethodProperty,
  OrdinaryCreateFromConstructor,
  ToString,
  type ArgumentList,
  type NativeFunctionContext,
  type Realm,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { captureStack } from '../helpers.mjs';
import { ObjectValue, Value } from '../value.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-suppressederror-constructor */
function SuppressedErrorConstructor([error = Value.undefined, suppressed = Value.undefined, message = Value.undefined]: ArgumentList, { NewTarget }: NativeFunctionContext) {
  // 1. If NewTarget is undefined, let newTarget be the active function object, else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject as ObjectValue;
  } else {
    newTarget = NewTarget as ObjectValue;
  }

  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%SuppressedError.prototype%", « [[ErrorData]] »).
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%SuppressedError.prototype%', [
    'ErrorData',
  ]));

  // 3. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(ToString(message));

    // b. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "message", msg).
    X(CreateMethodProperty(O, Value('message'), msg));
  }

  // 4. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "error", error).
  X(CreateMethodProperty(O, Value('error'), error));

  // 5. Perform ! CreateNonEnumerableDataPropertyOrThrow(O, "suppressed", suppressed).
  X(CreateMethodProperty(O, Value('suppressed'), suppressed));

  // NON-SPEC
  X(captureStack(O));

  // 6. Return O.
  return O;
}

export function bootstrapSuppressedError(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, SuppressedErrorConstructor, 'SuppressedError', 3, realmRec.Intrinsics['%SuppressedError.prototype%'], []);

  c.Prototype = realmRec.Intrinsics['%Error%'];

  realmRec.Intrinsics['%SuppressedError%'] = c;
}
