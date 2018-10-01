import { surroundingAgent } from '../engine.mjs';
import { Value, wellKnownSymbols, Descriptor } from '../value.mjs';
import { DefinePropertyOrThrow } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor, BootstrapPrototype } from './Bootstrap.mjs';

// #sec-createdynamicfunction
function CreateDynamicFunction() {
  return surroundingAgent.Throw('TypeError', 'CreateDynamicFunction');
}

function GeneratorFunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'generator', args));
}

export function CreateGeneratorFunction(realmRec) {
  const generatorPrototype = realmRec.Intrinsics['%GeneratorPrototype%'];

  const generator = BootstrapPrototype(realmRec, [
    ['prototype', generatorPrototype, undefined, { Writable: new Value(false) }],
    [wellKnownSymbols.toStringTag, new Value('GeneratorFunction'), undefined, { Writable: new Value(false) }],
  ], realmRec.Intrinsics['%FunctionPrototype%']);
  X(DefinePropertyOrThrow(generatorPrototype, new Value('constructor'), Descriptor({
    Value: generator,
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  })));

  const cons = BootstrapConstructor(realmRec, GeneratorFunctionConstructor, 'GeneratorFunction', 1, generator, []);
  X(DefinePropertyOrThrow(cons, new Value('prototype'), Descriptor({
    Writable: new Value(false),
    Configurable: new Value(false),
  })));
  X(DefinePropertyOrThrow(generator, new Value('constructor'), Descriptor({
    Writable: new Value(false),
  })));

  realmRec.Intrinsics['%GeneratorFunction%'] = cons;
  realmRec.Intrinsics['%Generator%'] = generator;
}
