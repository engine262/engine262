import {
  GeneratorResume,
  GeneratorResumeAbrupt,
} from '../abstract-ops/all.mjs';
import {
  Completion,
  ThrowCompletion,
  Q,
} from '../completion.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

// #sec-generator.prototype.next
function GeneratorProto_next([value = Value.undefined], { thisValue }) {
  // 1. Let g be the this value.
  const g = thisValue;
  // 2. Return ? GeneratorResume(g, value).
  return Q(GeneratorResume(g, value));
}

// #sec-generator.prototype.return
function GeneratorProto_return([value = Value.undefined], { thisValue }) {
  // 1. Let g be the this value.
  const g = thisValue;
  // 2. Let C be Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.
  const C = new Completion({ Type: 'return', Value: value, Target: undefined });
  // 3. Return ? GeneratorResumeAbrupt(g, C).
  return Q(GeneratorResumeAbrupt(g, C));
}

// #sec-generator.prototype.throw
function GeneratorProto_throw([exception = Value.undefined], { thisValue }) {
  // 1. Let g be the this value.
  const g = thisValue;
  // 2. Let C be ThrowCompletion(exception).
  const C = ThrowCompletion(exception);
  // 3. Return ? GeneratorResumeAbrupt(g, C).
  return Q(GeneratorResumeAbrupt(g, C));
}

export function bootstrapGeneratorFunctionPrototypePrototype(realmRec) {
  const generatorPrototype = bootstrapPrototype(realmRec, [
    ['next', GeneratorProto_next, 1],
    ['return', GeneratorProto_return, 1],
    ['throw', GeneratorProto_throw, 1],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Generator');

  realmRec.Intrinsics['%GeneratorFunction.prototype.prototype%'] = generatorPrototype;
}
