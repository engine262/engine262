import { F, Realm } from '../abstract-ops/all.mts';
import { Value } from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';
import { typedArrayInfoByName, type TypedArrayConstructorNames } from './TypedArray.mts';

/** https://tc39.es/ecma262/#sec-properties-of-typedarray-prototype-objects */
export function bootstrapTypedArrayPrototypes(realmRec: Realm) {
  Object.entries(typedArrayInfoByName).forEach(([TypedArray, info]) => {
    const proto = bootstrapPrototype(realmRec, [
      ['BYTES_PER_ELEMENT', F(info.ElementSize), undefined, {
        Writable: Value.false,
        Configurable: Value.false,
      }],
    ], realmRec.Intrinsics['%TypedArray.prototype%']);
    realmRec.Intrinsics[`%${TypedArray as TypedArrayConstructorNames}.prototype%`] = proto;
  });
}
