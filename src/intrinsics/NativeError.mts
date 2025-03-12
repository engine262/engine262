import {
  surroundingAgent,
} from '../engine.mts';
import {
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  InstallErrorCause,
  ToString,
  Realm,
  type FunctionObject,
} from '../abstract-ops/all.mts';
import {
  Descriptor,
  UndefinedValue,
  Value,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { Q, X, type ExpressionCompletion } from '../completion.mts';
import { captureStack } from '../helpers.mts';
import { bootstrapConstructor, bootstrapPrototype } from './bootstrap.mts';

export function bootstrapNativeError(realmRec: Realm) {
  for (const name of [
    'EvalError',
    'RangeError',
    'ReferenceError',
    'SyntaxError',
    'TypeError',
    'URIError',
  ]) {
    const proto = bootstrapPrototype(realmRec, [
      ['name', Value(name)],
      ['message', Value('')],
    ], realmRec.Intrinsics['%Error.prototype%']);

    /** https://tc39.es/ecma262/#sec-nativeerror */
    const Constructor = ([message = Value.undefined, options = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ExpressionCompletion => {
      // 1. If NewTarget is undefined, let newTarget be the active function object; else let newTarget be NewTarget.
      let newTarget;
      if (NewTarget instanceof UndefinedValue) {
        newTarget = surroundingAgent.activeFunctionObject;
      } else {
        newTarget = NewTarget;
      }
      // 2. Let O be ? OrdinaryCreateFromConstructor(newTarget, "%NativeError.prototype%", « [[ErrorData]] »).
      const O = Q(OrdinaryCreateFromConstructor(newTarget as FunctionObject, `%${name}.prototype%`, ['ErrorData']));
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
        X(DefinePropertyOrThrow(O, Value('message'), msgDesc));
      }
      // 4. Perform ? InstallErrorCause(O, options).
      Q(InstallErrorCause(O, options));
      // NON-SPEC
      X(captureStack(O));
      // 5. Return O.
      return O;
    };
    Object.defineProperty(Constructor, 'name', {
      value: `${name}Constructor`,
      configurable: true,
    });

    const cons = bootstrapConstructor(realmRec, Constructor, name, 1, proto, []);
    cons.Prototype = realmRec.Intrinsics['%Error%'];

    realmRec.Intrinsics[`%${name}.prototype%`] = proto;
    realmRec.Intrinsics[`%${name}%`] = cons;
  }
}
