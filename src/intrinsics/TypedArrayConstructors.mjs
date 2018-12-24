import {
  AllocateArrayBuffer,
  AllocateTypedArray,
  AllocateTypedArrayBuffer,
  Assert,
  CloneArrayBuffer,
  Get,
  GetMethod,
  GetValueFromBuffer,
  IsDetachedBuffer,
  IterableToList,
  SameValue,
  Set,
  SetValueInBuffer,
  SpeciesConstructor,
  ToIndex,
  ToLength,
  ToString,
  typedArrayInfo,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { msg } from '../helpers.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function CreateTypedArrayConstructor(realmRec, TypedArray) {
  const info = typedArrayInfo.get(TypedArray);
  Assert(info !== undefined);

  function TypedArrayConstructor(args, { NewTarget }) {
    if (args.length === 0) {
      // 22.2.4.1 #sec-typedarray
      if (NewTarget === Value.undefined) {
        return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', TypedArray));
      }
      const constructorName = new Value(TypedArray);
      return Q(AllocateTypedArray(constructorName, NewTarget, `%${TypedArray}Prototype%`, new Value(0)));
    } else if (Type(args[0]) !== 'Object') {
      // 22.2.4.2 #sec-typedarray-length
      const [length] = args;
      Assert(Type(length) !== 'Object');
      if (NewTarget === Value.undefined) {
        return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', TypedArray));
      }
      const elementLength = Q(ToIndex(length));
      const constructorName = new Value(TypedArray);
      return Q(AllocateTypedArray(constructorName, NewTarget, `%${TypedArray}Prototype%`, elementLength));
    } else if ('TypedArrayName' in args[0]) {
      // 22.2.4.3 #sec-typedarray-typedarray
      const [typedArray] = args;
      Assert(Type(typedArray) === 'Object' && 'TypedArrayName' in typedArray);
      if (NewTarget === Value.undefined) {
        return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', TypedArray));
      }
      const constructorName = new Value(TypedArray);
      const O = Q(AllocateTypedArray(constructorName, NewTarget, `%${TypedArray}Prototype%`));
      const srcArray = typedArray;
      const srcData = srcArray.ViewedArrayBuffer;
      if (IsDetachedBuffer(srcData)) {
        return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
      }
      const elementType = new Value(info.ElementType);
      const elementLength = srcArray.ArrayLength;
      const srcName = srcArray.TypedArrayName.stringValue();
      const srcInfo = typedArrayInfo.get(srcName);
      const srcType = new Value(srcInfo.ElementType);
      const srcElementSize = srcInfo.ElementSize;
      const srcByteOffset = srcArray.ByteOffset;
      const elementSize = info.ElementSize;
      const byteLength = new Value(elementSize * elementLength.numberValue());
      // if (!IsSharedArrayBuffer(srcData)) {
      const bufferConstructor = Q(SpeciesConstructor(srcData, surroundingAgent.intrinsic('%ArrayBuffer%')));
      // } else {
      //   bufferConstructor = surroundingAgent.intrinsic('%ArrayBuffer%');
      // }
      let data;
      if (SameValue(elementType, srcType) === Value.true) {
        data = Q(CloneArrayBuffer(srcData, srcByteOffset, byteLength, bufferConstructor));
      } else {
        data = Q(AllocateArrayBuffer(bufferConstructor, byteLength));
        if (IsDetachedBuffer(srcData)) {
          return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
        }
        let srcByteIndex = srcByteOffset.numberValue();
        let targetByteIndex = 0;
        let count = elementLength.numberValue();
        while (count > 0) {
          const value = GetValueFromBuffer(srcData, new Value(srcByteIndex), srcType.stringValue(), true, 'Unordered');
          SetValueInBuffer(data, new Value(targetByteIndex), elementType.stringValue(), value, true, 'Unordered');
          srcByteIndex += srcElementSize;
          targetByteIndex += elementSize;
          count -= 1;
        }
      }
      O.ViewedArrayBuffer = data;
      O.ByteLength = byteLength;
      O.ByteOffset = new Value(0);
      O.ArrayLength = elementLength;
      return O;
    } else if (!('TypedArrayName' in args[0]) && !('ArrayBufferData' in args[0])) {
      // 22.2.4.4 #sec-typedarray-object
      const [object] = args;
      Assert(Type(object) === 'Object' && !('TypedArrayName' in object) && !('ArrayBufferData' in object));
      if (NewTarget === Value.undefined) {
        return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', TypedArray));
      }
      const constructorName = new Value(TypedArray);
      const O = Q(AllocateTypedArray(constructorName, NewTarget, `%${TypedArray}Prototype%`));
      const usingIterator = Q(GetMethod(object, wellKnownSymbols.iterator));
      if (usingIterator !== Value.undefined) {
        const values = Q(IterableToList(object, usingIterator));
        const len = values.length;
        Q(AllocateTypedArrayBuffer(O, new Value(len)));
        let k = 0;
        while (k < len) {
          const Pk = X(ToString(new Value(k)));
          const kValue = values.shift();
          Q(Set(O, Pk, kValue, Value.true));
          k += 1;
        }
        Assert(values.length === 0);
        return O;
      }
      const arrayLike = object;
      const arrayLikeLength = Q(Get(arrayLike, new Value('length')));
      const len = Q(ToLength(arrayLikeLength));
      Q(AllocateTypedArrayBuffer(O, len));
      let k = 0;
      while (k < len.numberValue()) {
        const Pk = X(ToString(new Value(k)));
        const kValue = Q(Get(arrayLike, Pk));
        Q(Set(O, Pk, kValue, Value.true));
        k += 1;
      }
      return O;
    } else {
      // 22.2.4.5 #sec-typedarray-buffer-byteoffset-length
      const [buffer, byteOffset, length] = args;
      Assert(Type(buffer) === 'Object' && 'ArrayBufferData' in buffer);
      if (NewTarget === Value.undefined) {
        return surroundingAgent.Throw('TypeError', msg('ConstructorRequiresNew', TypedArray));
      }
      const constructorName = new Value(TypedArray);
      const O = Q(AllocateTypedArray(constructorName, NewTarget, `%${TypedArray}Prototype%`));
      const elementSize = info.ElementSize;
      const offset = Q(ToIndex(byteOffset));
      if (offset.numberValue() % elementSize !== 0) {
        return surroundingAgent.Throw('RangeError', msg('TypedArrayOffsetAlignment', TypedArray, elementSize));
      }
      let newLength;
      if (length !== undefined && length !== Value.undefined) {
        newLength = Q(ToIndex(length)).numberValue();
      }
      if (IsDetachedBuffer(buffer)) {
        return surroundingAgent.Throw('TypeError', msg('BufferDetached'));
      }
      const bufferByteLength = buffer.ArrayBufferByteLength.numberValue();
      let newByteLength;
      if (length === undefined || length === Value.undefined) {
        if (bufferByteLength % elementSize !== 0) {
          return surroundingAgent.Throw('RangeError', msg('TypedArrayLengthAlignment', TypedArray, elementSize));
        }
        newByteLength = bufferByteLength - offset.numberValue();
        if (newByteLength < 0) {
          return surroundingAgent.Throw('RangeError', msg('TypedArrayCreationOOB'));
        }
      } else {
        newByteLength = newLength * elementSize;
        if (offset.numberValue() + newByteLength > bufferByteLength) {
          return surroundingAgent.Throw('RangeError', msg('TypedArrayCreationOOB'));
        }
      }
      O.ViewedArrayBuffer = buffer;
      O.ByteLength = new Value(newByteLength);
      O.ByteOffset = offset;
      Assert(Number.isSafeInteger(newByteLength / elementSize));
      O.ArrayLength = new Value(newByteLength / elementSize);
      return O;
    }
  }

  const readonly = Descriptor({ Writable: Value.false, Configurable: Value.false });

  const taConstructor = BootstrapConstructor(realmRec, TypedArrayConstructor, TypedArray, 3, realmRec.Intrinsics[`%${TypedArray}Prototype%`], [
    ['BYTES_PER_ELEMENT', new Value(info.ElementSize), undefined, readonly],
  ]);
  // TODO: this doesn't seem to be spec'd anywhere…
  X(taConstructor.SetPrototypeOf(realmRec.Intrinsics['%TypedArray%']));
  realmRec.Intrinsics[`%${TypedArray}%`] = taConstructor;
}

export function CreateTypedArrayConstructors(realmRec) {
  for (const TypedArray of typedArrayInfo.keys()) {
    CreateTypedArrayConstructor(realmRec, TypedArray);
  }
}
