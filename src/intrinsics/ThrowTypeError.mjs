import { surroundingAgent } from '../engine.mjs';
import { CreateBuiltinFunction } from '../abstract-ops/all.mjs';
import { Value, Descriptor } from '../value.mjs';
import { X } from '../completion.mjs';

// #sec-%throwtypeerror%
function ThrowTypeError() {
  // 1. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'StrictPoisonPill');
}

export function BootstrapThrowTypeError(realmRec) {
  const f = X(CreateBuiltinFunction(
    ThrowTypeError, [], realmRec, Value.null,
  ));

  f.Extensible = Value.false;

  f.properties.set(new Value('length'), Descriptor({
    Value: new Value(0),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  f.properties.set(new Value('name'), Descriptor({
    Value: new Value(''),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

  f.Prototype = realmRec.Intrinsics['%Function.prototype%'];

  realmRec.Intrinsics['%ThrowTypeError%'] = f;
}
