import { surroundingAgent } from '../engine.mjs';
import {
  AllocateArrayBuffer,
  ToIndex,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// 24.1.2 #sec-arraybuffer-constructor
function ArrayBufferConstructor([length], { NewTarget }) {
  if (Type(NewTarget) === 'Undefined') {
    return surroundingAgent.Throw('TypeError', 'ArrayBuffer constructor requires new');
  }
  const byteLength = Q(ToIndex(length));
  return Q(AllocateArrayBuffer(NewTarget, byteLength));
}

// 24.1.3.1 #sec-arraybuffer.isview
function ArrayBuffer_isView([arg]) {
  if (Type(arg) !== 'Object') {
    return Value.false;
  }
  if ('ViewedArrayBuffer' in arg) {
    return Value.true;
  }
  return Value.false;
}

// 24.1.3.3 #sec-get-arraybuffer-@@species
function ArrayBuffer_speciesGetter(a, { thisValue }) {
  return thisValue;
}

export function CreateArrayBuffer(realmRec) {
  const abConstructor = BootstrapConstructor(realmRec, ArrayBufferConstructor, 'ArrayBuffer', 1, realmRec.Intrinsics['%ArrayBufferPrototype%'], [
    ['isView', ArrayBuffer_isView, 1],
    [wellKnownSymbols.species, [ArrayBuffer_speciesGetter]],
  ]);

  realmRec.Intrinsics['%ArrayBuffer%'] = abConstructor;
}
