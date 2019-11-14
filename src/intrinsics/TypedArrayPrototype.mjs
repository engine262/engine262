import {
  Assert,
  Call,
  CloneArrayBuffer,
  CreateArrayIterator,
  Get,
  GetValueFromBuffer,
  IsCallable,
  IsDetachedBuffer,
  SameValue,
  Set,
  SetValueInBuffer,
  LengthOfArrayLike,
  ToBoolean,
  ToInteger,
  ToNumber,
  ToObject,
  ToString,
  TypedArraySpeciesCreate,
  ValidateTypedArray,
  typedArrayInfo,
  RequireInternalSlot,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  Descriptor, Type, Value, wellKnownSymbols,
} from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { ArrayProto_sortBody, CreateArrayPrototypeShared } from './ArrayPrototypeShared.mjs';

// 22.2.3.1 #sec-get-%typedarray%.prototype.buffer
function TypedArrayProto_bufferGetter(args, { thisValue }) {
  const O = thisValue;
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  return buffer;
}

// 22.2.3.2 #sec-get-%typedarray%.prototype.bytelength
function TypedArrayProto_byteLengthGetter(args, { thisValue }) {
  const O = thisValue;
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return new Value(0);
  }
  const size = O.ByteLength;
  return size;
}

// 22.2.3.3 #sec-get-%typedarray%.prototype.byteoffset
function TypedArrayProto_byteOffsetGetter(args, { thisValue }) {
  const O = thisValue;
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return new Value(0);
  }
  const offset = O.ByteOffset;
  return offset;
}

// 22.2.3.5 #sec-%typedarray%.prototype.copywithin
function TypedArrayProto_copyWithin([target = Value.undefined, start = Value.undefined, end], { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  const len = O.ArrayLength.numberValue();

  const relativeTarget = Q(ToInteger(target)).numberValue();
  let to;
  if (relativeTarget < 0) {
    to = Math.max(len + relativeTarget, 0);
  } else {
    to = Math.min(relativeTarget, len);
  }

  const relativeStart = Q(ToInteger(start)).numberValue();
  let from;
  if (relativeStart < 0) {
    from = Math.max(len + relativeStart, 0);
  } else {
    from = Math.min(relativeStart, len);
  }

  let relativeEnd;
  if (end === undefined || end === Value.undefined) {
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

  const count = Math.min(final - from, len - to);
  if (count > 0) {
    // NOTE: The copying must be performed in a manner that preserves the
    // bit-level encoding of the source data.
    const buffer = O.ViewedArrayBuffer;
    if (IsDetachedBuffer(buffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    const typedArrayName = O.TypedArrayName.stringValue();
    const elementSize = typedArrayInfo.get(typedArrayName).ElementSize;
    const byteOffset = O.ByteOffset.numberValue();
    let toByteIndex = to * elementSize + byteOffset;
    let fromByteIndex = from * elementSize + byteOffset;
    let countBytes = count * elementSize;
    let direction;
    if (fromByteIndex < toByteIndex && toByteIndex < fromByteIndex + countBytes) {
      direction = -1;
      fromByteIndex = fromByteIndex + countBytes - 1;
      toByteIndex = toByteIndex + countBytes - 1;
    } else {
      direction = 1;
    }
    while (countBytes > 0) {
      const value = GetValueFromBuffer(buffer, new Value(fromByteIndex), 'Uint8', true, 'Unordered');
      SetValueInBuffer(buffer, new Value(toByteIndex), 'Uint8', value, true, 'Unordered');
      fromByteIndex += direction;
      toByteIndex += direction;
      countBytes -= 1;
    }
  }
  return O;
}

// 22.2.3.6 #sec-%typedarray%.prototype.entries
function TypedArrayProto_entries(args, { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  return CreateArrayIterator(O, 'key+value');
}

// 22.2.3.8 #sec-%typedarray%.prototype.fill
function TypedArrayProto_fill([value = Value.undefined, start = Value.undefined, end = Value.undefined], { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  const len = O.ArrayLength.numberValue();
  value = Q(ToNumber(value));
  const relativeStart = Q(ToInteger(start)).numberValue();
  let k = relativeStart < 0 ? Math.max(len + relativeStart, 0) : Math.min(relativeStart, len);
  let relativeEnd;
  if (end === Value.undefined) {
    relativeEnd = len;
  } else {
    relativeEnd = Q(ToInteger(end)).numberValue();
  }
  const final = relativeEnd < 0 ? Math.max(len + relativeEnd, 0) : Math.min(relativeEnd, len);
  if (IsDetachedBuffer(O.ViewedArrayBuffer)) {
    return surroundingAgent.Throw('TypeError', 'BufferDetached');
  }
  while (k < final) {
    const Pk = X(ToString(new Value(k)));
    X(Set(O, Pk, value, Value.true));
    k += 1;
  }
  return O;
}

// 22.2.3.9 #sec-%typedarray%.prototype.filter
function TypedArrayProto_filter([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  const len = O.ArrayLength.numberValue();
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  const kept = [];
  let k = 0;
  let captured = 0;
  while (k < len) {
    const Pk = X(ToString(new Value(k)));
    const kValue = Q(Get(O, Pk));
    const selected = ToBoolean(Q(Call(callbackfn, thisArg, [kValue, new Value(k), O])));
    if (selected === Value.true) {
      kept.push(kValue);
      captured += 1;
    }
    k += 1;
  }
  const A = Q(TypedArraySpeciesCreate(O, [new Value(captured)]));
  let n = 0;
  for (const e of kept) {
    const nStr = X(ToString(new Value(n)));
    X(Set(A, nStr, e, Value.true));
    n += 1;
  }
  return A;
}

// 22.2.3.16 #sec-%typedarray%.prototype.keys
function TypedArrayProto_keys(args, { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  return CreateArrayIterator(O, 'key');
}

// 22.2.3.18 #sec-get-%typedarray%.prototype.length
function TypedArrayProto_lengthGetter(args, { thisValue }) {
  const O = thisValue;
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O && 'ArrayLength' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return new Value(0);
  }
  const length = O.ArrayLength;
  return length;
}

// 22.2.3.19 #sec-%typedarray%.prototype.map
function TypedArrayProto_map([callbackfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  const len = O.ArrayLength;
  if (IsCallable(callbackfn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', callbackfn);
  }
  const A = Q(TypedArraySpeciesCreate(O, [len]));
  let k = 0;
  while (k < len.numberValue()) {
    const Pk = X(ToString(new Value(k)));
    const kValue = Q(Get(O, Pk));
    const mappedValue = Q(Call(callbackfn, thisArg, [kValue, new Value(k), O]));
    Q(Set(A, Pk, mappedValue, Value.true));
    k += 1;
  }
  return A;
}

// 22.2.3.23 #sec-%typedarray%.prototype.set-overloaded-offset
function TypedArrayProto_set([overloaded = Value.undefined, offset = Value.undefined], { thisValue }) {
  if (Type(overloaded) !== 'Object' || !('TypedArrayName' in overloaded)) {
    // 22.2.3.23.1 #sec-%typedarray%.prototype.set-array-offset
    const array = overloaded;
    const target = thisValue;
    Q(RequireInternalSlot(target, 'TypedArrayName'));
    Assert('ViewedArrayBuffer' in target);
    const targetOffset = Q(ToInteger(offset)).numberValue();
    if (targetOffset < 0) {
      return surroundingAgent.Throw('RangeError', 'NegativeIndex', 'Offset');
    }
    const targetBuffer = target.ViewedArrayBuffer;
    if (IsDetachedBuffer(targetBuffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    const targetLength = target.ArrayLength.numberValue();
    const targetName = target.TypedArrayName.stringValue();
    const targetInfo = typedArrayInfo.get(targetName);
    const targetElementSize = targetInfo.ElementSize;
    const targetType = targetInfo.ElementType;
    const targetByteOffset = target.ByteOffset.numberValue();
    const src = Q(ToObject(array));
    const srcLength = Q(LengthOfArrayLike(src)).numberValue();
    if (srcLength + targetOffset > targetLength) {
      return surroundingAgent.Throw('RangeError', 'TypedArrayOOB');
    }
    let targetByteIndex = targetOffset * targetElementSize + targetByteOffset;
    let k = 0;
    const limit = targetByteIndex + targetElementSize * srcLength;
    while (targetByteIndex < limit) {
      const Pk = X(ToString(new Value(k)));
      const kProp = Q(Get(src, Pk));
      const kNumber = Q(ToNumber(kProp));
      if (IsDetachedBuffer(targetBuffer)) {
        return surroundingAgent.Throw('TypeError', 'BufferDetached');
      }
      SetValueInBuffer(targetBuffer, new Value(targetByteIndex), targetType, kNumber, true, 'Unordered');
      k += 1;
      targetByteIndex += targetElementSize;
    }
    return Value.undefined;
  } else {
    // 22.2.3.23.2 #sec-%typedarray%.prototype.set-typedarray-offset
    const typedArray = overloaded;
    Assert(Type(typedArray) === 'Object' && 'TypedArrayName' in typedArray);
    const target = thisValue;
    Q(RequireInternalSlot(target, 'TypedArrayName'));
    Assert('ViewedArrayBuffer' in target);
    const targetOffset = Q(ToInteger(offset)).numberValue();
    if (targetOffset < 0) {
      return surroundingAgent.Throw('RangeError', 'NegativeIndex', 'Offset');
    }
    const targetBuffer = target.ViewedArrayBuffer;
    if (IsDetachedBuffer(targetBuffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    const targetLength = target.ArrayLength.numberValue();
    let srcBuffer = typedArray.ViewedArrayBuffer;
    if (IsDetachedBuffer(srcBuffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    const targetName = target.TypedArrayName.stringValue();
    const targetInfo = typedArrayInfo.get(targetName);
    const targetType = targetInfo.ElementType;
    const targetElementSize = targetInfo.ElementSize;
    const targetByteOffset = target.ByteOffset.numberValue();
    const srcName = typedArray.TypedArrayName.stringValue();
    const srcInfo = typedArrayInfo.get(srcName);
    const srcType = srcInfo.ElementType;
    const srcElementSize = srcInfo.ElementSize;
    const srcLength = typedArray.ArrayLength.numberValue();
    const srcByteOffset = typedArray.ByteOffset;
    if (srcLength + targetOffset > targetLength) {
      return surroundingAgent.Throw('RangeError', 'TypedArrayOOB');
    }
    // let same;
    // if (IsSharedArrayBuffer(srcBuffer) && IsSharedArrayBuffer(targetBuffer)) {
    //   same = ...
    // } else {
    const same = SameValue(srcBuffer, targetBuffer);
    // }
    let srcByteIndex;
    if (same === Value.true) {
      const srcByteLength = typedArray.ByteLength;
      srcBuffer = Q(CloneArrayBuffer(srcBuffer, srcByteOffset, srcByteLength, surroundingAgent.intrinsic('%ArrayBuffer%')));
      srcByteIndex = new Value(0);
    } else {
      srcByteIndex = srcByteOffset;
    }
    let targetByteIndex = targetOffset * targetElementSize + targetByteOffset;
    const limit = targetByteIndex + targetElementSize * srcLength;
    if (SameValue(new Value(srcType), new Value(targetType)) === Value.true) {
      while (targetByteIndex < limit) {
        const value = GetValueFromBuffer(srcBuffer, srcByteIndex, 'Uint8', true, 'Unordered');
        SetValueInBuffer(targetBuffer, new Value(targetByteIndex), 'Uint8', value, true, 'Unordered');
        srcByteIndex = new Value(srcByteIndex.numberValue() + 1);
        targetByteIndex += 1;
      }
    } else {
      while (targetByteIndex < limit) {
        const value = GetValueFromBuffer(srcBuffer, srcByteIndex, srcType, true, 'Unordered');
        SetValueInBuffer(targetBuffer, new Value(targetByteIndex), targetType, value, true, 'Unordered');
        srcByteIndex = new Value(srcByteIndex.numberValue() + srcElementSize);
        targetByteIndex += targetElementSize;
      }
    }
    return Value.undefined;
  }
}

// 22.2.3.24 #sec-%typedarray%.prototype.slice
function TypedArrayProto_slice([start = Value.undefined, end = Value.undefined], { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  const len = O.ArrayLength.numberValue();
  const relativeStart = Q(ToInteger(start)).numberValue();
  let k;
  if (relativeStart < 0) {
    k = Math.max(len + relativeStart, 0);
  } else {
    k = Math.min(relativeStart, len);
  }
  let relativeEnd;
  if (end === Value.undefined) {
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
  const count = Math.max(final - k, 0);

  const A = Q(TypedArraySpeciesCreate(O, [new Value(count)]));
  const srcName = O.TypedArrayName.stringValue();
  const srcInfo = typedArrayInfo.get(srcName);
  const srcType = srcInfo.ElementType;
  const targetName = A.TypedArrayName.stringValue();
  const targetType = typedArrayInfo.get(targetName).ElementType;
  if (srcType !== targetType) {
    let n = 0;
    while (k < final) {
      const Pk = X(ToString(new Value(k)));
      const kValue = Q(Get(O, Pk));
      const nStr = X(ToString(new Value(n)));
      X(Set(A, nStr, kValue, Value.true));
      k += 1;
      n += 1;
    }
  } else if (count > 0) {
    const srcBuffer = O.ViewedArrayBuffer;
    if (IsDetachedBuffer(srcBuffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    const targetBuffer = A.ViewedArrayBuffer;
    const elementSize = srcInfo.ElementSize;
    const srcByteOffset = O.ByteOffset.numberValue();
    let targetByteIndex = A.ByteOffset.numberValue();
    let srcByteIndex = k * elementSize + srcByteOffset;
    const limit = targetByteIndex + count * elementSize;
    while (targetByteIndex < limit) {
      const value = GetValueFromBuffer(srcBuffer, new Value(srcByteIndex), 'Uint8', true, 'Unordered');
      SetValueInBuffer(targetBuffer, new Value(targetByteIndex), 'Uint8', value, true, 'Unordered');
      srcByteIndex += 1;
      targetByteIndex += 1;
    }
  }
  return A;
}

// 22.2.3.26 #sec-%typedarray%.prototype.sort
function TypedArrayProto_sort([comparefn = Value.undefined], { thisValue }) {
  if (comparefn !== Value.undefined && IsCallable(comparefn) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', comparefn);
  }
  const obj = Q(ToObject(thisValue));
  const buffer = Q(ValidateTypedArray(obj));
  const len = obj.ArrayLength;

  return ArrayProto_sortBody(obj, len, (x, y) => TypedArraySortCompare(x, y, comparefn, buffer), true);
}

function TypedArraySortCompare(x, y, comparefn, buffer) {
  Assert(Type(x) === 'Number');
  Assert(Type(y) === 'Number');
  if (comparefn !== Value.undefined) {
    const callRes = Q(Call(comparefn, Value.undefined, [x, y]));
    const v = Q(ToNumber(callRes));
    if (IsDetachedBuffer(buffer)) {
      return surroundingAgent.Throw('TypeError', 'BufferDetached');
    }
    if (v.isNaN()) {
      return new Value(+0);
    }
    return v;
  }
  if (x.isNaN() && y.isNaN()) {
    return new Value(+0);
  }
  if (x.isNaN()) {
    return new Value(1);
  }
  if (y.isNaN()) {
    return new Value(-1);
  }

  x = x.numberValue();
  y = y.numberValue();
  if (x < y) {
    return new Value(-1);
  }
  if (x > y) {
    return new Value(1);
  }
  if (Object.is(x, -0) && Object.is(y, +0)) {
    return new Value(-1);
  }
  if (Object.is(x, +0) && Object.is(y, -0)) {
    return new Value(1);
  }
  return new Value(+0);
}

// 22.2.3.27 #sec-%typedarray%.prototype.subarray
function TypedArrayProto_subarray([begin = Value.undefined, end], { thisValue }) {
  const O = thisValue;
  Q(RequireInternalSlot(O, 'TypedArrayName'));
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  const srcLength = O.ArrayLength.numberValue();
  const relativeBegin = Q(ToInteger(begin)).numberValue();
  let beginIndex;
  if (relativeBegin < 0) {
    beginIndex = Math.max(srcLength + relativeBegin, 0);
  } else {
    beginIndex = Math.min(relativeBegin, srcLength);
  }
  let relativeEnd;
  if (end === undefined || end === Value.undefined) {
    relativeEnd = srcLength;
  } else {
    relativeEnd = Q(ToInteger(end)).numberValue();
  }
  let endIndex;
  if (relativeEnd < 0) {
    endIndex = Math.max(srcLength + relativeEnd, 0);
  } else {
    endIndex = Math.min(relativeEnd, srcLength);
  }

  const newLength = Math.max(endIndex - beginIndex, 0);
  const constructorName = O.TypedArrayName.stringValue();
  const elementSize = typedArrayInfo.get(constructorName).ElementSize;
  const srcByteOffset = O.ByteOffset.numberValue();
  const beginByteOffset = srcByteOffset + beginIndex * elementSize;
  const argumentsList = [buffer, new Value(beginByteOffset), new Value(newLength)];
  return Q(TypedArraySpeciesCreate(O, argumentsList));
}

// 22.2.3.30 #sec-%typedarray%.prototype.values
function TypedArrayProto_values(args, { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  return CreateArrayIterator(O, 'value');
}

// 22.2.3.32 #sec-get-%typedarray%.prototype-@@tostringtag
function TypedArrayProto_toStringTagGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('TypedArrayName' in O)) {
    return Value.undefined;
  }
  const name = O.TypedArrayName;
  Assert(Type(name) === 'String');
  return name;
}

export function CreateTypedArrayPrototype(realmRec) {
  const ArrayProto_toString = X(Get(realmRec.Intrinsics['%Array.prototype%'], new Value('toString')));
  Assert(Type(ArrayProto_toString) === 'Object');

  const proto = BootstrapPrototype(realmRec, [
    ['buffer', [TypedArrayProto_bufferGetter]],
    ['byteLength', [TypedArrayProto_byteLengthGetter]],
    ['byteOffset', [TypedArrayProto_byteOffsetGetter]],
    ['copyWithin', TypedArrayProto_copyWithin, 2],
    ['entries', TypedArrayProto_entries, 0],
    ['fill', TypedArrayProto_fill, 1],
    ['filter', TypedArrayProto_filter, 1],
    ['keys', TypedArrayProto_keys, 0],
    ['length', [TypedArrayProto_lengthGetter]],
    ['map', TypedArrayProto_map, 1],
    ['set', TypedArrayProto_set, 1],
    ['slice', TypedArrayProto_slice, 2],
    ['sort', TypedArrayProto_sort, 1],
    ['subarray', TypedArrayProto_subarray, 2],
    ['values', TypedArrayProto_values, 0],
    ['toString', ArrayProto_toString],
    [wellKnownSymbols.toStringTag, [TypedArrayProto_toStringTagGetter]],
  ], realmRec.Intrinsics['%Object.prototype%']);

  CreateArrayPrototypeShared(
    realmRec,
    proto,
    (thisValue) => {
      Q(ValidateTypedArray(thisValue));
    },
    (O) => O.ArrayLength,
  );

  // 22.2.3.31 #sec-%typedarray%.prototype-@@iterator
  {
    const fn = X(Get(proto, new Value('values')));
    X(proto.DefineOwnProperty(wellKnownSymbols.iterator, Descriptor({
      Value: fn,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    })));
  }

  realmRec.Intrinsics['%TypedArray.prototype%'] = proto;
}
