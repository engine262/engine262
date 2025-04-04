import { wellKnownSymbols } from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import type { Arguments, FunctionCallContext, Realm } from '#self';

/** https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator */
function IteratorPrototype_iterator(_args: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Return this value.
  return thisValue;
}

export function bootstrapIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
