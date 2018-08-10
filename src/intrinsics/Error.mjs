import {
  CreateBuiltinFunction,
  ToString,
  OrdinaryCreateFromConstructor,
  DefinePropertyOrThrow,
} from '../abstract-ops/all';
import {
  UndefinedValue,
  New as NewValue,
} from '../value';
import { Q, X } from '../completion';
import { surroundingAgent } from '../engine';

function ErrorConstructor(realm, [message], { NewTarget }) {
  let newTarget;
  if (NewTarget instanceof UndefinedValue) {
    newTarget = surroundingAgent.activeFunctionObject;
  } else {
    newTarget = NewTarget;
  }
  const O = Q(OrdinaryCreateFromConstructor(newTarget, '%ErrorPrototype%', ['ErrorData']));
  if (!(message instanceof UndefinedValue)) {
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
  error.properties.set('length', NewValue(1));

  realmRec.Intrinsics['%Error%'] = error;
}
