import {
  Assert,
  CreateArrayIterator,
  Get,
  GetValueFromBuffer,
  IsDetachedBuffer,
  Set,
  SetValueInBuffer,
  ToInteger,
  ToNumber,
  ToString,
  TypedArraySpeciesCreate,
  ValidateTypedArray,
  typedArrayInfo,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { msg } from '../helpers.mjs';
import {
  Descriptor, Type, Value, wellKnownSymbols,
} from '../value.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';
import { CreateArrayPrototypeShared } from './ArrayPrototypeShared.mjs';

// 22.2.3.1 #sec-get-%typedarray%.prototype.buffer
function TypedArrayProto_bufferGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('TypedArrayName' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'TypedArray', O));
  }
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  return buffer;
}

// 22.2.3.2 #sec-get-%typedarray%.prototype.bytelength
function TypedArrayProto_byteLengthGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('TypedArrayName' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'TypedArray', O));
  }
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
  if (Type(O) !== 'Object' || !('TypedArrayName' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'TypedArray', O));
  }
  Assert('ViewedArrayBuffer' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return new Value(0);
  }
  const offset = O.ByteOffset;
  return offset;
}

// 22.2.3.5 #sec-%typedarray%.prototype.copywithin
function TypedArrayProto_copyWithin([target, start, end], { thisValue }) {
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
      return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
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
function TypedArrayProto_fill([value, start = Value.undefined, end = Value.undefined], { thisValue }) {
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
    return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
  }
  while (k < final) {
    const Pk = X(ToString(new Value(k)));
    X(Set(O, Pk, value, Value.true));
    k += 1;
  }
  return O;
}

// 22.2.3.9 #sec-%typedarray%.prototype.filter
// function TypedArrayProto_filter([callbackfn, thisArg], { thisValue }) {
//   const O = thisValue;
// }

// 22.2.3.13 #sec-%typedarray%.prototype.includes
// 22.2.3.14 #sec-%typedarray%.prototype.indexof
// 22.2.3.15 #sec-%typedarray%.prototype.join
// 22.2.3.17 #sec-%typedarray%.prototype.lastindexof
// 22.2.3.20 #sec-%typedarray%.prototype.reduce
// 22.2.3.21 #sec-%typedarray%.prototype.reduceright
// 22.2.3.22 #sec-%typedarray%.prototype.reverse
// 22.2.3.25 #sec-%typedarray%.prototype.some
// 22.2.3.26 #sec-%typedarray%.prototype.sort
// 22.2.3.28 #sec-%typedarray%.prototype.tolocalestring
// Defined in terms of Array.prototype versions.

// 22.2.3.16 #sec-%typedarray%.prototype.keys
function TypedArrayProto_keys(args, { thisValue }) {
  const O = thisValue;
  Q(ValidateTypedArray(O));
  return CreateArrayIterator(O, 'key');
}

// 22.2.3.18 #sec-get-%typedarray%.prototype.length
function TypedArrayProto_lengthGetter(args, { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('TypedArrayName' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'TypedArray', O));
  }
  Assert('ViewedArrayBuffer' in O && 'ArrayLength' in O);
  const buffer = O.ViewedArrayBuffer;
  if (IsDetachedBuffer(buffer)) {
    return new Value(0);
  }
  const length = O.ArrayLength;
  return length;
}

// 22.2.3.27 #sec-%typedarray%.prototype.subarray
function TypedArrayProto_subarray([begin, end], { thisValue }) {
  const O = thisValue;
  if (Type(O) !== 'Object' || !('TypedArrayName' in O)) {
    return surroundingAgent.Throw('TypeError', msg('NotATypeObject', 'TypedArray', O));
  }
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
  const ArrayProto_toString = X(Get(realmRec.Intrinsics['%ArrayPrototype%'], new Value('toString')));
  Assert(Type(ArrayProto_toString) === 'Object');

  const proto = BootstrapPrototype(realmRec, [
    ['buffer', [TypedArrayProto_bufferGetter]],
    ['byteLength', [TypedArrayProto_byteLengthGetter]],
    ['byteOffset', [TypedArrayProto_byteOffsetGetter]],
    ['copyWithin', TypedArrayProto_copyWithin, 2],
    ['entries', TypedArrayProto_entries, 0],
    ['fill', TypedArrayProto_fill, 1],
    // ['filter', TypedArrayProto_filter, 1],
    ['keys', TypedArrayProto_keys, 0],
    ['length', [TypedArrayProto_lengthGetter]],
    ['subarray', TypedArrayProto_subarray, 2],
    ['values', TypedArrayProto_values, 0],
    ['toString', ArrayProto_toString],
    [wellKnownSymbols.toStringTag, [TypedArrayProto_toStringTagGetter]],
  ], realmRec.Intrinsics['%ObjectPrototype%']);

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

  realmRec.Intrinsics['%TypedArrayPrototype%'] = proto;
}
