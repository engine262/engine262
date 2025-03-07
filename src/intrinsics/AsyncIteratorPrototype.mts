// @ts-nocheck
import { wellKnownSymbols } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-asynciteratorprototype-asynciterator */
function AsyncIteratorPrototype_asyncIterator(args, { thisValue }) {
  // 1. Return the this value.
  return thisValue;
}

export function bootstrapAsyncIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    [wellKnownSymbols.asyncIterator, AsyncIteratorPrototype_asyncIterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
