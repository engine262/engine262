// @ts-nocheck
import { X } from '../completion.mts';
import { Descriptor, Value } from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

export function bootstrapAsyncGeneratorFunctionPrototype(realmRec) {
  const proto = bootstrapPrototype(realmRec, [
    ['prototype', realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'], undefined, { Writable: Value.false }],
  ], realmRec.Intrinsics['%Function.prototype%'], 'AsyncGeneratorFunction');

  X(realmRec.Intrinsics['%AsyncGeneratorFunction.prototype.prototype%'].DefineOwnProperty(Value('constructor'), Descriptor({
    Value: proto,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%AsyncGeneratorFunction.prototype%'] = proto;
}
