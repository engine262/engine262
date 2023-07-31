// @ts-nocheck
import {
  Assert,
  Call,
  CloneArrayBuffer,
  CreateArrayIterator,
  Get,
  GetValueFromBuffer,
  IntegerIndexedElementSet,
  IsCallable,
  IsDetachedBuffer,
  IsSharedArrayBuffer,
  SameValue,
  Set,
  SetValueInBuffer,
  LengthOfArrayLike,
  ToBoolean,
  ToBigInt,
  ToIntegerOrInfinity,
  ToNumber,
  ToObject,
  ToString,
  TypedArraySpeciesCreate,
  ValidateTypedArray,
  RequireInternalSlot,
  typedArrayInfoByName,
  typedArrayInfoByType,
  F, R,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  BigIntValue,
  Descriptor, JSStringValue, NumberValue, ObjectValue, Value, wellKnownSymbols,
} from '../value.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';
import { ArrayProto_sortBody, bootstrapArrayPrototypeShared } from './ArrayPrototypeShared.mjs';

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.buffer */
function TypedArrayProto_buffer(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[TypedArrayName]]).
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  // 3. Assert: O has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in O);
  // 4. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 5. Return buffer.
  return buffer;
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.bytelength */
function TypedArrayProto_byteLength(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[TypedArrayName]]).
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  // 3. Assert: O has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in O);
  // 4. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 5. If IsDetachedBuffer(buffer) is true, return +0𝔽.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return F(+0);
  }
  // 6. Let size be O.[[ByteLength]].
  const size = O.ByteLength;
  // 7. Return size.
  return F(size);
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.byteoffset */
function TypedArrayProto_byteOffset(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[TypedArrayName]]).
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  // 3. Assert: O has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in O);
  // 4. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 5. If IsDetachedBuffer(buffer) is true, return +0𝔽.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return F(+0);
  }
  // 6. Let offset be O.[[ByteOffset]].
  const offset = O.ByteOffset;
  // 7. Return offset.
  return F(offset);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.copywithin */
function TypedArrayProto_copyWithin([target = Value.undefined, start = Value.undefined, end = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Let len be O.[[ArrayLength]].
  const len = O.ArrayLength;
  // 4. Let relativeTarget be ? ToIntegerOrInfinity(target).
  const relativeTarget = Q(ToIntegerOrInfinity(target));
  // 5. If relativeTarget < 0, let to be max((len + relativeTarget), 0); else let to be min(relativeTarget, len).
  let to;
  if (relativeTarget < 0) {
    to = Math.max(len + relativeTarget, 0);
  } else {
    to = Math.min(relativeTarget, len);
  }
  // 6. Let relativeStart be ? ToIntegerOrInfinity(start).
  const relativeStart = Q(ToIntegerOrInfinity(start));
  // 7. If relativeStart < 0, let from be max((len + relativeStart), 0); else let from be min(relativeStart, len).
  let from;
  if (relativeStart < 0) {
    from = Math.max(len + relativeStart, 0);
  } else {
    from = Math.min(relativeStart, len);
  }
  // 8. If end is undefined, let relativeEnd be len; else let relativeEnd be ? ToIntegerOrInfinity(end).
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  // 9. If relativeEnd < 0, let final be max((len + relativeEnd), 0); else let final be min(relativeEnd, len).
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  // 10. Let count be min(final - from, len - to).
  const count = Math.min(final - from, len - to);
  // 11. If count > 0, then
  if (count > 0) {
    // a. NOTE: The copying must be performed in a manner that preserves the bit-level encoding of the source data.
    // b. Let buffer be O.[[ViewedArrayBuffer]].
    const buffer = O.ViewedArrayBuffer;
    // c. If IsDetachedBuffer(buffer) is true, throw a TypeError exception.
    if (IsDetachedBuffer(buffer) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
    }
    // d. Let typedArrayName be the String value of O.[[TypedArrayName]].
    const typedArrayName = O.TypedArrayName.stringValue();
    // e. Let elementSize be the Element Size value specified in Table 61 for typedArrayName.
    const elementSize = typedArrayInfoByName[typedArrayName].ElementSize;
    // f. Let byteOffset be O.[[ByteOffset].
    const byteOffset = O.ByteOffset;
    // g. Let toByteIndex be to × elementSize + byteOffset.
    let toByteIndex = to * elementSize + byteOffset;
    // h. Let fromByteIndex be from × elementSize + byteOffset.
    let fromByteIndex = from * elementSize + byteOffset;
    // i. Let countBytes be count × elementSize.
    let countBytes = count * elementSize;
    // j. If fromByteIndex < toByteIndex and toByteIndex < fromByteIndex + countBytes, then
    let direction;
    if (fromByteIndex < toByteIndex && toByteIndex < fromByteIndex + countBytes) {
      // i. Let direction be -1.
      direction = -1;
      // ii. Set fromByteIndex to fromByteIndex + countBytes - 1.
      fromByteIndex = fromByteIndex + countBytes - 1;
      // iii. Set toByteIndex to toByteIndex + countBytes - 1.
      toByteIndex = toByteIndex + countBytes - 1;
    } else {
      // i. Let direction be 1.
      direction = 1;
    }
    // l. Repeat, while countBytes > 0
    while (countBytes > 0) {
      // i. Let value be GetValueFromBuffer(buffer, fromByteIndex, Uint8, true, Unordered).
      const value = GetValueFromBuffer(buffer, fromByteIndex, 'Uint8', Value.true, 'Unordered');
      // ii. Perform SetValueInBuffer(buffer, toByteIndex, Uint8, value, true, Unordered).
      SetValueInBuffer(buffer, toByteIndex, 'Uint8', value, Value.true, 'Unordered');
      // iii. Set fromByteIndex to fromByteIndex + direction.
      fromByteIndex += direction;
      // iv. Set toByteIndex to toByteIndex + direction.
      toByteIndex += direction;
      // v. Set countBytes to countBytes - 1.
      countBytes -= 1;
    }
  }
  // 12. Return O.
  return O;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.entries */
function TypedArrayProto_entries(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Return CreateArrayIterator(O, key+value).
  return CreateArrayIterator(O, 'key+value');
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.fill */
function TypedArrayProto_fill([value = Value.undefined, start = Value.undefined, end = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Let len be O.[[ArrayLength]]
  const len = O.ArrayLength;
  // 4. If O.[[ContentType]] is BigInt, set value to ? ToBigInt(value).
  // 5. Else, set value to ? ToNumber(value).
  if (O.ContentType === 'BigInt') {
    value = Q(ToBigInt(value));
  } else {
    value = Q(ToNumber(value));
  }
  // 6. Let relativeStart be ? ToIntegerOrInfinity(start).
  const relativeStart = Q(ToIntegerOrInfinity(start));
  // 7. If relativeStart < 0, let k be max((len + relativeStart), 0); else let k be min(relativeStart, len).
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  // 8. If end is undefined, let relativeEnd be len; else let relativeEnd be ? ToIntegerOrInfinity(end).
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  // 9. If relativeEnd < 0, let final be max((len + relativeEnd), 0); else let final be min(relativeEnd, len).
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  // 10. If IsDetachedBuffer(O.[[ViewedArrayBuffer]]) is true, throw a TypeError exception.
  if (IsDetachedBuffer(O.ViewedArrayBuffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 11. Repeat, while k < final
  while (k < final) {
    // a. Let Pk be ! ToString(𝔽(k)).
    const Pk = X(ToString(F(k)));
    // b. Perform ! Set(O, Pk, value, true).
    X(Set(O, Pk, value, Value.true));
    // c. Set k to k + 1.
    k += 1;
  }
  // 12. Return O.
  return O;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.filter */
function TypedArrayProto_filter([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Let len be O.[[ArrayLength]].
  const len = O.ArrayLength;
  // 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  // 5. Let kept be a new empty List.
  const kept = [];
  // 6. Let k be 0.
  let k = 0;
  // 7. Let captured be 0.
  let captured = 0;
  // 8. Repeat, while k < len
  while (k < len) {
    // a. Let Pk be ! ToString(𝔽(k)).
    const Pk = X(ToString(F(k)));
    // b. Let kValue be ? Get(O, Pk).
    const kValue = Q(Get(O, Pk));
    // c. Let selected be ! ToBoolean(? Call(callbackfn, thisArg, « kValue, 𝔽(k), O »)).
    const selected = ToBoolean(Q(Call(callbackfn, thisArg, [kValue, F(k), O])));
    // d. If selected is true, then
    if (selected === Value.true) {
      // i. Append kValue to the end of kept.
      kept.push(kValue);
      // ii. Setp captured to captured + 1.
      captured += 1;
    }
    // e. Set k to k + 1.
    k += 1;
  }
  // 9. Let A be ? TypedArraySpeciesCreate(O, « 𝔽(captured) »).
  const A = Q(TypedArraySpeciesCreate(O, [F(captured)]));
  // 10. Let n be 0.
  let n = 0;
  // 11. For each element e of kept, do
  for (const e of kept) {
    // a. Perform ! Set(A, ! ToString(𝔽(n)), e, true).
    X(Set(A, X(ToString(F(n))), e, Value.true));
    // b. Set n to n + 1.
    n += 1;
  }
  // 12. Return A.
  return A;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.keys */
function TypedArrayProto_keys(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Return CreateArrayIterator(O, key).
  return CreateArrayIterator(O, 'key');
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype.length */
function TypedArrayProto_length(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[TypedArrayName]]).
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  // 3. Assert: O has [[ViewedArrayBuffer]] and [[ArrayLength]] internal slots.
  Assert('ViewedArrayBuffer' in O && 'ArrayLength' in O);
  // 4. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 5. If IsDetachedBuffer(buffer) is true, return +0𝔽.
  if (IsDetachedBuffer(buffer) === Value.true) {
    return F(+0);
  }
  // 6. Let length be O.[[ArrayLength]].
  const length = O.ArrayLength;
  // 8. Return 𝔽(length).
  return F(length);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.map */
function TypedArrayProto_map([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Let len be O.[[ArrayLength]].
  const len = O.ArrayLength;
  // 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  // 5. Let A be ? TypedArraySpeciesCreate(O, « 𝔽(len) »).
  const A = Q(TypedArraySpeciesCreate(O, [F(len)]));
  // 6. Let k be 0.
  let k = 0;
  // 7. Repeat, while k < len
  while (k < len) {
    // a. Let Pk be ! ToString(𝔽(k)).
    const Pk = X(ToString(F(k)));
    // b. Let kValue be ? Get(O, Pk).
    const kValue = Q(Get(O, Pk));
    // c. Let mappedValue be ? Call(callbackfn, thisArg, « kValue, 𝔽(k), O »).
    const mappedValue = Q(Call(callbackfn, thisArg, [kValue, F(k), O]));
    // d. Perform ? Set(A, Pk, mappedValue, true).
    Q(Set(A, Pk, mappedValue, Value.true));
    // e. Set k to k + 1.
    k += 1;
  }
  // 8. Return A.
  return A;
}

/** https://tc39.es/ecma262/#sec-settypedarrayfromtypedarray */
function SetTypedArrayFromTypedArray(target, targetOffset, source) {
  // 1. Let targetBuffer be target.[[ViewedArrayBuffer]].
  const targetBuffer = target.ViewedArrayBuffer;
  // 2. If IsDetachedBuffer(targetBuffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(targetBuffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 3. Let targetLength be target.[[ArrayLength]].
  const targetLength = target.ArrayLength;
  // 4. Let srcBuffer be source.[[ViewedArrayBuffer]].
  let srcBuffer = source.ViewedArrayBuffer;
  // 5. If IsDetachedBuffer(srcBuffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(srcBuffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  const targetName = target.TypedArrayName.stringValue();
  // 6. Let targetType be the Element Type value in Table 61 for targetName.
  const targetType = typedArrayInfoByName[targetName].ElementType;
  // 7. Let targetElementSize be the Element Size value specified in Table 61 for targetName.
  const targetElementSize = typedArrayInfoByName[targetName].ElementSize;
  // 8. Let targetByteOffset be target.[[ByteOffset]].
  const targetByteOffset = target.ByteOffset;
  const srcName = source.TypedArrayName.stringValue();
  // 9. Let srcType be the Element Type value in Table 61 for srcName.
  const srcType = typedArrayInfoByName[srcName].ElementType;
  // 10. Let srcElementSize be the Element Size value specified in Table 61 for srcName.
  const srcElementSize = typedArrayInfoByName[srcName].ElementSize;
  // 11. Let srcLength be source.[[ArrayLength]].
  const srcLength = source.ArrayLength;
  // 12. Let srcByteOffset be source.[[ByteOffset]].
  const srcByteOffset = source.ByteOffset;
  // 13. If targetOffset is +∞, throw a RangeError exception.
  if (targetOffset === +Infinity) {
    return surroundingAgent.Throw('RangeError', 'TypedArrayOOB');
  }
  // 14. If srcLength + targetOffset > targetLength, throw a RangeError exception.
  if (srcLength + targetOffset > targetLength) {
    return surroundingAgent.Throw('RangeError', 'TypedArrayOOB');
  }
  // 15. If target.[[ContentType]] is not equal to source.[[ContentType]], throw a TypeError exception.
  if (target.ContentType !== source.ContentType) {
    return surroundingAgent.Throw('TypeError', 'BufferContentTypeMismatch');
  }
  // 16. If both IsSharedArrayBuffer(srcBuffer) and IsSharedArrayBuffer(targetBuffer) are true, then
  let same;
  if (IsSharedArrayBuffer(srcBuffer) === Value.true && IsSharedArrayBuffer(targetBuffer) === Value.true) {
    Assert(false);
  } else { // 17, Else, let same be SameValue(srcBuffer, targetBuffer).
    same = SameValue(srcBuffer, targetBuffer);
  }
  // 18. If same is true, then
  let srcByteIndex;
  if (same === Value.true) {
    // a. Let srcByteLength be source.[[ByteLength]].
    const srcByteLength = source.ByteLength;
    // b. Set srcBuffer to ? CloneArrayBuffer(srcBuffer, srcByteOffset, srcByteLength, %ArrayBuffer%).
    srcBuffer = Q(CloneArrayBuffer(srcBuffer, srcByteOffset, srcByteLength, surroundingAgent.intrinsic('%ArrayBuffer%')));
    // c. Let srcByteIndex be 0.
    srcByteIndex = 0;
  } else { // 19. Else, let srcByteIndex be srcByteOffset.
    srcByteIndex = srcByteOffset;
  }
  // 20. Let targetByteIndex be targetOffset × targetElementSize + targetByteOffset.
  let targetByteIndex = targetOffset * targetElementSize + targetByteOffset;
  // 21. Let limit be targetByteIndex + targetElementSize × srcLength.
  const limit = targetByteIndex + targetElementSize * srcLength;
  // 22. If srcType is the same as targetType, then
  if (srcType === targetType) {
    // a. NOTE: If srcType and targetType are the same, the transfer must be performed in a manner that preserves the bit-level encoding of the source data.
    // b. Repeat, while targetByteIndex < limit
    while (targetByteIndex < limit) {
      // i. Let value be GetValueFromBuffer(srcBuffer, srcByteIndex, Uint8, true, Unordered).
      const value = GetValueFromBuffer(srcBuffer, srcByteIndex, 'Uint8', Value.true, 'Unordered');
      // ii. Perform SetValueInBuffer(targetBuffer, targetByteIndex, Uint8, value, true, Unordered).
      SetValueInBuffer(targetBuffer, targetByteIndex, 'Uint8', value, Value.true, 'Unordered');
      // iii. Set srcByteIndex to srcByteIndex + 1.
      srcByteIndex += 1;
      // iv. Set targetByteIndex to targetByteIndex + 1.
      targetByteIndex += 1;
    }
  } else { // 23. Else,
    // a. Repeat, while targetByteIndex < limit
    while (targetByteIndex < limit) {
      // i. Let value be GetValueFromBuffer(srcBuffer, srcByteIndex, srcType, true, Unordered).
      const value = GetValueFromBuffer(srcBuffer, srcByteIndex, srcType, Value.true, 'Unordered');
      // ii. Perform SetValueInBuffer(targetBuffer, targetByteIndex, targetType, value, true, Unordered).
      SetValueInBuffer(targetBuffer, targetByteIndex, targetType, value, Value.true, 'Unordered');
      // iii. Set srcByteIndex to srcByteIndex + srcElementSize.
      srcByteIndex += srcElementSize;
      // iv. Set targetByteIndex to targetByteIndex + targetElementSize.
      targetByteIndex += targetElementSize;
    }
  }
  // 24. Return unused.
}

/** https://tc39.es/ecma262/#sec-settypedarrayfromarraylike */
function SetTypedArrayFromArrayLike(target, targetOffset, source) {
  // 1. Let targetBuffer be target.[[ViewedArrayBuffer]].
  const targetBuffer = target.ViewedArrayBuffer;
  // 2. If IsDetachedBuffer(targetBuffer) is true, throw a TypeError exception.
  if (IsDetachedBuffer(targetBuffer) === Value.true) {
    return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
  }
  // 3. Let targetLength be target.[[ArrayLength]].
  const targetLength = target.ArrayLength;
  // 4. Let src be ? ToObject(source).
  const src = Q(ToObject(source));
  // 5. Let srcLength be ? LengthOfArrayLike(src).
  const srcLength = Q(LengthOfArrayLike(src));
  // 6. If targetOffset is +∞, throw a RangeError exception.
  if (targetOffset === +Infinity) {
    return surroundingAgent.Throw('RangeError', 'TypedArrayOOB');
  }
  // 7. If srcLength + targetOffset > targetLength, throw a RangeError exception.
  if (srcLength + targetOffset > targetLength) {
    return surroundingAgent.Throw('RangeError', 'TypedArrayOOB');
  }
  // 8. Let k be 0.
  let k = 0;
  // 9. Repeat, while k < srcLength,
  while (k < srcLength) {
    // a. Let Pk be ! ToString(𝔽(k)).
    const Pk = X(ToString(F(k)));
    // b. Let value be ? Get(src, Pk).
    const value = Q(Get(src, Pk));
    // c. Let targetIndex be 𝔽(targetOffset + k).
    const targetIndex = F(targetOffset + k);
    // d. Perform ? IntegerIndexedElementSet(target, targetIndex, value).
    Q(IntegerIndexedElementSet(target, targetIndex, value));
    // e. Set k to k + 1.
    k += 1;
  }
  // 10. Return unused.
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.set-overloaded-offset */
function TypedArrayProto_set([source = Value.undefined, offset = Value.undefined], { thisValue }) {
  // 1. Let target be the this value.
  const target = thisValue;
  // 2. Perform ? RequireInternalSlot(target, [[TypedArrayName]]).
  Q(RequireInternalSlot(target, 'TypedArrayName'));
  // 3. Assert: target has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in target);
  // 4. Let targetOffset be ? ToIntegerOrInfinity(offset).
  const targetOffset = Q(ToIntegerOrInfinity(offset));
  // 5. If targetOffset < 0, throw a RangeError exception.
  if (targetOffset < 0) {
    return surroundingAgent.Throw('RangeError', 'NegativeIndex', 'Offset');
  }
  // 6. If source is an Object that has a [[TypedArrayName]] internal slot, then
  if (source instanceof ObjectValue && 'TypedArrayName' in source) {
    // a. Perform ? SetTypedArrayFromTypedArray(target, targetOffset, source).
    Q(SetTypedArrayFromTypedArray(target, targetOffset, source));
  } else { // 7. Else,
    // a. Perform ? SetTypedArrayFromArrayLike(target, targetOffset, source).
    Q(SetTypedArrayFromArrayLike(target, targetOffset, source));
  }
  // 8. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.slice */
function TypedArrayProto_slice([start = Value.undefined, end = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Let len be O.[[ArrayLength]].
  const len = O.ArrayLength;
  // 4. Let relativeStart be ? ToIntegerOrInfinity(start).
  const relativeStart = Q(ToIntegerOrInfinity(start));
  // 5. If relativeStart < 0, let k be max((len + relativeStart), 0); else let k be min(relativeStart, len).
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  // 6. If end is undefined, let relativeEnd be len; else let relativeEnd be ? ToIntegerOrInfinity(end).
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  // 7. If relativeEnd < 0, let final be max((len + relativeEnd), 0); else let final be min(relativeEnd, len).
  let final;
  if (relativeEnd < 0) {
    final = Math.max(len + relativeEnd, 0);
  } else {
    final = Math.min(relativeEnd, len);
  }
  // 8. Let count be max(final - k, 0).
  const count = Math.max(final - k, 0);
  // 9. Let A be ? TypedArraySpeciesCreate(O, « 𝔽(count) »).
  const A = Q(TypedArraySpeciesCreate(O, [F(count)]));
  // 10. If count > 0, then
  if (count > 0) {
    // a. If IsDetachedBuffer(O.[[ViewedArrayBuffer]]) is true, throw a TypeError exception.
    if (IsDetachedBuffer(O.ViewedArrayBuffer) === Value.true) {
      return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
    }
    // b. Let srcName be the String value of O.[[TypedArrayName]].
    const srcName = O.TypedArrayName.stringValue();
    // c. Let srcType be the Element Type value in Table 61 for srcName.
    const srcType = typedArrayInfoByName[srcName].ElementType;
    // d. Let targetName be the String value of A.[[TypedArrayName]].
    const targetName = A.TypedArrayName.stringValue();
    // e. Let targetType be the Element Type value in Table 61 for targetName.
    const targetType = typedArrayInfoByName[targetName].ElementType;
    // f. If srcType is different from targetType, then
    if (srcType !== targetType) {
      // i. Let n be 0.
      let n = 0;
      // ii. Repeat, while k < final
      while (k < final) {
        // 1. Let Pk be ! ToString(𝔽(k)).
        const Pk = X(ToString(F(k)));
        // 2. Let kValue be ! Get(O, Pk).
        const kValue = X(Get(O, Pk));
        // 3. Perform ! Set(A, ! ToString(𝔽(n)), kValue, true).
        X(Set(A, X(ToString(F(n))), kValue, Value.true));
        // 4. Set k to k + 1.
        k += 1;
        // 5. Set n to n + 1.
        n += 1;
      }
    } else { // g. Else,
      // i. Let srcBuffer be O.[[ViewedArrayBuffer]].
      const srcBuffer = O.ViewedArrayBuffer;
      // ii. Let targetBuffer be A.[[ViewedArrayBuffer]].
      const targetBuffer = A.ViewedArrayBuffer;
      // iii. Let elementSize be the Element Size value specified in Table 61 for Element Type srcType.
      const elementSize = typedArrayInfoByType[srcType].ElementSize;
      // iv. NOTE: If srcType and targetType are the same, the transfer must be performed in a manner that preserves the bit-level encoding of the source data.
      // v. Let srcByteOffet be O.[[ByteOffset]].
      const srcByteOffset = O.ByteOffset;
      // vi. Let targetByteIndex be A.[[ByteOffset]].
      let targetByteIndex = A.ByteOffset;
      // vii. Let srcByteIndex be (k × elementSize) + srcByteOffet.
      let srcByteIndex = (k * elementSize) + srcByteOffset;
      // viii. Let limit be targetByteIndex + count × elementSize.
      const limit = targetByteIndex + count * elementSize;
      // ix. Repeat, while targetByteIndex < limit
      while (targetByteIndex < limit) {
        // 1. Let value be GetValueFromBuffer(srcBuffer, srcByteIndex, Uint8, true, Unordered).
        const value = GetValueFromBuffer(srcBuffer, srcByteIndex, 'Uint8', Value.true, 'Unordered');
        // 2. Perform SetValueInBuffer(targetBuffer, targetByteIndex, Uint8, value, true, Unordered).
        SetValueInBuffer(targetBuffer, targetByteIndex, 'Uint8', value, Value.true, 'Unordered');
        // 3. Set srcByteIndex to srcByteIndex + 1.
        srcByteIndex += 1;
        // 4. Set targetByteIndex to targetByteIndex + 1.
        targetByteIndex += 1;
      }
    }
  }
  // 16. Return A.
  return A;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.sort */
function TypedArrayProto_sort([comparefn = Value.undefined], { thisValue }) {
  // 1. If comparefn is not undefined and IsCallable(comparefn) is false, throw a TypeError exception.
  if (comparefn !== Value.undefined && IsCallable(comparefn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', comparefn);
  }
  // 2. Let obj be the this value.
  const obj = Q(ToObject(thisValue));
  // 3. Perform ? ValidateTypedArray(obj).
  Q(ValidateTypedArray(obj));
  // 4. Let len be obj.[[ArrayLength]].
  const len = obj.ArrayLength;

  return ArrayProto_sortBody(obj, len, (x, y) => TypedArraySortCompare(x, y, comparefn), true);
}

function TypedArraySortCompare(x, y, comparefn) {
  // 1. Assert: Both Type(x) and Type(y) are Number or both are BigInt.
  Assert((x instanceof NumberValue && y instanceof NumberValue)
         || (x instanceof BigIntValue && y instanceof BigIntValue));
  // 2. If comparefn is not undefined, then
  if (comparefn !== Value.undefined) {
    // a. Let v be ? ToNumber(? Call(comparefn, undefined, « x, y »)).
    const v = Q(ToNumber(Q(Call(comparefn, Value.undefined, [x, y]))));
    // b. If v is NaN, return +0𝔽.
    if (v.isNaN()) {
      return F(+0);
    }
    // c. Return v.
    return v;
  }
  // 3. If x and y are both NaN, return +0𝔽.
  if (x.isNaN() && y.isNaN()) {
    return F(+0);
  }
  // 4. If x is NaN, return 1𝔽.
  if (x.isNaN()) {
    return F(1);
  }
  // 5. If y is NaN, return -1𝔽.
  if (y.isNaN()) {
    return F(-1);
  }
  x = x.numberValue ? R(x) : R(x);
  y = y.numberValue ? R(y) : R(y);
  // 6. If x < y, return -1𝔽.
  if (x < y) {
    return F(-1);
  }
  // 7. If x > y, return 1𝔽.
  if (x > y) {
    return F(1);
  }
  // 8. If x is -0𝔽 and y is +0𝔽, return -1𝔽.
  if (Object.is(x, -0) && Object.is(y, +0)) {
    return F(-1);
  }
  // 9. If x is +0𝔽 and y is -0𝔽, return 1𝔽.
  if (Object.is(x, +0) && Object.is(y, -0)) {
    return F(1);
  }
  // 10. Return +0𝔽.
  return F(+0);
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.subarray */
function TypedArrayProto_subarray([begin = Value.undefined, end = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? RequireInternalSlot(O, [[TypedArrayName]]).
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  // 3. Assert: O has a [[ViewedArrayBuffer]] internal slot.
  Assert('ViewedArrayBuffer' in O);
  // 4. Let buffer be O.[[ViewedArrayBuffer]].
  const buffer = O.ViewedArrayBuffer;
  // 5. Let srcLength be O.[[ArrayLength]].
  const srcLength = O.ArrayLength;
  // 6. Let relativeBegin be ? ToIntegerOrInfinity(begin).
  const relativeBegin = Q(ToIntegerOrInfinity(begin));
  // 7. If relativeBegin < 0, let beginIndex be max((srcLength + relativeBegin), 0); else let beginIndex be min(relativeBegin, srcLength).
  let beginIndex;
  if (relativeBegin < 0) {
    beginIndex = Math.max(srcLength + relativeBegin, 0);
  } else {
    beginIndex = Math.min(relativeBegin, srcLength);
  }
  // 8. If end is undefined, let relativeEnd be srcLength; else let relativeEnd be ? ToIntegerOrInfinity(end).
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = srcLength;
  } else {
    relativeEnd = Q(ToIntegerOrInfinity(end));
  }
  // 9. If relativeEnd < 0, let endIndex be max((srcLength + relativeEnd), 0); else let endIndex be min(relativeEnd, srcLength).
  let endIndex;
  if (relativeEnd < 0) {
    endIndex = Math.max(srcLength + relativeEnd, 0);
  } else {
    endIndex = Math.min(relativeEnd, srcLength);
  }
  // 10. Let newLength be max(endIndex - beginIndex, 0).
  const newLength = Math.max(endIndex - beginIndex, 0);
  // 11. Let constructorName be the String value of O.[[TypedArrayName]].
  const constructorName = O.TypedArrayName.stringValue();
  // 12. Let elementSize be the Element Size value specified in Table 61 for constructorName.
  const elementSize = typedArrayInfoByName[constructorName].ElementSize;
  // 13. Let srcByteOffset be O.[[ByteOffset]].
  const srcByteOffset = O.ByteOffset;
  // 14. Let beginByteOffset be srcByteOffset + beginIndex × elementSize.
  const beginByteOffset = srcByteOffset + beginIndex * elementSize;
  // 15. Let argumentsList be « buffer, 𝔽(beginByteOffset), 𝔽(newLength) ».
  const argumentsList = [buffer, F(beginByteOffset), F(newLength)];
  // 16. Return ? TypedArraySpeciesCreate(O, argumentsList).
  return Q(TypedArraySpeciesCreate(O, argumentsList));
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.values */
function TypedArrayProto_values(args, { thisValue }) {
  // 1. Let o be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // Return CreateArrayIterator(O, value).
  return CreateArrayIterator(O, 'value');
}

/** https://tc39.es/ecma262/#sec-get-%typedarray%.prototype-@@tostringtag */
function TypedArrayProto_toStringTag(args, { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If Type(O) is not Object, return undefined.
  if (!(O instanceof ObjectValue)) {
    return Value.undefined;
  }
  // 3. If O does not have a [[TypedArrayName]] internal slot, return undefined.
  if (!('TypedArrayName' in O)) {
    return Value.undefined;
  }
  // 4. Let name be O.[[TypedArrayName]].
  const name = O.TypedArrayName;
  // 5. Assert: Type(name) is String.
  Assert(name instanceof JSStringValue);
  // 6. Return name.
  return name;
}

/** https://tc39.es/ecma262/#sec-%typedarray%.prototype.at */
function TypedArrayProto_at([index = Value.undefined], { thisValue }) {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. Perform ? ValidateTypedArray(O).
  Q(ValidateTypedArray(O));
  // 3. Let len be O.[[ArrayLength]].
  const len = O.ArrayLength;
  // 4. Let relativeIndex be ? ToIntegerOrInfinity(index).
  const relativeIndex = Q(ToIntegerOrInfinity(index));
  let k;
  // 5. If relativeIndex ≥ 0, then
  if (relativeIndex >= 0) {
    // a. Let k be relativeIndex.
    k = relativeIndex;
  } else { // 6. Else,
    // a. Let k be len + relativeIndex.
    k = len + relativeIndex;
  }
  // 7. If k < 0 or k ≥ len, then return undefined.
  if (k < 0 || k >= len) {
    return Value.undefined;
  }
  // 8. Return ? Get(O, ! ToString(𝔽(k))).
  return Q(Get(O, X(ToString(F(k)))));
}

export function bootstrapTypedArrayPrototype(realmRec) {
  const ArrayProto_toString = X(Get(realmRec.Intrinsics['%Array.prototype%'], Value('toString')));
  Assert(ArrayProto_toString instanceof ObjectValue);

  const proto = bootstrapPrototype(realmRec, [
    ['buffer', [TypedArrayProto_buffer]],
    ['byteLength', [TypedArrayProto_byteLength]],
    ['byteOffset', [TypedArrayProto_byteOffset]],
    ['copyWithin', TypedArrayProto_copyWithin, 2],
    ['entries', TypedArrayProto_entries, 0],
    ['fill', TypedArrayProto_fill, 1],
    ['filter', TypedArrayProto_filter, 1],
    ['at', TypedArrayProto_at, 1],
    ['keys', TypedArrayProto_keys, 0],
    ['length', [TypedArrayProto_length]],
    ['map', TypedArrayProto_map, 1],
    ['set', TypedArrayProto_set, 1],
    ['slice', TypedArrayProto_slice, 2],
    ['sort', TypedArrayProto_sort, 1],
    ['subarray', TypedArrayProto_subarray, 2],
    ['values', TypedArrayProto_values, 0],
    ['toString', ArrayProto_toString],
    [wellKnownSymbols.toStringTag, [TypedArrayProto_toStringTag]],
  ], realmRec.Intrinsics['%Object.prototype%']);

  bootstrapArrayPrototypeShared(
    realmRec,
    proto,
    (thisValue) => {
      Q(ValidateTypedArray(thisValue));
    },
    (O) => O.ArrayLength,
  );

  /** https://tc39.es/ecma262/#sec-%typedarray%.prototype-@@iterator */
  {
    const fn = X(Get(proto, Value('values')));
    X(proto.DefineOwnProperty(wellKnownSymbols.iterator, Descriptor({
      Value: fn,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  realmRec.Intrinsics['%TypedArray.prototype%'] = proto;
}
