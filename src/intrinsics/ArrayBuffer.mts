import { surroundingAgent } from '../host-defined/engine.mts';
import {
  ObjectValue, UndefinedValue, Value, wellKnownSymbols, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { Q } from '../completion.mts';
import {
  ToIndex, AllocateArrayBuffer, type FunctionObject, Realm,
} from '../abstract-ops/all.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-arraybuffer-length */
function* ArrayBufferConstructor(this: FunctionObject, [length = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let byteLength be ? ToIndex(length).
  const byteLength = Q(yield* ToIndex(length));
  // 3. Return ? AllocateArrayBuffer(NewTarget, byteLength).
  return Q(yield* AllocateArrayBuffer(NewTarget, byteLength));
}

/** https://tc39.es/ecma262/#sec-arraybuffer.isview */
function ArrayBuffer_isView([arg = Value.undefined]: Arguments) {
  // 1. If Type(arg) is not Object, return false.
  if (!(arg instanceof ObjectValue)) {
    return Value.false;
  }
  // 2. If arg has a [[ViewedArrayBuffer]] internal slot, return true.
  if ('ViewedArrayBuffer' in arg) {
    return Value.true;
  }
  // 3. Return false.
  return Value.false;
}

/** https://tc39.es/ecma262/#sec-get-arraybuffer-@@species */
function ArrayBuffer_species(_: Arguments, { thisValue }: FunctionCallContext) {
  return thisValue;
}

export function bootstrapArrayBuffer(realmRec: Realm) {
  const c = bootstrapConstructor(realmRec, ArrayBufferConstructor, 'ArrayBuffer', 1, realmRec.Intrinsics['%ArrayBuffer.prototype%'], [
    ['isView', ArrayBuffer_isView, 1],
    [wellKnownSymbols.species, [ArrayBuffer_species]],
  ]);
  realmRec.Intrinsics['%ArrayBuffer%'] = c;
}
