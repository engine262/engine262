import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor } from '../value.mjs';
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
    Writable: new Value(false),
    Configurable: new Value(false),
  })));
  X(DefinePropertyOrThrow(generator, new Value('constructor'), Descriptor({
    Writable: new Value(false),
  })));

  realmRec.Intrinsics['%GeneratorFunction%'] = cons;
}
