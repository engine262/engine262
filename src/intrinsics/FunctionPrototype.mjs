import {
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function CreateFunctionPrototype(realmRec) {
  const proto = CreateBuiltinFunction(() => NewValue(undefined), [], realmRec);
  proto.Prototype = realmRec.Intrinsics['%ObjectPrototype%'];

  realmRec.Intrinsics['%FunctionPrototype%'] = proto;
}
