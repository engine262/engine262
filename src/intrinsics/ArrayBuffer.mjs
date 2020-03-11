import { surroundingAgent } from '../engine.mjs';
import { Type, Value, wellKnownSymbols } from '../value.mjs';
import { Q } from '../completion.mjs';
import { ToIndex, AllocateArrayBuffer } from '../abstract-ops/all.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// #sec-arraybuffer-length
function ArrayBufferConstructor([length = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget === Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. Let byteLength be ? ToIndex(length).
  const byteLength = Q(ToIndex(length));
  // 3. Return ? AllocateArrayBuffer(NewTarget, byteLength).
  return Q(AllocateArrayBuffer(NewTarget, byteLength));
}

// #sec-arraybuffer.isview
function ArrayBuffer_isView([arg = Value.undefined]) {
  // 1. If Type(arg) is not Object, return false.
  if (Type(arg) !== 'Object') {
    return Value.false;
  }
  // 2. If arg has a [[ViewedArrayBuffer]] internal slot, return true.
  if ('ViewedArrayBuffer' in arg) {
    return Value.true;
  }
  // 3. Return false.
  return Value.false;
}

// #sec-get-arraybuffer-@@species
function ArrayBuffer_species(a, { thisValue }) {
  return thisValue;
}

export function BootstrapArrayBuffer(realmRec) {
  const c = BootstrapConstructor(realmRec, ArrayBufferConstructor, 'ArrayBuffer', 1, realmRec.Intrinsics['%ArrayBuffer.prototype%'], [
    ['isView', ArrayBuffer_isView, 1],
    [wellKnownSymbols.species, [ArrayBuffer_species]],
  ]);
  realmRec.Intrinsics['%ArrayBuffer%'] = c;
}
