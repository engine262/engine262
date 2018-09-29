import { surroundingAgent } from '../engine.mjs';
import { Value, wellKnownSymbols, Descriptor } from '../value.mjs';
import { ObjectCreate } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-createdynamicfunction
function CreateDynamicFunction() {
  return surroundingAgent.Throw('TypeError', 'CreateDynamicFunction');
}

function GeneratorFunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'generator', args));
}

export function CreateGeneratorFunction(realmRec) {
  const cons = BootstrapConstructor(realmRec, GeneratorFunctionConstructor, 'GeneratorFunction', 1, realmRec.Intrinsics['%GeneratorPrototype%'], []);

  const generator = ObjectCreate(realmRec.Intrinsics['%FunctionPrototype%']);

  const generatorPrototype = realmRec.Intrinsics['%GeneratorPrototype%'];

  X(generator.DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: cons,
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  })));

  X(generator.DefineOwnProperty(new Value('prototype'), Descriptor({
    Value: generatorPrototype,
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  })));

  X(generator.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
    Value: new Value('GeneratorFunction'),
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(true),
  })));

  realmRec.Intrinsics['%GeneratorFunction%'] = cons;
  realmRec.Intrinsics['%Generator%'] = generator;
}
