import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  CreateMethodProperty,
  ToString,
  IterableToList,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { captureStack } from '../helpers.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// https://tc39.es/proposal-promise-any/#sec-aggregate-error
function AggregateErrorConstructor([errors = Value.undefined, message = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, let newTarget be the active function object, else let newTarget be NewTarget.
  let newTarget;
  if (NewTarget === Value.undefined) {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%AggregateError.prototype%", « [[ErrorData]], [[AggregateErrors]] »).
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%AggregateError.prototype%', [
    'ErrorData',
    'AggregateErrors',
  ]));
  // 3. Let errorsList be ? IterableToList(errors).
  const errorsList = errors === Symbol.for('engine262.placeholder')
    ? []
    : Q(IterableToList(errors));
  // 4. Set O.[[AggregateErrors]] to errorsList.
  O.AggregateErrors = errorsList;
  // 5. If message is not undefined, then
  if (message !== Value.undefined) {
    // a. Let msg be ? ToString(message).
    const msg = Q(ToString(message));
    // b. Perform ! CreateMethodProperty(O, "message", msg).
    X(CreateMethodProperty(O, new Value('message'), msg));
  }

  // NON-SPEC
  X(captureStack(O));

  // 6. Return O.
  return O;
}

export function BootstrapAggregateError(realmRec) {
  const c = BootstrapConstructor(realmRec, AggregateErrorConstructor, 'AggregateError', 2, realmRec.Intrinsics['%AggregateError.prototype%'], []);
  c.Prototype = realmRec.Intrinsics['%Error%'];
  realmRec.Intrinsics['%AggregateError%'] = c;
}
