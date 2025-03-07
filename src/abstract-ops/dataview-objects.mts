// @ts-nocheck
import { Q, X } from '../completion.mts';
import { surroundingAgent } from '../engine.mts';
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
  typedArrayInfoByType,
} from './all.mts';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-dataview-objects */

/** https://tc39.es/ecma262/#sec-getviewvalue */
export function GetViewValue(view, requestIndex, isLittleEndian, type) {
  // 1. Perform ? RequireInternalSlot(view, [[DataView]]).
  Q(RequireInternalSlot(view, 'DataView'));
  // 2. Assert: view has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in view);
  // 3. Let getIndex be ? ToIndex(requestIndex).
  const getIndex = Q(ToIndex(requestIndex));
  // 4. Set isLittleEndian to ! ToBoolean(isLittleEndian).
  isLittleEndian = X(ToBoolean(isLittleEndian));
  // 5. Let buffer be view.[[ViewedArrayBuffer]].
  const buffer = view.ViewedArrayBuffer;
  // 6. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 7. Let viewOffset be view.[[ByteOffset]].
  const viewOffset = view.ByteOffset;
  // 8. Let viewSize be view.[[ByteLength]].
  const viewSize = view.ByteLength;
  // 9. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  // 10. If getIndex + elementSize > viewSize, throw a RangeError exception.
  if (getIndex + elementSize > viewSize) {
    return surroundingAgent.Throw('RangeError', 'DataViewOOB');
  }
  // 11. Let bufferIndex be getIndex + viewOffset.
  const bufferIndex = getIndex + viewOffset;
  // 12. Return GetValueFromBuffer(buffer, bufferIndex, type, false, Unordered, isLittleEndian).
  return GetValueFromBuffer(buffer, bufferIndex, type, Value.false, 'Unordered', isLittleEndian);
}

/** https://tc39.es/ecma262/#sec-setviewvalue */
export function SetViewValue(view, requestIndex, isLittleEndian, type, value) {
  // 1. Perform ? RequireInternalSlot(view, [[DataView]]).
  Q(RequireInternalSlot(view, 'DataView'));
  // 2. Assert: view has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in view);
  // 3. Let getIndex be ? ToIndex(requestIndex).
  const getIndex = Q(ToIndex(requestIndex));
  // 4. If ! IsBigIntElementType(type) is true, let numberValue be ? ToBigInt(value).
  // 5. Otherwise, let numberValue be ? ToNumber(value).
  let numberValue;
  if (X(IsBigIntElementType(type)) === Value.true) {
    numberValue = Q(ToBigInt(value));
  } else {
    numberValue = Q(ToNumber(value));
  }
  // 6. Set isLittleEndian to ! ToBoolean(isLittleEndian).
  isLittleEndian = X(ToBoolean(isLittleEndian));
  // 7. Let buffer be view.[[ViewedArrayBuffer]].
  const buffer = view.ViewedArrayBuffer;
  // 8. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 9. Let viewOffset be view.[[ByteOffset]].
  const viewOffset = view.ByteOffset;
  // 10. Let viewSize be view.[[ByteLength]].
  const viewSize = view.ByteLength;
  // 11. Let elementSize be the Element Size value specified in Table 61 for Element Type type.
  const elementSize = typedArrayInfoByType[type].ElementSize;
  // 12. If getIndex + elementSize > viewSize, throw a RangeError exception.
  if (getIndex + elementSize > viewSize) {
    return surroundingAgent.Throw('RangeError', 'DataViewOOB');
  }
  // 13. Let bufferIndex be getIndex + viewOffset.
  const bufferIndex = getIndex + viewOffset;
  // 14. Return SetValueInBuffer(buffer, bufferIndex, type, numberValue, false, Unordered, isLittleEndian).
  return SetValueInBuffer(buffer, bufferIndex, type, numberValue, Value.false, 'Unordered', isLittleEndian);
}
