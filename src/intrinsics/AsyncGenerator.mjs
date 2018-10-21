import { BootstrapPrototype } from './Bootstrap.mjs';

export function CreateAsyncGenerator(realmRec) {
  const proto = BootstrapPrototype(realmRec, [], realmRec.Intrinsics['%Object%'], 'AsyncGeneratorFunction');
  proto.Prototype = realmRec.Intrinsics['%FunctionPrototype%'];

  realmRec.Intrinsics['%AsyncGenerator%'] = proto;
}
