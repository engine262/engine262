import { surroundingAgent } from '../engine.mjs';
import { Descriptor, Value } from '../value.mjs';
import { DefinePropertyOrThrow } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';
import { CreateDynamicFunction } from './CreateDynamicFunction.mjs';

function GeneratorFunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'generator', args));
}

export function CreateGeneratorFunction(realmRec) {
  const generator = realmRec.Intrinsics['%Generator%'];

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
