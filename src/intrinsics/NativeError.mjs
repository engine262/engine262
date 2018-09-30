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
  Value,
  Type,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor, BootstrapPrototype } from './Bootstrap.mjs';

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

    const holder = {
      // Do this to get the proper function name for debugging
      [`${name}Constructor`]: ([message = new Value(undefined)], { NewTarget }) => {
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
            Writable: new Value(true),
            Enumerable: new Value(false),
            Configurable: new Value(true),
          });
          X(DefinePropertyOrThrow(O, new Value('message'), msgDesc));
        }
        return O;
      },
    };

    const cons = BootstrapConstructor(realmRec, holder[`${name}Constructor`], name, 1, proto, []);
    cons.Prototype = realmRec.Intrinsics['%Error%'];

    realmRec.Intrinsics[`%${name}Prototype%`] = proto;
    realmRec.Intrinsics[`%${name}%`] = cons;
  }
}
