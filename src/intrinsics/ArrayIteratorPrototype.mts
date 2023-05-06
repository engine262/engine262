// @ts-nocheck
import {
  GeneratorResume,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

const kArrayIteratorPrototype = Value('%ArrayIteratorPrototype%');

/** http://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next */
function ArrayIteratorPrototype_next(args, { thisValue }) {
  // 1. Return ? GeneratorResume(this value, empty, "%ArrayIteratorPrototype%").
  return Q(GeneratorResume(thisValue, undefined, kArrayIteratorPrototype));
}

export function bootstrapArrayIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['next', ArrayIteratorPrototype_next, 0],
  ], realmRec.Intrinsics['%IteratorPrototype%'], 'Array Iterator');

  realmRec.Intrinsics['%ArrayIteratorPrototype%'] = proto;
}
