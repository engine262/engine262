import { Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

export function BootstrapAggregateErrorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['name', new Value('AggregateError')],
    ['message', new Value('')],
  ], realmRec.Intrinsics['%Error.prototype%'], 'AggregateError');

  realmRec.Intrinsics['%AggregateError.prototype%'] = proto;
}
