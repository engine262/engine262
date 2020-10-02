import { bootstrapPrototype } from './bootstrap.mjs';

export function BootstrapAsyncFunctionPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Function.prototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunction.prototype%'] = proto;
}
