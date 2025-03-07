// @ts-nocheck
import {
  GeneratorResume,
} from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';
import { Value } from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

const kStringIteratorPrototype = Value('%StringIteratorPrototype%');

/** https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next */
function StringIteratorPrototype_next(args, { thisValue }) {
  // 1. Return ? GeneratorResume(this value, empty, "%StringIteratorPrototype%").
  return Q(GeneratorResume(thisValue, undefined, kStringIteratorPrototype));
}

export function bootstrapStringIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', StringIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'String Iterator');

  realmRec.Intrinsics['%StringIteratorPrototype%'] = proto;
}
