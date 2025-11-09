import { Q } from '../completion.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import { __ts_cast__ } from '../helpers.mts';
import type { DataViewObject } from '../intrinsics/DataView.mts';
import { type TypedArrayTypes, typedArrayInfoByType } from '../intrinsics/TypedArray.mts';
import { Value } from '../value.mts';
import {
  Assert,
  GetValueFromBuffer,
  IsDetachedBuffer,
  IsBigIntElementType,
  SetValueInBuffer,
  ToBoolean,
  ToIndex,
  ToNumber,
  ToBigInt,
  RequireInternalSlot,
  type ArrayBufferObject,
  ArrayBufferByteLength,
  IsFixedLengthArrayBuffer,
} from './all.mts';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-dataview-objects */

/** https://tc39.es/ecma262/#sec-dataview-with-buffer-witness-records */
export interface DataViewWithBufferWitnessRecord {
  readonly Object: DataViewObject;
  CachedBufferByteLength: number | 'detached';
}

/** https://tc39.es/ecma262/#sec-makedataviewwithbufferwitnessrecord */
export function MakeDataViewWithBufferWitnessRecord(obj: DataViewObject, order: 'seq-cst' | 'unordered'): DataViewWithBufferWitnessRecord {
  const buffer = obj.ViewedArrayBuffer as ArrayBufferObject;
  let byteLength: DataViewWithBufferWitnessRecord['CachedBufferByteLength'];
  if (IsDetachedBuffer(buffer)) {
    byteLength = 'detached';
  } else {
    byteLength = ArrayBufferByteLength(buffer, order);
  }
  return { Object: obj, CachedBufferByteLength: byteLength };
}

/** https://tc39.es/ecma262/#sec-getviewbytelength */
export function GetViewByteLength(viewRecord: DataViewWithBufferWitnessRecord): number {
  Assert(!IsViewOutOfBounds(viewRecord));
  const view = viewRecord.Object;
  // @ts-expect-error
  if (view.ByteLength !== 'auto') {
    return view.ByteLength;
  }
  Assert(!IsFixedLengthArrayBuffer(view.ViewedArrayBuffer as ArrayBufferObject));
  const byteOffset = view.ByteOffset;
  const byteLength = viewRecord.CachedBufferByteLength;
  Assert(byteLength !== 'detached');
  return byteLength - byteOffset;
}

/** https://tc39.es/ecma262/#sec-isviewoutofbounds */
export function IsViewOutOfBounds(viewRecord: DataViewWithBufferWitnessRecord): boolean {
  const view = viewRecord.Object;
  const bufferByteLength = viewRecord.CachedBufferByteLength;
  if (IsDetachedBuffer(view.ViewedArrayBuffer as ArrayBufferObject)) {
    Assert(bufferByteLength === 'detached');
    return true;
  }
  Assert(typeof bufferByteLength === 'number' && bufferByteLength >= 0);
  const byteOffsetStart = view.ByteOffset;
  let byteOffsetEnd;
  // @ts-expect-error
  if (view.ByteLength === 'auto') {
    byteOffsetEnd = bufferByteLength;
  } else {
    byteOffsetEnd = byteOffsetStart + view.ByteLength;
  }
  if (byteOffsetStart > bufferByteLength || byteOffsetEnd > bufferByteLength) {
    return true;
  }
  return false;
}

/** https://tc39.es/ecma262/#sec-getviewvalue */
export function* GetViewValue(view: Value, requestIndex: Value, isLittleEndian: Value, type: TypedArrayTypes) {
  // 1. Perform ? RequireInternalSlot(view, [[DataView]]).
  Q(RequireInternalSlot(view, 'DataView'));
  __ts_cast__<DataViewObject>(view);
  // 2. Assert: view has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in view);
  // 3. Let getIndex be ? ToIndex(requestIndex).
  const getIndex = Q(yield* ToIndex(requestIndex));
  // 4. Set isLittleEndian to ToBoolean(isLittleEndian).
  isLittleEndian = ToBoolean(isLittleEndian);
  // 7. Let viewOffset be view.[[ByteOffset]].
  const viewOffset = view.ByteOffset;
  const viewRecord = MakeDataViewWithBufferWitnessRecord(view, 'unordered');
  if (IsViewOutOfBounds(viewRecord)) {
    return surroundingAgent.Throw('TypeError', 'DataViewOOB');
  }
  const viewSize = GetViewByteLength(viewRecord);
  // 9. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  // 10. If getIndex + elementSize > viewSize, throw a RangeError exception.
  if (getIndex + elementSize > viewSize) {
    return surroundingAgent.Throw('RangeError', 'DataViewOOB');
  }
  // 11. Let bufferIndex be getIndex + viewOffset.
  const bufferIndex = getIndex + viewOffset;
  // 12. Return GetValueFromBuffer(buffer, bufferIndex, type, false, Unordered, isLittleEndian).
  return GetValueFromBuffer(view.ViewedArrayBuffer as ArrayBufferObject, bufferIndex, type, false, 'unordered', isLittleEndian);
}

/** https://tc39.es/ecma262/#sec-setviewvalue */
export function* SetViewValue(view: Value, requestIndex: Value, isLittleEndian: Value, type: TypedArrayTypes, value: Value) {
  // 1. Perform ? RequireInternalSlot(view, [[DataView]]).
  Q(RequireInternalSlot(view, 'DataView'));
  // 2. Assert: view has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in view);
  __ts_cast__<DataViewObject>(view);
  // 3. Let getIndex be ? ToIndex(requestIndex).
  const getIndex = Q(yield* ToIndex(requestIndex));
  // 4. If IsBigIntElementType(type) is true, let numberValue be ? ToBigInt(value).
  // 5. Otherwise, let numberValue be ? ToNumber(value).
  let numberValue;
  if (IsBigIntElementType(type) === Value.true) {
    numberValue = Q(yield* ToBigInt(value));
  } else {
    numberValue = Q(yield* ToNumber(value));
  }
  // 6. Set isLittleEndian to ToBoolean(isLittleEndian).
  isLittleEndian = ToBoolean(isLittleEndian);
  // 9. Let viewOffset be view.[[ByteOffset]].
  const viewOffset = view.ByteOffset;
  const viewRecord = MakeDataViewWithBufferWitnessRecord(view, 'unordered');
  if (IsViewOutOfBounds(viewRecord)) {
    return surroundingAgent.Throw('TypeError', 'DataViewOOB');
  }
  const viewSize = GetViewByteLength(viewRecord);
  // 11. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  // 12. If getIndex + elementSize > viewSize, throw a RangeError exception.
  if (getIndex + elementSize > viewSize) {
    return surroundingAgent.Throw('RangeError', 'DataViewOOB');
  }
  // 13. Let bufferIndex be getIndex + viewOffset.
  const bufferIndex = getIndex + viewOffset;
  // 14. Perform ? SetValueInBuffer(buffer, bufferIndex, type, numberValue, false, Unordered, isLittleEndian).
  Q(yield* SetValueInBuffer(view.ViewedArrayBuffer as ArrayBufferObject, bufferIndex, type, numberValue, false, 'unordered', isLittleEndian));
  return Value.undefined;
}
