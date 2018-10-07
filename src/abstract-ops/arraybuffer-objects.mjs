import {
  Assert,
  CreateByteDataBlock,
  OrdinaryCreateFromConstructor,
} from './all.mjs';
import { Q } from '../completion.mjs';
import { Type } from '../value.mjs';

// 24.1.1.1 #sec-allocatearraybuffer
export function AllocateArrayBuffer(constructor, byteLength) {
  const obj = Q(OrdinaryCreateFromConstructor(constructor, '%ArrayBufferPrototype%', ['ArrayBufferData', 'ArrayBufferByteLength', 'ArrayBufferDetachKey']));
  Assert(byteLength.numberValue() >= 0);
  Assert(Number.isSafeInteger(byteLength.numberValue()));
  const block = Q(CreateByteDataBlock(byteLength));
  obj.ArrayBufferData = block;
  obj.ArrayBufferByteLength = byteLength;
  return obj;
}

// 24.1.1.2 #sec-isdetachedbuffer
export function IsDetachedBuffer(arrayBuffer) {
  Assert(Type(arrayBuffer) === 'Object' && 'ArrayBufferData' in arrayBuffer);
  if (Type(arrayBuffer.ArrayBufferData) === 'Null') {
    return true;
  }
  return false;
}

// 24.2.1.2 #sec-issharedarraybuffer
export function IsSharedArrayBuffer(obj) {
  Assert(Type(obj) === 'Object' && 'ArrayBufferData' in obj);
  const bufferData = obj.ArrayBufferData;
  if (Type(bufferData) === 'Null') {
    return false;
  }
  if (Type(bufferData) === 'Data Block') {
    return false;
  }
  Assert(Type(bufferData) === 'Shared Data Block');
  return true;
}
