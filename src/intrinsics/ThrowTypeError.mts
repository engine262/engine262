import { surroundingAgent } from '../host-defined/engine.mts';
import { Value } from '../value.mts';
import { X } from '../completion.mts';
import {
  Assert,
  CreateBuiltinFunction,
  Realm,
  SetIntegrityLevel,
} from '#self';

/** https://tc39.es/ecma262/#sec-%throwtypeerror% */
function ThrowTypeError() {
  // 1. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'StrictPoisonPill');
}

export function bootstrapThrowTypeError(realmRec: Realm) {
  const f = X(CreateBuiltinFunction(ThrowTypeError, 0, Value(''), [], realmRec));
  Assert(X(SetIntegrityLevel(f, 'frozen')) === Value.true);
  realmRec.Intrinsics['%ThrowTypeError%'] = f;
}
