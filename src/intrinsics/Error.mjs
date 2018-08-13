import {
  CreateBuiltinFunction,
  ToString,
  OrdinaryCreateFromConstructor,
  DefinePropertyOrThrow,
} from '../abstract-ops/all.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';

function ErrorConstructor(realm, [message], { NewTarget }) {
  let newTarget;
  if (Type(NewTarget) === 'Undefined') {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%ErrorPrototype%', ['ErrorData']));
  if (Type(message) !== 'Undefined') {
    const msg = Q(ToString(message));
    const msgDesc = {
      Value: msg,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    };
    X(DefinePropertyOrThrow(O, NewValue('message'), msgDesc));
  }
  return O;
}

export function CreateError(realmRec) {
  const error = CreateBuiltinFunction(ErrorConstructor, [], realmRec);
  error.properties.set(NewValue('length'), NewValue(1));

  realmRec.Intrinsics['%Error%'] = error;
}
