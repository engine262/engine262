import {
  GeneratorResume,
  GeneratorResumeAbrupt,
} from '../abstract-ops/all.mjs';
import {
  Q,
  ReturnCompletion,
  ThrowCompletion,
} from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-generator.prototype.next
function GeneratorProto_next([value], { thisValue }) {
  const g = thisValue;
  return Q(GeneratorResume(g, value));
}

// #sec-generator.prototype.return
function GeneratorProto_return([value], { thisValue }) {
  const g = thisValue;
  const C = new ReturnCompletion(value);
  return Q(GeneratorResumeAbrupt(g, C));
}

// #sec-generator.prototype.throw
function GeneratorProto_throw([exception], { thisValue }) {
  const g = thisValue;
  const C = new ThrowCompletion(exception);
  return Q(GeneratorResumeAbrupt(g, C));
}

export function CreateGeneratorPrototype(realmRec) {
  const generatorPrototype = BootstrapPrototype(realmRec, [
    ['next', GeneratorProto_next, 1],
    ['return', GeneratorProto_return, 1],
    ['throw', GeneratorProto_throw, 1],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Generator');

  realmRec.Intrinsics['%GeneratorPrototype%'] = generatorPrototype;
}
