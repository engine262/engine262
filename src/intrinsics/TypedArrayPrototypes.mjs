import {
  Assert,
  typedArrayInfo,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function CreateTypedArrayPrototype(realmRec, TypedArray) {
  const info = typedArrayInfo.get(TypedArray);
  Assert(info !== undefined);

  const readonly = { Writable: Value.false, Configurable: Value.false };

  const proto = BootstrapPrototype(realmRec, [
    ['BYTES_PER_ELEMENT', new Value(info.ElementSize), undefined, readonly],
  ], realmRec.Intrinsics['%TypedArray.prototype%']);
  realmRec.Intrinsics[`%${TypedArray}.prototype%`] = proto;
}

export function BootstrapTypedArrayPrototypes(realmRec) {
  for (const TypedArray of typedArrayInfo.keys()) {
    CreateTypedArrayPrototype(realmRec, TypedArray);
  }
}
