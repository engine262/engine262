import { wellKnownSymbols } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-%iteratorprototype%-@@iterator
function IteratorPrototype_iterator(args, { thisValue }) {
  // 1. Return this value.
  return thisValue;
}

export function BootstrapIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
