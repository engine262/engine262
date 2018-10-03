import { Value, wellKnownSymbols, Descriptor } from '../value.mjs';
import { DefinePropertyOrThrow } from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

export function CreateGenerator(realmRec) {
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

  realmRec.Intrinsics['%Generator%'] = generator;
}
