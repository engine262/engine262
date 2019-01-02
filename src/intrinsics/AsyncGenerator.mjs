import { X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { Descriptor, Value } from '../value.mjs';

export function CreateAsyncGenerator(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['prototype', realmRec.Intrinsics['%AsyncGeneratorPrototype%'], undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%FunctionPrototype%'], 'AsyncGeneratorFunction');

  X(realmRec.Intrinsics['%AsyncGeneratorPrototype%'].DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: proto,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%AsyncGenerator%'] = proto;
}
