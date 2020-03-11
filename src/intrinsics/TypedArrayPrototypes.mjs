import { typedArrayInfoByName } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// #sec-properties-of-typedarray-prototype-objects
export function BootstrapTypedArrayPrototypes(realmRec) {
  Object.entries(typedArrayInfoByName).forEach(([TypedArray, info]) => {
    const proto = BootstrapPrototype(realmRec, [
      ['BYTES_PER_ELEMENT', new Value(info.ElementSize), undefined, {
        Writable: Value.false,
        Configurable: Value.false,
      }],
    ], realmRec.Intrinsics['%TypedArray.prototype%']);
    realmRec.Intrinsics[`%${TypedArray}.prototype%`] = proto;
  });
}
