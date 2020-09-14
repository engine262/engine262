import { Descriptor, Value } from '../value.mjs';
import { DefinePropertyOrThrow } from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

export function BootstrapGeneratorFunctionPrototype(realmRec) {
  const generatorPrototype = realmRec.Intrinsics['%GeneratorFunction.prototype.prototype%'];

  const generator = BootstrapPrototype(realmRec, [
    ['prototype', generatorPrototype, undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'GeneratorFunction');

  X(DefinePropertyOrThrow(generatorPrototype, new Value('constructor'), Descriptor({
    Value: generator,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%GeneratorFunction.prototype%'] = generator;
}
