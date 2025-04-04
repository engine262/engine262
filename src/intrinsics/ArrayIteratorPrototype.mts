import {
  GeneratorResume,
  Realm,
} from '../abstract-ops/all.mts';
import { Q, type ValueEvaluator } from '../completion.mts';
import {
  Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next */
function* ArrayIteratorPrototype_next(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Return ? GeneratorResume(this value, empty, "%ArrayIteratorPrototype%").
  return Q(yield* GeneratorResume(thisValue, undefined, Value('%ArrayIteratorPrototype%')));
}

export function bootstrapArrayIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', ArrayIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%Iterator.prototype%'], 'Array Iterator');

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
