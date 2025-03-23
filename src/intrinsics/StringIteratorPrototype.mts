import {
  GeneratorResume,
  Realm,
} from '../abstract-ops/all.mts';
import { Q, type ValueEvaluator } from '../completion.mts';
import {
  Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next */
function* StringIteratorPrototype_next(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Return ? GeneratorResume(this value, empty, "%StringIteratorPrototype%").
  return Q(yield* GeneratorResume(thisValue, undefined, Value('%StringIteratorPrototype%')));
}

export function bootstrapStringIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', StringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'String Iterator');

  realmRec.Intrinsics['%StringIteratorPrototype%'] = proto;
}
