import { surroundingAgent } from '../engine.mjs';
import { New as NewValue, wellKnownSymbols } from '../value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';

// #sec-createdynamicfunction
function CreateDynamicFunction() {
  return surroundingAgent.Throw('TypeError', 'CreateDynamicFunction');
}

function GeneratorFunctionConstructor(args, { NewTarget }) {
  const C = surroundingAgent.activeFunctionObject;
  return Q(CreateDynamicFunction(C, NewTarget, 'generator', args));
}

export function CreateGeneratorFunction(realmRec) {
  const cons = CreateBuiltinFunction(GeneratorFunctionConstructor, [], realmRec);
  SetFunctionName(cons, NewValue('GeneratorFunction'));
  SetFunctionLength(cons, NewValue(1));

  const generator = ObjectCreate(realmRec.Intrinsics['%FunctionPrototype%']);

  const generatorPrototype = realmRec.Intrinsics['%GeneratorPrototype%'];

  X(cons.DefineOwnProperty(NewValue('prototype'), {
    Value: generator,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));

  X(generator.DefineOwnProperty(NewValue('constructor'), {
    Value: cons,
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));

  X(generator.DefineOwnProperty(NewValue('prototype'), {
    Value: generatorPrototype,
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));

  X(generator.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('GeneratorFunction'),
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));

  X(generatorPrototype.DefineOwnProperty(NewValue('constructor'), {
    Value: generator,
    Writable: false,
    Enumerable: false,
    Configurable: true,
  }));

  realmRec.Intrinsics['%GeneratorFunction%'] = cons;
  realmRec.Intrinsics['%Generator%'] = generator;
}
