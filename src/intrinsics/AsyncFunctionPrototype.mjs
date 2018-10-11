import { Value, wellKnownSymbols } from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

export function CreateAsyncFunctionPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    [wellKnownSymbols.toStringTag, new Value('AsyncFunction'), undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%FunctionPrototype%']);

  realmRec.Intrinsics['%AsyncFunctionPrototype%'] = proto;
}
