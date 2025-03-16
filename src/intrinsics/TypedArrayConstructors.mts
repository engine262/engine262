import { surroundingAgent } from '../engine.mts';
import {
  ObjectValue, UndefinedValue, Value, wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  Assert,
  GetMethod,
  IteratorToList,
  ToIndex,
  F,
  Realm,
  GetIteratorFromMethod,
  isArrayBufferObject,
} from '../abstract-ops/all.mts';
import { Q, X } from '../completion.mts';
import { __ts_cast__ } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import {
  AllocateTypedArray, InitializeTypedArrayFromArrayBuffer, InitializeTypedArrayFromArrayLike, InitializeTypedArrayFromList, InitializeTypedArrayFromTypedArray, isTypedArrayObject, typedArrayInfoByName, type TypedArrayConstructorNames,
} from './TypedArray.mts';

export function bootstrapTypedArrayConstructors(realmRec: Realm) {
  Object.entries(typedArrayInfoByName).forEach(([TypedArray, info]) => {
    /** https://tc39.es/ecma262/#sec-typedarray-constructors */
    function TypedArrayConstructor(this: Value, args: Arguments, { NewTarget }: FunctionCallContext) {
      __ts_cast__<TypedArrayConstructorNames>(TypedArray);
      if (NewTarget instanceof UndefinedValue) {
        return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
      }
      const constructorName = Value(TypedArray);
      const proto = `%${TypedArray}.prototype%` as const;
      const numberOfArgs = args.length;
      if (numberOfArgs === 0) {
        return AllocateTypedArray(constructorName, NewTarget, proto, 0);
      } else {
        const firstArgument = args[0];
        if (firstArgument instanceof ObjectValue) {
          const O = Q(AllocateTypedArray(constructorName, NewTarget, proto));
          if (isTypedArrayObject(firstArgument)) {
            Q(InitializeTypedArrayFromTypedArray(O, firstArgument));
          } else if (isArrayBufferObject(firstArgument)) {
            let byteOffset;
            let length;
            if (numberOfArgs > 1) {
              byteOffset = args[1];
            } else {
              byteOffset = Value.undefined;
            }
            if (numberOfArgs > 2) {
              length = args[2];
            } else {
              length = Value.undefined;
            }
            Q(InitializeTypedArrayFromArrayBuffer(O, firstArgument, byteOffset, length));
          } else {
            Assert(firstArgument instanceof ObjectValue && !isTypedArrayObject(firstArgument) && !isArrayBufferObject(firstArgument));
            const usingIterator = Q(GetMethod(firstArgument, wellKnownSymbols.iterator));
            if (!(usingIterator instanceof UndefinedValue)) {
              const values = Q(IteratorToList(Q(GetIteratorFromMethod(firstArgument, usingIterator))));
              Q(InitializeTypedArrayFromList(O, values));
            } else {
              Q(InitializeTypedArrayFromArrayLike(O, firstArgument));
            }
          }
          return O;
        } else {
          Assert(!(firstArgument instanceof ObjectValue));
          const elementLength = Q(ToIndex(firstArgument));
          return AllocateTypedArray(constructorName, NewTarget, proto, elementLength);
        }
      }
    }

    const taConstructor = bootstrapConstructor(realmRec, TypedArrayConstructor, TypedArray, 3, realmRec.Intrinsics[`%${TypedArray as TypedArrayConstructorNames}.prototype%`], [
      ['BYTES_PER_ELEMENT', F(info.ElementSize), undefined, {
        Writable: Value.false,
        Configurable: Value.false,
      }],
    ]);
    X(taConstructor.SetPrototypeOf(realmRec.Intrinsics['%TypedArray%']));
    realmRec.Intrinsics[`%${TypedArray as TypedArrayConstructorNames}%`] = taConstructor;
  });
}
