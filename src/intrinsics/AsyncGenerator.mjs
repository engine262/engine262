import { X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { Descriptor, Value } from '../value.mjs';

export function CreateAsyncGenerator(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['prototype', realmRec.Intrinsics['%AsyncGenerator.prototype%'], undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'AsyncGeneratorFunction');

  X(realmRec.Intrinsics['%AsyncGenerator.prototype%'].DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: proto,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'] = proto;
}
