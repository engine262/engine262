import { bootstrapPrototype } from './bootstrap.mjs';

export function bootstrapAsyncFunctionPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Function.prototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunction.prototype%'] = proto;
}
