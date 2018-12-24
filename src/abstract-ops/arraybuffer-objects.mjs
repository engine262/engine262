import {
  Assert,
  CreateByteDataBlock,
  CopyDataBlockBytes,
  IsConstructor,
  OrdinaryCreateFromConstructor,
  SameValue,
  numericTypeInfo,
} from './all.mjs';
import { Q, X, NormalCompletion } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { msg } from '../helpers.mjs';
import { Value, Type } from '../value.mjs';

// 24.1.1.1 #sec-allocatearraybuffer
export function AllocateArrayBuffer(constructor, byteLength) {
  const obj = Q(OrdinaryCreateFromConstructor(constructor, '%ArrayBufferPrototype%', ['ArrayBufferData', 'ArrayBufferByteLength', 'ArrayBufferDetachKey']));
  Assert(byteLength.numberValue() >= 0);
  Assert(Number.isInteger(byteLength.numberValue()));
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

// 24.1.1.3 #sec-detacharraybuffer
export function DetachArrayBuffer(arrayBuffer, key) {
  Assert(Type(arrayBuffer) === 'Object' && 'ArrayBufferData' in arrayBuffer && 'ArrayBufferByteLength' in arrayBuffer && 'ArrayBufferDetachKey' in arrayBuffer);
  Assert(IsSharedArrayBuffer(arrayBuffer) === Value.false);
  if (key === undefined) {
    key = Value.undefined;
  }
  if (SameValue(arrayBuffer.ArrayBufferDetachKey, key) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetachKeyMismatch', key, arrayBuffer));
  }
  arrayBuffer.ArrayBufferData = Value.null;
  arrayBuffer.ArrayBufferByteLength = new Value(0);
  return new NormalCompletion(Value.null);
}

// 24.1.1.4 #sec-clonearraybuffer
export function CloneArrayBuffer(srcBuffer, srcByteOffset, srcLength, cloneConstructor) {
  Assert(Type(srcBuffer) === 'Object' && 'ArrayBufferData' in srcBuffer);
  Assert(IsConstructor(cloneConstructor) === Value.true);
  const targetBuffer = Q(AllocateArrayBuffer(cloneConstructor, srcLength));
  if (IsDetachedBuffer(srcBuffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  const srcBlock = srcBuffer.ArrayBufferData;
  const targetBlock = targetBuffer.ArrayBufferData;
  CopyDataBlockBytes(targetBlock, new Value(0), srcBlock, srcByteOffset, srcLength);
  return targetBuffer;
}

const throwawayBuffer = new ArrayBuffer(8);
const throwawayDataView = new DataView(throwawayBuffer);
const throwawayArray = new Uint8Array(throwawayBuffer);

// 24.1.1.5 #sec-rawbytestonumber
// Sigh…
export function RawBytesToNumber(type, rawBytes, isLittleEndian) {
  isLittleEndian = isLittleEndian === Value.true;
  const elementSize = numericTypeInfo.get(type).ElementSize;
  Assert(elementSize === rawBytes.length);
  const dataViewType = type === 'Uint8C' ? 'Uint8' : type;
  Object.assign(throwawayArray, rawBytes);
  return new Value(throwawayDataView[`get${dataViewType}`](0, isLittleEndian));
}

// 24.1.1.6 #sec-getvaluefrombuffer
export function GetValueFromBuffer(arrayBuffer, byteIndex, type, isTypedArray, order, isLittleEndian) {
  byteIndex = byteIndex.numberValue();
  Assert(!IsDetachedBuffer(arrayBuffer));
  const info = numericTypeInfo.get(type);
  Assert(info !== undefined);
  Assert(arrayBuffer.ArrayBufferByteLength.numberValue() - byteIndex >= info.ElementSize);
  Assert(byteIndex >= 0 && Number.isInteger(byteIndex));
  const block = arrayBuffer.ArrayBufferData;
  const elementSize = info.ElementSize;
  // if (IsSharedArrayBuffer(arrayBuffer) === Value.true) {
  //
  // } else {
  const rawValue = [...block.subarray(byteIndex, byteIndex + elementSize)];
  // }
  if (isLittleEndian === undefined) {
    isLittleEndian = surroundingAgent.LittleEndian;
  }
  return RawBytesToNumber(type, rawValue, isLittleEndian);
}

// An implementation must always choose the same encoding for each
// implementation distinguishable NaN value.
const float32NaNLE = Object.freeze([0, 0, 192, 127]);
const float32NaNBE = Object.freeze([127, 192, 0, 0]);
const float64NaNLE = Object.freeze([0, 0, 0, 0, 0, 0, 248, 127]);
const float64NaNBE = Object.freeze([127, 248, 0, 0, 0, 0, 0, 0]);

// 24.1.1.7 #sec-numbertorawbytes
export function NumberToRawBytes(type, value, isLittleEndian) {
  Assert(Type(isLittleEndian) === 'Boolean');
  isLittleEndian = isLittleEndian === Value.true;
  let rawBytes;
  // One day, we will write our own IEEE 754 and two's complement encoder…
  if (type === 'Float32') {
    if (Number.isNaN(value.numberValue())) {
      rawBytes = isLittleEndian ? [...float32NaNLE] : [...float32NaNBE];
    } else {
      throwawayDataView.setFloat32(0, value.numberValue(), isLittleEndian);
      rawBytes = [...throwawayArray.subarray(0, 4)];
    }
  } else if (type === 'Float64') {
    if (Number.isNaN(value.numberValue())) {
      rawBytes = isLittleEndian ? [...float64NaNLE] : [...float64NaNBE];
    } else {
      throwawayDataView.setFloat64(0, value.numberValue(), isLittleEndian);
      rawBytes = [...throwawayArray.subarray(0, 8)];
    }
  } else {
    const info = numericTypeInfo.get(type);
    const n = info.ElementSize;
    const convOp = info.ConversionOperation;
    const intValue = X(convOp(value)).numberValue();
    const dataViewType = type === 'Uint8C' ? 'Uint8' : type;
    throwawayDataView[`set${dataViewType}`](0, intValue, isLittleEndian);
    rawBytes = [...throwawayArray.subarray(0, n)];
  }
  return rawBytes;
}

// 24.1.1.8 #sec-setvalueinbuffer
export function SetValueInBuffer(arrayBuffer, byteIndex, type, value, isTypedArray, order, isLittleEndian) {
  byteIndex = byteIndex.numberValue();
  Assert(!IsDetachedBuffer(arrayBuffer));
  const info = numericTypeInfo.get(type);
  Assert(info !== undefined);
  Assert(arrayBuffer.ArrayBufferByteLength.numberValue() - byteIndex >= info.ElementSize);
  Assert(byteIndex >= 0 && Number.isInteger(byteIndex));
  Assert(Type(value) === 'Number');
  const block = arrayBuffer.ArrayBufferData;
  // const elementSize = info.ElementSize;
  if (isLittleEndian === undefined) {
    isLittleEndian = surroundingAgent.LittleEndian;
  }
  const rawBytes = NumberToRawBytes(type, value, isLittleEndian);
  // if (IsSharedArrayBuffer(arrayBuffer) === Value.true) {
  //
  // } else {
  for (let i = 0; i < rawBytes.length; i += 1) {
    block[byteIndex + i] = rawBytes[i];
  }
  // }
  return new NormalCompletion(Value.undefined);
}

// 24.2.1.2 #sec-issharedarraybuffer
export function IsSharedArrayBuffer(obj) {
  Assert(Type(obj) === 'Object' && 'ArrayBufferData' in obj);
  const bufferData = obj.ArrayBufferData;
  if (Type(bufferData) === 'Null') {
    return Value.false;
  }
  if (Type(bufferData) === 'Data Block') {
    return Value.false;
  }
  Assert(Type(bufferData) === 'Shared Data Block');
  return Value.true;
}
