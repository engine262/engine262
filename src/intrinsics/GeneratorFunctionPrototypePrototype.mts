import {
  GeneratorResume,
  GeneratorResumeAbrupt,
  Realm,
} from '../abstract-ops/all.mts';
import {
  Completion,
  ThrowCompletion,
  Q,
  X,
} from '../completion.mts';
import {
  Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-generator.prototype.next */
function GeneratorProto_next([value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let g be the this value.
  const g = thisValue;
  // 2. Return ? GeneratorResume(g, value, empty).
  return Q(GeneratorResume(g, value, undefined));
}

/** https://tc39.es/ecma262/#sec-generator.prototype.return */
function GeneratorProto_return([value = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let g be the this value.
  const g = thisValue;
  // 2. Let C be Completion { [[Type]]: return, [[Value]]: value, [[Target]]: empty }.
  const C = new Completion({ Type: 'return', Value: value, Target: undefined });
  // 3. Return ? GeneratorResumeAbrupt(g, C, empty).
  return Q(GeneratorResumeAbrupt(g, C, undefined));
}

/** https://tc39.es/ecma262/#sec-generator.prototype.throw */
function GeneratorProto_throw([exception = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Let g be the this value.
  const g = thisValue;
  // 2. Let C be ThrowCompletion(exception).
  const C = ThrowCompletion(exception);
  // 3. Return ? GeneratorResumeAbrupt(g, C, empty).
  return Q(GeneratorResumeAbrupt(g, C, undefined));
}

export function bootstrapGeneratorFunctionPrototypePrototype(realmRec: Realm) {
  const generatorPrototype = bootstrapPrototype(realmRec, [
    ['next', GeneratorProto_next, 1],
    ['return', GeneratorProto_return, 1],
    ['throw', GeneratorProto_throw, 1],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Generator');

  realmRec.Intrinsics['%GeneratorFunction.prototype.prototype%'] = generatorPrototype;

  // Used by `CreateListIteratorRecord`:
  realmRec.Intrinsics['%GeneratorFunction.prototype.prototype.next%'] = X(generatorPrototype.Get(Value('next'), generatorPrototype));
}
