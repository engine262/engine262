import {
  Assert,
  typedArrayInfo,
} from '../abstract-ops/all.mjs';
import { Descriptor, Value } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function CreateTypedArrayPrototype(realmRec, TypedArray) {
  const info = typedArrayInfo.get(TypedArray);
  Assert(info !== undefined);

  const readonly = Descriptor({ Writable: Value.false, Configurable: Value.false });

  const proto = BootstrapPrototype(realmRec, [
    ['BYTES_PER_ELEMENT', new Value(info.ElementSize), undefined, readonly],
  ], realmRec.Intrinsics['%TypedArrayPrototype%']);
  realmRec.Intrinsics[`%${TypedArray}Prototype%`] = proto;
}

export function CreateTypedArrayPrototypes(realmRec) {
  for (const TypedArray of typedArrayInfo.keys()) {
    CreateTypedArrayPrototype(realmRec, TypedArray);
  }
}
