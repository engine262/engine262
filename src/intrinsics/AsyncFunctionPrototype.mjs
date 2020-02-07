import { BootstrapPrototype } from './Bootstrap.mjs';

export function BootstrapAsyncFunctionPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Function.prototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunction.prototype%'] = proto;
}
