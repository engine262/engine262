import { wellKnownSymbols } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-asynciteratorprototype-asynciterator
function AsyncIteratorPrototype_asyncIterator(args, { thisValue }) {
  // 1. Return the this value.
  return thisValue;
}

export function BootstrapAsyncIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    [wellKnownSymbols.asyncIterator, AsyncIteratorPrototype_asyncIterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
