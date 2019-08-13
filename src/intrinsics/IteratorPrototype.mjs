import { BootstrapPrototype } from './Bootstrap.mjs';
import { wellKnownSymbols } from '../value.mjs';

// 25.1.2.1 sec-%iteratorprototype%-@@iterator
function IteratorPrototype_iterator(args, { thisValue }) {
  return thisValue;
}

export function CreateIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
