import { surroundingAgent } from '../engine.mjs';
import {
  Construct,
  CopyDataBlockBytes,
  IsDetachedBuffer,
  IsSharedArrayBuffer,
  SameValue,
  SpeciesConstructor,
  ToInteger,
} from '../abstract-ops/all.mjs';
import { Type, Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// 24.1.4.1 #sec-get-arraybuffer.prototype.bytelength
function ArrayBufferProto_byteLengthGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object'
      || !('ArrayBufferData' in O)
      || IsSharedArrayBuffer(O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'this value is not an ArrayBuffer');
  }
  if (IsDetachedBuffer(O)) {
    return surroundingAgent.Throw('TypeError', 'Provided ArrayBuffer is detached');
  }
  const length = O.ArrayBufferByteLength;
  return length;
}

// 24.1.4.3 #sec-arraybuffer.prototype.slice
function ArrayBufferProto_slice([start, end], { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object'
      || !('ArrayBufferData' in O)
      || IsSharedArrayBuffer(O) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'this value is not an ArrayBuffer');
  }
  if (IsDetachedBuffer(O)) {
    return surroundingAgent.Throw('TypeError', 'Provided ArrayBuffer is detached');
  }
  const len = O.ArrayBufferByteLength.numberValue();
  const relativeStart = Q(ToInteger(start)).numberValue();
  let first;
  if (relativeStart < 0) {
    first = Math.max(len + relativeStart, 0);
  } else {
    first = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (Type(end) === 'Undefined') {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToInteger(end)).numberValue();
  }
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  const newLen = Math.max(final - first, 0);
  const ctor = Q(SpeciesConstructor(O, surroundingAgent.intrinsic('%ArrayBuffer%')));
  const neww = Q(Construct(ctor, [new Value(newLen)]));
  if (!('ArrayBufferData' in neww) || IsSharedArrayBuffer(neww) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'Subclass constructor did not return a ArrayBuffer');
  }
  if (IsDetachedBuffer(neww)) {
    return surroundingAgent.Throw('TypeError', 'Subclass constructor returned a detached ArrayBuffer');
  }
  if (SameValue(neww, O)) {
    return surroundingAgent.Throw('TypeError', 'Subclass constructor returned the current ArrayBuffer');
  }
  if (neww.ArrayBufferByteLength.numberValue() < newLen) {
    return surroundingAgent.Throw('TypeError', 'Subclass constructor returned a smaller-than-requested ArrayBuffer');
  }
  if (IsDetachedBuffer(O)) {
    return surroundingAgent.Throw('TypeError', 'Provided ArrayBuffer is detached');
  }
  const fromBuf = O.ArrayBufferData;
  const toBuf = neww.ArrayBufferData;
  CopyDataBlockBytes(toBuf, new Value(0), fromBuf, new Value(first), new Value(newLen));
  return neww;
}

export function CreateArrayBufferPrototype(realmRec) {
  const proto = BootstrapPrototype(realmRec, [
    ['byteLength', [ArrayBufferProto_byteLengthGetter]],
    ['slice', ArrayBufferProto_slice, 2],
  ], realmRec.Intrinsics['%ObjectPrototype%'], 'ArrayBuffer');

  realmRec.Intrinsics['%ArrayBufferPrototype%'] = proto;
}
