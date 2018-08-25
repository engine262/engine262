import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  IsConstructor,
  IsExtensible,
  DefinePropertyOrThrow,
  ObjectCreate,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
  FunctionValue,
} from '../value.mjs';
import { X, NormalCompletion } from '../completion.mjs';

// #sec-makeconstructor
export function MakeConstructor(F, writablePrototype, prototype) {
  Assert(F instanceof FunctionValue);
  Assert(IsConstructor(F).isTrue());
  Assert(IsExtensible(F).isTrue() && F.HasProperty(NewValue('prototype')).isFalse());
  if (writablePrototype === undefined) {
    writablePrototype = true;
  }
  if (prototype === undefined) {
    prototype = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
    X(DefinePropertyOrThrow(prototype, NewValue('constructor'), {
      Value: F,
      Writable: writablePrototype,
      Enumerable: false,
      Configurable: true,
    }));
  }
  X(DefinePropertyOrThrow(F, NewValue('prototype'), {
    Value: prototype,
    Writable: writablePrototype,
    Enumerable: false,
    Configurable: true,
  }));
  return new NormalCompletion(NewValue(undefined));
}
