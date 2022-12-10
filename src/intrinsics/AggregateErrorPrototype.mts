// @ts-nocheck
import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function bootstrapAggregateErrorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['name', Value.of('AggregateError')],
    ['message', Value.of('')],
  ], realmRec.Intrinsics['%Error.prototype%'], 'AggregateError');

  realmRec.Intrinsics['%AggregateError.prototype%'] = proto;
}
