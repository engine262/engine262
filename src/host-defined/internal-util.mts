import {
  Assert, IsAccessorDescriptor, IsDataDescriptor, IsPropertyKey,
} from '../abstract-ops/all.mts';
import { X } from '../completion.mts';
import { isProxyExoticObject } from '../intrinsics/Proxy.mts';
import {
  Descriptor, NullValue, ObjectValue, UndefinedValue, Value,
  type PropertyKeyValue,
} from '../value.mts';

/**
 * Like `OrdinaryGet`, but doesn't call into proxies or invoke getters.
 */
export function getNoSideEffects(
  O: ObjectValue,
  P: PropertyKeyValue,
): Value | (Descriptor & { Get: Value; Set: Value }) | undefined {
  Assert(O instanceof ObjectValue && !isProxyExoticObject(O));
  Assert(IsPropertyKey(P));

  const desc = X(O.GetOwnProperty(P));
  if (desc instanceof UndefinedValue) {
    const parent = X(O.GetPrototypeOf());
    if (parent instanceof NullValue || isProxyExoticObject(parent)) {
      return undefined;
    }
    return getNoSideEffects(parent, P);
  }

  if (IsDataDescriptor(desc)) {
    return desc.Value;
  }

  Assert(IsAccessorDescriptor(desc));
  return desc;
}
