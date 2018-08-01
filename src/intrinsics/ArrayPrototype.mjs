import {
  ArrayValue,
} from '../value.mjs';

export function CreateArrayPrototype(realmRec) {
  const proto = new ArrayValue(realmRec);

  realmRec.Intrinsics['%ArrayPrototype%'] = proto;
}
