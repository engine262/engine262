import {
  surroundingAgent,
} from '../engine.mjs';
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
import { BootstrapConstructor, BootstrapPrototype } from './Bootstrap.mjs';
import { captureStack } from '../helpers.mjs';

export function CreateNativeError(realmRec) {
  for (const name of [
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
  ]) {
    const proto = BootstrapPrototype(realmRec, [
      ['name', new Value(name)],
      ['message', new Value('')],
    ], realmRec.Intrinsics['%ErrorPrototype%']);

    const Constructor = ([message = Value.undefined], { NewTarget }) => {
      let newTarget;
      if (Type(NewTarget) === 'Undefined') {
        newTarget = surroundingAgent.activeFunctionObject;
      } else {
        newTarget = NewTarget;
      }
      const O = Q(OrdinaryCreateFromConstructor(newTarget, `%${name}Prototype%`), ['ErrorData']);
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
    };
    Object.defineProperty(Constructor, 'name', {
      value: `${name}Constructor`,
      configurable: true,
    });

    const cons = BootstrapConstructor(realmRec, Constructor, name, 1, proto, []);
    cons.Prototype = realmRec.Intrinsics['%Error%'];

    realmRec.Intrinsics[`%${name}Prototype%`] = proto;
    realmRec.Intrinsics[`%${name}%`] = cons;
  }
}
