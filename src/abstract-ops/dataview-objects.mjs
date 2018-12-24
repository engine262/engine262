import {
  Assert,
  GetValueFromBuffer,
  IsDetachedBuffer,
  SetValueInBuffer,
  ToBoolean,
  ToIndex,
  ToNumber,
  numericTypeInfo,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { msg } from '../helpers.mjs';
import { Type, Value } from '../value.mjs';

// This file covers abstract operations defined in
// 24.3 #sec-dataview-objects

// 24.3.1.1 #sec-getviewvalue
export function GetViewValue(view, requestIndex, isLittleEndian, type) {
  if (Type(view) !== 'Object' || !('DataView' in view)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'DataView', view));
  }
  Assert('ViewedArrayBuffer' in view);
  const getIndex = Q(ToIndex(requestIndex)).numberValue();
  isLittleEndian = X(ToBoolean(isLittleEndian));
  const buffer = view.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  const viewOffset = view.ByteOffset.numberValue();
  const viewSize = view.ByteLength.numberValue();
  const elementSize = numericTypeInfo.get(type).ElementSize;
  if (getIndex + elementSize > viewSize) {
    return surroundingAgent.Throw('RangeError', msg('DataViewOOB'));
  }
  const bufferIndex = new Value(getIndex + viewOffset);
  return GetValueFromBuffer(buffer, bufferIndex, type, false, 'Unordered', isLittleEndian);
}

// 24.3.1.2 #sec-setviewvalue
export function SetViewValue(view, requestIndex, isLittleEndian, type, value) {
  if (Type(view) !== 'Object' || !('DataView' in view)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'DataView', view));
  }
  Assert('ViewedArrayBuffer' in view);
  const getIndex = Q(ToIndex(requestIndex)).numberValue();
  const numberValue = Q(ToNumber(value));
  isLittleEndian = X(ToBoolean(isLittleEndian));
  const buffer = view.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  const viewOffset = view.ByteOffset.numberValue();
  const viewSize = view.ByteLength.numberValue();
  const elementSize = numericTypeInfo.get(type).ElementSize;
  if (getIndex + elementSize > viewSize) {
    return surroundingAgent.Throw('RangeError', msg('DataViewOOB'));
  }
  const bufferIndex = new Value(getIndex + viewOffset);
  return SetValueInBuffer(buffer, bufferIndex, type, numberValue, false, 'Unordered', isLittleEndian);
}
