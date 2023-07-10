// @ts-nocheck
import { Call, GetMethod, Q } from '../api.mjs';
import { Value, wellKnownSymbols } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator */
function IteratorPrototype_iterator(args, { thisValue }) {
  // 1. Return this value.
  return thisValue;
}

/** https://tc39.es/proposal-explicit-resource-management/#sec-%iteratorprototype%-@@dispose */
function IteratorPrototype_dispose(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Let return be ? GetMethod(O, "return").
  const return_ = Q(GetMethod(O, Value('return')));
  // 3. If return is not undefined, then
  if (return_ !== Value.undefined) {
    // a. Perform ? Call(return, O, « »).
    Q(Call(return_, O, []));
  }
  // 4. Return undefined.
  return Value.undefined;
}

export function bootstrapIteratorPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
    [wellKnownSymbols.dispose, IteratorPrototype_dispose, 0],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%IteratorPrototype%'] = proto;
}
