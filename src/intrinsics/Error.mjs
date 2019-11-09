import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { captureStack } from '../helpers.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function ErrorConstructor([message = Value.undefined], { NewTarget }) {
  let newTarget;
  if (Type(NewTarget) === 'Undefined') {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%Error.prototype%', ['ErrorData']));
  if (Type(message) !== 'Undefined') {
    const msg = Q(ToString(message));
    const msgDesc = Descriptor({
      Value: msg,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    });
    X(DefinePropertyOrThrow(O, new Value('message'), msgDesc));
  }

  X(captureStack(O)); // non-spec

  return O;
}

export function CreateError(realmRec) {
  const error = BootstrapConstructor(realmRec, ErrorConstructor, 'Error', 1, realmRec.Intrinsics['%Error.prototype%'], []);

  realmRec.Intrinsics['%Error%'] = error;
}
