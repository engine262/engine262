import { Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function BootstrapAggregateErrorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['name', new Value('AggregateError')],
    ['message', new Value('')],
  ], realmRec.Intrinsics['%Error.prototype%'], 'AggregateError');

  realmRec.Intrinsics['%AggregateError.prototype%'] = proto;
}
