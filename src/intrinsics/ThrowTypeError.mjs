import { surroundingAgent } from '../engine.mjs';
import { CreateBuiltinFunction } from '../abstract-ops/all.mjs';
import { Value, Descriptor } from '../value.mjs';
import { X } from '../completion.mjs';

// https://tc39.es/ecma262/#sec-%throwtypeerror%
export function BootstrapThrowTypeError(realmRec) {
  const ThrowTypeError = X(CreateBuiltinFunction(
    () => surroundingAgent.Throw('TypeError', 'StrictPoisonPill'),
    [], realmRec, Value.null,
  ));

  ThrowTypeError.Extensible = Value.false;

  ThrowTypeError.properties.set(new Value('length'), Descriptor({
    Value: new Value(0),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  ThrowTypeError.properties.set(new Value('name'), Descriptor({
    Value: new Value(''),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  ThrowTypeError.Prototype = realmRec.Intrinsics['%Function.prototype%'];

  realmRec.Intrinsics['%ThrowTypeError%'] = ThrowTypeError;
}
