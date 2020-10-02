import { X } from '../completion.mjs';
import { Descriptor, Value } from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

export function BootstrapAsyncGeneratorFunctionPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['prototype', realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'], undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'AsyncGeneratorFunction');

  X(realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'].DefineOwnProperty(new Value('constructor'), Descriptor({
    Value: proto,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'] = proto;
}
