import {
  GeneratorResume,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

const kStringIteratorPrototype = new Value('%StringIteratorPrototype%');

// #sec-%stringiteratorprototype%.next
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
