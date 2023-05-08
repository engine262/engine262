// @ts-nocheck
import { wellKnownSymbols } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator */
function IteratorPrototype_iterator(args, { thisValue }) {
  // 1. Return this value.
  return thisValue;
}

export function bootstrapIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
