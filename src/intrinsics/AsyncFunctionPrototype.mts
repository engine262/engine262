// @ts-nocheck
import { bootstrapPrototype } from './bootstrap.mts';

export function bootstrapAsyncFunctionPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Function.prototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunction.prototype%'] = proto;
}
