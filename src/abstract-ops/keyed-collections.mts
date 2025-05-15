import {
  F, R,
} from './all.mts';
import {
  NumberValue, Value,
} from '#self';

// This file covers abstract operations defined in
// https://tc39.es/ecma262/#sec-abstract-operations-for-keyed-collections

/** https://tc39.es/ecma262/#sec-canonicalizekeyedcollectionkey */
export function CanonicalizeKeyedCollectionKey(key : Value) : Value {
  // 1. If key is -0𝔽, return +0𝔽.
  if (key instanceof NumberValue && Object.is(R(key), -0)) {
    key = F(+0);
  }
  // 2. Return key.
  return key;
}
