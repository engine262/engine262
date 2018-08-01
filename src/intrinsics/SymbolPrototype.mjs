import {
  ObjectValue,
} from '../value.mjs';

export function CreateSymbolPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  realmRec.Intrinsics['%SymbolPrototype%'] = proto;
}
