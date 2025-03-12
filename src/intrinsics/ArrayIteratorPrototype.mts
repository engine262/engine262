import {
  GeneratorResume,
  Realm,
} from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';
import {
  Value, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

const kArrayIteratorPrototype = Value('%ArrayIteratorPrototype%');

/** https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next */
function ArrayIteratorPrototype_next(_args: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Return ? GeneratorResume(this value, empty, "%ArrayIteratorPrototype%").
  return Q(GeneratorResume(thisValue, undefined, kArrayIteratorPrototype));
}

export function bootstrapArrayIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', ArrayIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Array Iterator');

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
