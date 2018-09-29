import {
  surroundingAgent,
} from '../engine.mjs';
import {
  DefinePropertyOrThrow,
  ObjectCreate,
  OrdinaryCreateFromConstructor,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

export function CreateNativeError(realmRec) {
  [
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
  ].forEach((name) => {
    const proto = ObjectCreate(realmRec.Intrinsics['%ErrorPrototype%']);

    const cons = BootstrapConstructor(realmRec, ([message = new Value(undefined)], { NewTarget }) => {
      let newTarget;
      if (Type(NewTarget) === 'Undefined') {
        newTarget = surroundingAgent.activeFunctionObject;
      } else {
        newTarget = NewTarget;
      }
      const O = Q(OrdinaryCreateFromConstructor(newTarget, `%${name}Prototype%`), ['ErrorData']);
      if (Type(message) !== 'Undefined') {
        const msg = Q(ToString(message));
        const msgDesc = {
          Value: msg,
          Writable: true,
          Enumerable: false,
          Configurable: true,
        };
        X(DefinePropertyOrThrow(O, new Value('message'), msgDesc));
      }
      return O;
    }, name, 1, proto, [
      ['name', new Value(name)],
      ['message', new Value('')],
    ]);
    cons.Prototype = realmRec.Intrinsics['%Error%'];

    realmRec.Intrinsics[`%${name}Prototype%`] = proto;
    realmRec.Intrinsics[`%${name}%`] = cons;
  });
}
