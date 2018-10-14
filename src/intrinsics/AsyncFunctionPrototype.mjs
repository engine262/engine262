import { BootstrapPrototype } from './Bootstrap.mjs';

export function CreateAsyncFunctionPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [], realmRec.Intrinsics['%FunctionPrototype%'], 'AsyncFunction');

  realmRec.Intrinsics['%AsyncFunctionPrototype%'] = proto;
}
