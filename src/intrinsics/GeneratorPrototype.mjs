import {
  GeneratorResume,
  GeneratorResumeAbrupt,
} from '../abstract-ops/all.mjs';
import {
  Q,
  ReturnCompletion,
  ThrowCompletion,
} from '../completion.mjs';
import { Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// 25.4.1.2 #sec-generator.prototype.next
function GeneratorProto_next([value = Value.undefined], { thisValue }) {
  const g = thisValue;
  return Q(GeneratorResume(g, value));
}

// 25.4.1.3 #sec-generator.prototype.return
function GeneratorProto_return([value = Value.undefined], { thisValue }) {
  const g = thisValue;
  const C = new ReturnCompletion(value);
  return Q(GeneratorResumeAbrupt(g, C));
}

// 25.4.1.4 #sec-generator.prototype.throw
function GeneratorProto_throw([exception = Value.undefined], { thisValue }) {
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
