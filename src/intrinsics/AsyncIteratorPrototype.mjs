import { wellKnownSymbols } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function AsyncIteratorPrototype_asyncIterator(args, { thisValue }) {
  return thisValue;
}

export function BootstrapAsyncIteratorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    [wellKnownSymbols.asyncIterator, AsyncIteratorPrototype_asyncIterator, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%AsyncIteratorPrototype%'] = proto;
}
