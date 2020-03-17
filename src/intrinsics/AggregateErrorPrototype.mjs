import { Value } from '../value.mjs';
import { RequireInternalSlot, CreateArrayFromList } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// https://tc39.es/proposal-promise-any/#sec-aggregate-error.prototype.name
function AggregateErrorProto_errors(args, { thisValue }) {
  // 1. Let E be the this value.
  const E = thisValue;
  // 2. If Type(E) is not Object, throw a TypeError exception.
  // 3. If E does not have an [[ErrorData]] internal slot, throw a TypeError exception.
  // 4. If E does not have an [[AggregateErrors]] internal slot, throw a TypeError exception.
  Q(RequireInternalSlot(E, 'AggregateErrors'));
  // 5. Return ! CreateArrayFromList(E.[[AggregateErrors]]).
  return X(CreateArrayFromList(E.AggregateErrors));
}

export function BootstrapAggregateErrorPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['name', new Value('AggregateError')],
    ['message', new Value('')],
    ['errors', [AggregateErrorProto_errors]],
  ], realmRec.Intrinsics['%Error.prototype%'], 'AggregateError');

  realmRec.Intrinsics['%AggregateError.prototype%'] = proto;
}
