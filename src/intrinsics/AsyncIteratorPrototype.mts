import { wellKnownSymbols } from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import type { Arguments, FunctionCallContext, Realm } from '#self';

/** https://tc39.es/ecma262/#sec-asynciteratorprototype-asynciterator */
function AsyncIteratorPrototype_asyncIterator(_args: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Return the this value.
  return thisValue;
}

export function bootstrapAsyncIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    [wellKnownSymbols.asyncIterator, AsyncIteratorPrototype_asyncIterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
