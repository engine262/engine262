import { surroundingAgent } from '../engine.mjs';
import { CreateBuiltinFunction } from '../abstract-ops/all.mjs';
import { Value, Descriptor } from '../value.mjs';
import { X } from '../completion.mjs';

// https://tc39.es/ecma262/#sec-%throwtypeerror%
export function CreateThrowTypeError(realmRec) {
  const ThrowTypeError = X(CreateBuiltinFunction(
    () => surroundingAgent.Throw('TypeError', 'The caller, callee, and arguments properties may'
      + ' not be accessed on strict mode functions or the arguments objects for calls to them'),
    [], realmRec, Value.null,
  ));

  ThrowTypeError.Extensible = Value.false;

  ThrowTypeError.properties.set(new Value('length'), Descriptor({
    Value: new Value(0),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  ThrowTypeError.Prototype = realmRec.Intrinsics['%Function.prototype%'];

  realmRec.Intrinsics['%ThrowTypeError%'] = ThrowTypeError;
}
