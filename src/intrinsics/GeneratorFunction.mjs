import { surroundingAgent } from '../engine.mjs';
import { Descriptor, Value } from '../value.mjs';
import { DefinePropertyOrThrow } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { CreateDynamicFunction } from '../runtime-semantics/all.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-generatorfunction
function GeneratorFunctionConstructor(args, { NewTarget }) {
  // 1. Let C be the active function object.
  const C = surroundingAgent.activeFunctionObject;
  // 2. Let args be the argumentsList that was passed to this function by [[Call]] or [[Construct]].
  // 3. Return ? CreateDynamicFunction(C, NewTarget, generator, args).
  return Q(CreateDynamicFunction(C, NewTarget, 'generator', args));
}

export function BootstrapGeneratorFunction(realmRec) {
  const generator = realmRec.Intrinsics['%GeneratorFunction.prototype%'];

  const cons = BootstrapConstructor(realmRec, GeneratorFunctionConstructor, 'GeneratorFunction', 1, generator, []);
  X(DefinePropertyOrThrow(cons, new Value('prototype'), Descriptor({
    Writable: Value.false,
    Configurable: Value.false,
  })));
  X(DefinePropertyOrThrow(generator, new Value('constructor'), Descriptor({
    Writable: Value.false,
  })));

  realmRec.Intrinsics['%GeneratorFunction%'] = cons;
}
