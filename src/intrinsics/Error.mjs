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
import { BootstrapConstructor } from './Bootstrap.mjs';

function ErrorConstructor([message], { NewTarget }) {
  let newTarget;
  if (Type(NewTarget) === 'Undefined') {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%ErrorPrototype%', ['ErrorData']));
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
  return O;
}

export function CreateError(realmRec) {
  const error = BootstrapConstructor(realmRec, ErrorConstructor, 'Error', 1, realmRec.Intrinsics['%ErrorPrototype%'], []);

  realmRec.Intrinsics['%Error%'] = error;
}
