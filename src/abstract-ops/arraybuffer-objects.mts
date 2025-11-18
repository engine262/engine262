import { typedArrayInfoByType, type TypedArrayTypes } from '../intrinsics/TypedArray.mts';
import { IsGrowableSharedArrayBuffer, sharedArrayBufferNotSupported } from './shared-arraybuffer.mts';
import {
  surroundingAgent,
  NumberValue, BigIntValue, BooleanValue, Value,
  DataBlock,
  UndefinedValue,
  NullValue,
  Q, X, NormalCompletion, type ValueEvaluator,
  type Mutable,
  Assert, OrdinaryCreateFromConstructor,
  isNonNegativeInteger, CreateByteDataBlock,
  SameValue, CopyDataBlockBytes,
  F,
  Z, R,
  type FunctionObject,
  type OrdinaryObject,
} from '#self';

export interface ArrayBufferObject extends OrdinaryObject {
  readonly ArrayBufferData: DataBlock | NullValue;
  readonly ArrayBufferByteLength: number;
  readonly ArrayBufferDetachKey: Value;
}

export interface ResizableArrayBufferObject extends ArrayBufferObject {
  readonly ArrayBufferMaxByteLength: number;
}

export function isArrayBufferObject(o: Value): o is ArrayBufferObject {
  return 'ArrayBufferDetachKey' in o;
}

/** https://tc39.es/ecma262/#sec-allocatearraybuffer */
export function* AllocateArrayBuffer(constructor: FunctionObject, byteLength: number, maxByteLength?: number): ValueEvaluator<ArrayBufferObject> {
  const slots = ['ArrayBufferData', 'ArrayBufferByteLength', 'ArrayBufferDetachKey'];
  let allocatingResizableBuffer;
  if (maxByteLength !== undefined) {
    allocatingResizableBuffer = true;
  } else {
    allocatingResizableBuffer = false;
  }
  if (allocatingResizableBuffer) {
    if (byteLength > maxByteLength!) {
      return surroundingAgent.Throw('RangeError', 'ResizableBufferInvalidMaxByteLength');
    }
    slots.push('ArrayBufferMaxByteLength');
  }
  const obj = Q(yield* OrdinaryCreateFromConstructor(constructor, '%ArrayBuffer.prototype%', slots)) as Mutable<ArrayBufferObject>;
  // 2. Assert: byteLength is a non-negative integer.
  Assert(isNonNegativeInteger(byteLength));
  // 3. Let block be ? CreateByteDataBlock(byteLength).
  const block = Q(CreateByteDataBlock(byteLength));
  // 4. Set obj.[[ArrayBufferData]] to block.
  obj.ArrayBufferData = block;
  // 5. Set obj.[[ArrayBufferByteLength]] to byteLength.
  obj.ArrayBufferByteLength = byteLength;
  // 6. Return obj.
  if (allocatingResizableBuffer) {
    (obj as Mutable<ResizableArrayBufferObject>).ArrayBufferMaxByteLength = maxByteLength!;
  }
  return obj;
}

/** https://tc39.es/ecma262/#sec-isdetachedbuffer */
export function IsDetachedBuffer(arrayBuffer: ArrayBufferObject) {
  if (arrayBuffer.ArrayBufferData === Value.null) {
    return true;
  }
  return false;
}

/** https://tc39.es/ecma262/#sec-detacharraybuffer */
export function DetachArrayBuffer(arrayBuffer: Mutable<ArrayBufferObject>, key?: Value) {
  // 2. Assert: IsSharedArrayBuffer(arrayBuffer) is false.
  Assert(!IsSharedArrayBuffer(arrayBuffer));
  // 3. If key is not present, set key to undefined.
  if (key === undefined) {
    key = Value.undefined;
  }
  // 4. If SameValue(arrayBuffer.[[ArrayBufferDetachKey]], key) is false, throw a TypeError exception.
  if (SameValue(arrayBuffer.ArrayBufferDetachKey, key) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'BufferDetachKeyMismatch', key, arrayBuffer);
  }
  Q(surroundingAgent.debugger_tryTouchDuringPreview(arrayBuffer));
  // 5. Set arrayBuffer.[[ArrayBufferData]] to null.
  arrayBuffer.ArrayBufferData = Value.null;
  // 6. Set arrayBuffer.[[ArrayBufferByteLength]] to 0.
  arrayBuffer.ArrayBufferByteLength = 0;
  return undefined;
}

/** https://tc39.es/ecma262/#sec-issharedarraybuffer */
export function IsSharedArrayBuffer(_obj: Value) {
  return false;
}

export function* CloneArrayBuffer(srcBuffer: ArrayBufferObject, srcByteOffset: number, srcLength: number): ValueEvaluator<ArrayBufferObject> {
  Assert(!IsDetachedBuffer(srcBuffer));
  const targetBuffer = Q(yield* AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%'), srcLength));
  const srcBlock = srcBuffer.ArrayBufferData as DataBlock;
  const targetBlock = targetBuffer.ArrayBufferData as DataBlock;
  CopyDataBlockBytes(targetBlock, 0, srcBlock, srcByteOffset, srcLength);
  return targetBuffer;
}

/** https://tc39.es/ecma262/#sec-isbigintelementtype */
export function IsBigIntElementType(type: TypedArrayTypes) {
  // 1. If type is BigUint64 or BigInt64, return true.
  if (type === 'BigUint64' || type === 'BigInt64') {
    return Value.true;
  }
  // 2. Return false
  return Value.false;
}

const throwawayBuffer = new ArrayBuffer(8);
const throwawayDataView = new DataView(throwawayBuffer);
const throwawayArray = new Uint8Array(throwawayBuffer);

/** https://tc39.es/ecma262/#sec-rawbytestonumeric */
export function RawBytesToNumeric(type: TypedArrayTypes, rawBytes: number[], isLittleEndian: BooleanValue) {
  // 1. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  Assert(elementSize === rawBytes.length);
  const dataViewType = type === 'Uint8C' ? 'Uint8' : type;
  Object.assign(throwawayArray, rawBytes);
  const result = throwawayDataView[`get${dataViewType}`](0, isLittleEndian === Value.true);
  return IsBigIntElementType(type) === Value.true ? Z(result as bigint) : F(result as number);
}

/** https://tc39.es/ecma262/#sec-getvaluefrombuffer */
export function GetValueFromBuffer(arrayBuffer: ArrayBufferObject, byteIndex: number, type: TypedArrayTypes, _isTypedArray: boolean, _order: 'unordered', isLittleEndian?: BooleanValue) {
  // 1. Assert: IsDetachedBuffer(arrayBuffer) is false.
  Assert(!IsDetachedBuffer(arrayBuffer));
  // 2. Assert: There are sufficient bytes in arrayBuffer starting at byteIndex to represent a value of type.
  // 3. Assert: byteIndex is a non-negative integer.
  Assert(isNonNegativeInteger(byteIndex));
  // 4. Let block be arrayBuffer.[[ArrayBufferData]].
  const block = arrayBuffer.ArrayBufferData as DataBlock;
  // 5. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  // 6. If IsSharedArrayBuffer(arrayBuffer) is true, then
  if (IsSharedArrayBuffer(arrayBuffer)) {
    sharedArrayBufferNotSupported();
  }
  // 7. Else, let rawValue be a List of elementSize containing, in order, the elementSize sequence of bytes starting with block[byteIndex].
  const rawValue = [...block.subarray(byteIndex, byteIndex + elementSize)];
  // 8. If isLittleEndian is not present, set isLittleEndian to the value of the [[LittleEndian]] field of the surrounding agent's Agent Record.
  if (isLittleEndian === undefined) {
    const AR = surroundingAgent.AgentRecord;
    isLittleEndian = AR.LittleEndian;
  }
  // 9. Return RawBytesToNumeric(type, rawValue, isLittleEndian).
  return RawBytesToNumeric(type, rawValue, isLittleEndian);
}

const float32NaNLE = Object.freeze([0, 0, 192, 127]);
const float32NaNBE = Object.freeze([127, 192, 0, 0]);
const float64NaNLE = Object.freeze([0, 0, 0, 0, 0, 0, 248, 127]);
const float64NaNBE = Object.freeze([127, 248, 0, 0, 0, 0, 0, 0]);

/** https://tc39.es/ecma262/#sec-numerictorawbytes */
export function NumericToRawBytes(type: TypedArrayTypes, value: NumberValue | BigIntValue, _isLittleEndian: BooleanValue) {
  Assert(_isLittleEndian instanceof BooleanValue);
  const isLittleEndian = _isLittleEndian === Value.true;
  let rawBytes;
  // One day, we will write our own IEEE 754 and two's complement encoder…
  if (type === 'Float32') {
    if (Number.isNaN(R(value))) {
      rawBytes = isLittleEndian ? [...float32NaNLE] : [...float32NaNBE];
    } else {
      throwawayDataView.setFloat32(0, R(value as NumberValue), isLittleEndian);
      rawBytes = [...throwawayArray.subarray(0, 4)];
    }
  } else if (type === 'Float64') {
    if (Number.isNaN(R(value))) {
      rawBytes = isLittleEndian ? [...float64NaNLE] : [...float64NaNBE];
    } else {
      throwawayDataView.setFloat64(0, R(value as NumberValue), isLittleEndian);
      rawBytes = [...throwawayArray.subarray(0, 8)];
    }
  } else {
    // a. Let n be the Element Size value specified in Table 61 for Element Type type.
    const n = typedArrayInfoByType[type].ElementSize;
    // b. Let convOp be the abstract operation named in the Conversion Operation column in Table 61 for Element Type type.
    const convOp = typedArrayInfoByType[type].ConversionOperation as (argument: Value) => ValueEvaluator<NumberValue | BigIntValue>;
    // c. Let intValue be convOp(value) treated as a mathematical value, whether the result is a BigInt or Number.
    const intValue = X(convOp(value));
    const dataViewType = type === 'Uint8C' ? 'Uint8' : type;
    throwawayDataView[`set${dataViewType}`](0, R(intValue) as bigint & number, isLittleEndian);
    rawBytes = [...throwawayArray.subarray(0, n)];
  }
  return rawBytes;
}

/** https://tc39.es/ecma262/#sec-setvalueinbuffer */
export function* SetValueInBuffer(arrayBuffer: ArrayBufferObject, byteIndex: number, type: TypedArrayTypes, value: BigIntValue | NumberValue, _isTypedArray: boolean, _order: 'seq-cst' | 'unordered' | 'init', isLittleEndian?: BooleanValue): ValueEvaluator<UndefinedValue> {
  // 1. Assert: IsDetachedBuffer(arrayBuffer) is false.
  Assert(!IsDetachedBuffer(arrayBuffer));
  // 2. Assert: There are sufficient bytes in arrayBuffer starting at byteIndex to represent a value of type.
  // 3. Assert: byteIndex is a non-negative integer.
  Assert(isNonNegativeInteger(byteIndex));
  // 4. Assert: Type(value) is BigInt if IsBigIntElementType(type) is true; otherwise, Type(value) is Number.
  if (IsBigIntElementType(type) === Value.true) {
    Assert(value instanceof BigIntValue);
  } else {
    Assert(value instanceof NumberValue);
  }
  // 5. Let block be arrayBuffer.[[ArrayBufferData]].
  const block = arrayBuffer.ArrayBufferData as DataBlock;
  // 6. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  // const elementSize = typedArrayInfoByType[type].ElementSize;
  // 7. If isLittleEndian is not present, set isLittleEndian to the value of the [[LittleEndian]] field of the surrounding agent's Agent Record.
  if (isLittleEndian === undefined) {
    const AR = surroundingAgent.AgentRecord;
    isLittleEndian = AR.LittleEndian;
  }
  // 8. Let rawBytes be NumericToRawBytes(type, value, isLittleEndian).
  const rawBytes = NumericToRawBytes(type, value, isLittleEndian);
  // 9. If IsSharedArrayBuffer(arrayBuffer) is true, then
  if (IsSharedArrayBuffer(arrayBuffer)) {
    sharedArrayBufferNotSupported();
  }
  // 10. Else, store the individual bytes of rawBytes into block, in order, starting at block[byteIndex].
  Q(surroundingAgent.debugger_tryTouchDuringPreview(arrayBuffer));
  rawBytes.forEach((byte, i) => {
    block[byteIndex + i] = byte;
  });
  // 11. Return NormalCompletion(undefined).
  return NormalCompletion(Value.undefined);
}

/** https://tc39.es/ecma262/#sec-arraybufferbytelength */
export function ArrayBufferByteLength(arrayBuffer: ArrayBufferObject, _order: 'seq-cst' | 'unordered'): number {
  if (IsGrowableSharedArrayBuffer(arrayBuffer)) {
    sharedArrayBufferNotSupported();
  }
  Assert(!IsDetachedBuffer(arrayBuffer));
  return arrayBuffer.ArrayBufferByteLength;
}

/** https://tc39.es/ecma262/#sec-isfixedlengtharraybuffer */
export function IsFixedLengthArrayBuffer(arrayBuffer: ArrayBufferObject) {
  return !('ArrayBufferMaxByteLength' in arrayBuffer);
}
