import type { Realm } from '../api.mjs';
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function bootstrapSuppressedErrorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['name', Value('SuppressedError')],
    ['message', Value('')],
  ], realmRec.Intrinsics['%Error.prototype%'], 'SuppressedError');

  realmRec.Intrinsics['%SuppressedError.prototype%'] = proto;
}
