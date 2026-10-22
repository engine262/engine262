import { X } from '../completion.mts';
import {
  Assert,
  CreateBuiltinFunction,
  Realm,
  SetIntegrityLevel,
  Throw,
} from '#self';

/** https://tc39.es/ecma262/#sec-%throwtypeerror% */
function ThrowTypeError() {
  // 1. Throw a TypeError exception.
  return Throw.TypeError('The caller, callee, and arguments properties may not be accessed on functions or the arguments objects for calls to them');
}

export function bootstrapThrowTypeError(realm: Realm) {
  const f = CreateBuiltinFunction(ThrowTypeError, 0, '', [], { realm });
  Assert(X(SetIntegrityLevel(f, 'frozen')));
  realm.Intrinsics['%ThrowTypeError%'] = f;
}
