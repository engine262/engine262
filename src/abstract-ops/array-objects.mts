import { surroundingAgent } from '../engine.mts';
import {
  Descriptor,
  ObjectValue,
  JSStringValue,
  Value,
  wellKnownSymbols,
  type ObjectInternalMethods,
  NumberValue,
  UndefinedValue,
  BooleanValue,
} from '../value.mts';
import { Q, X, type ExpressionCompletion } from '../completion.mts';
import type { Mutable } from '../helpers.mts';
import type { YieldEvaluator } from '../evaluator.mts';
import {
  AbstractRelationalComparison,
  Assert,
  Call,
  Construct,
  CreateArrayFromList,
  CreateIteratorFromClosure,
  Get,
  GetFunctionRealm,
  IsDataDescriptor,
  IsArray,
  IsConstructor,
  IsDetachedBuffer,
  OrdinaryDefineOwnProperty,
  OrdinaryGetOwnProperty,
  LengthOfArrayLike,
  MakeBasicObject,
  SameValue,
  ToBoolean,
  ToNumber,
  ToString,
  ToUint32,
  IsPropertyKey,
  isArrayIndex,
  isNonNegativeInteger,
  Yield,
  F, R,
  type OrdinaryObject,
  type FunctionObject,
  isIntegerIndexedExoticObject,
  type GeneratorObject,
  type ArrayBufferObject,
} from './all.mts';

const InternalMethods = {
  /** https://tc39.es/ecma262/#sec-array-exotic-objects-defineownproperty-p-desc */
  DefineOwnProperty(P, Desc) {
    const A = this;

    Assert(IsPropertyKey(P));
    if (P instanceof JSStringValue && P.stringValue() === 'length') {
      return Q(ArraySetLength(A, Desc));
    } else if (isArrayIndex(P)) {
      let oldLenDesc = OrdinaryGetOwnProperty(A, Value('length')) as Descriptor;
      Assert(X(IsDataDescriptor(oldLenDesc)));
      Assert(oldLenDesc.Configurable === Value.false);
      const oldLen = oldLenDesc.Value as NumberValue;
      const index = X(ToUint32(P));
      if (R(index) >= R(oldLen) && oldLenDesc.Writable === Value.false) {
        return Value.false;
      }
      const succeeded = X(OrdinaryDefineOwnProperty(A, P, Desc));
      if (succeeded === Value.false) {
        return Value.false;
      }
      if (R(index) >= R(oldLen)) {
        oldLenDesc = Descriptor({ ...oldLenDesc, Value: F(R(index) + 1) });
        const succeeded = OrdinaryDefineOwnProperty(A, Value('length'), oldLenDesc); // eslint-disable-line no-shadow
        Assert(succeeded === Value.true);
      }
      return Value.true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  },
} satisfies Partial<ObjectInternalMethods<OrdinaryObject>>;

export function isArrayExoticObject(O: ObjectValue) {
  return O.DefineOwnProperty === InternalMethods.DefineOwnProperty;
}

/** https://tc39.es/ecma262/#sec-arraycreate */
export function ArrayCreate(length: number, proto?: ObjectValue): ExpressionCompletion<OrdinaryObject> {
  Assert(isNonNegativeInteger(length));
  if (Object.is(length, -0)) {
    length = +0;
  }
  if (length > (2 ** 32) - 1) {
    return surroundingAgent.Throw('RangeError', 'InvalidArrayLength', length);
  }
  if (proto === undefined) {
    proto = surroundingAgent.intrinsic('%Array.prototype%');
  }
  const A = X(MakeBasicObject(['Prototype', 'Extensible'])) as Mutable<OrdinaryObject>;
  A.Prototype = proto;
  A.DefineOwnProperty = InternalMethods.DefineOwnProperty;

  X(OrdinaryDefineOwnProperty(A, Value('length'), Descriptor({
    Value: F(length),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  return A;
}

/** https://tc39.es/ecma262/#sec-arrayspeciescreate */
export function ArraySpeciesCreate(originalArray: ObjectValue, length: number) {
  Assert(typeof length === 'number' && Number.isInteger(length) && length >= 0);
  if (Object.is(length, -0)) {
    length = +0;
  }
  const isArray = Q(IsArray(originalArray));
  if (isArray === Value.false) {
    return Q(ArrayCreate(length));
  }
  let C = Q(Get(originalArray, Value('constructor')));
  if (IsConstructor(C) === Value.true) {
    const thisRealm = surroundingAgent.currentRealmRecord;
    const realmC = Q(GetFunctionRealm(C as FunctionObject));
    if (thisRealm !== realmC) {
      if (SameValue(C, realmC.Intrinsics['%Array%']) === Value.true) {
        C = Value.undefined;
      }
    }
  }
  if (C instanceof ObjectValue) {
    C = Q(Get(C, wellKnownSymbols.species));
    if (C === Value.null) {
      C = Value.undefined;
    }
  }
  if (C === Value.undefined) {
    return Q(ArrayCreate(length));
  }
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  return Q(Construct(C as FunctionObject, [F(length)]));
}

/** https://tc39.es/ecma262/#sec-arraysetlength */
export function ArraySetLength(A: OrdinaryObject, Desc: Descriptor) {
  if (Desc.Value === undefined) {
    return OrdinaryDefineOwnProperty(A, Value('length'), Desc);
  }
  let newLenDesc = Desc;
  const newLen = R(Q(ToUint32(Desc.Value)));
  const numberLen = R(Q(ToNumber(Desc.Value)));
  if (newLen !== numberLen) {
    return surroundingAgent.Throw('RangeError', 'InvalidArrayLength', Desc.Value);
  }
  newLenDesc = Descriptor({ ...Desc, Value: F(newLen) });
  const oldLenDesc = OrdinaryGetOwnProperty(A, Value('length')) as Descriptor;
  Assert(X(IsDataDescriptor(oldLenDesc)));
  Assert(oldLenDesc.Configurable === Value.false);
  const oldLen = R(oldLenDesc.Value as NumberValue);
  if (newLen >= oldLen) {
    return OrdinaryDefineOwnProperty(A, Value('length'), newLenDesc);
  }
  if (oldLenDesc.Writable === Value.false) {
    return Value.false;
  }
  let newWritable;
  if (newLenDesc.Writable === undefined || newLenDesc.Writable === Value.true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc = Descriptor({ ...newLenDesc, Writable: Value.true });
  }
  const succeeded = X(OrdinaryDefineOwnProperty(A, Value('length'), newLenDesc));
  if (succeeded === Value.false) {
    return Value.false;
  }
  const keys: JSStringValue[] = [];
  A.properties.forEach((_value, key) => {
    if (isArrayIndex(key) && Number((key as JSStringValue).stringValue()) >= newLen) {
      keys.push(key as JSStringValue);
    }
  });
  keys.sort((a, b) => Number(b.stringValue()) - Number(a.stringValue()));
  for (const P of keys) {
    const deleteSucceeded = X(A.Delete(P));
    if (deleteSucceeded === Value.false) {
      newLenDesc = Descriptor({ ...newLenDesc, Value: F(R(X(ToUint32(P))) + 1) });
      if (newWritable === false) {
        newLenDesc = Descriptor({ ...newLenDesc, Writable: Value.false });
      }
      X(OrdinaryDefineOwnProperty(A, Value('length'), newLenDesc));
      return Value.false;
    }
  }
  if (newWritable === false) {
    const s = OrdinaryDefineOwnProperty(A, Value('length'), Descriptor({ Writable: Value.false }));
    Assert(s === Value.true);
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-isconcatspreadable */
export function IsConcatSpreadable(O: Value): ExpressionCompletion<BooleanValue> {
  if (!(O instanceof ObjectValue)) {
    return Value.false;
  }
  const spreadable = Q(Get(O, wellKnownSymbols.isConcatSpreadable));
  if (spreadable !== Value.undefined) {
    return ToBoolean(spreadable);
  }
  return Q(IsArray(O));
}

/** https://tc39.es/ecma262/#sec-comparearrayelements */
export function CompareArrayElements(x: Value, y: Value, comparefn: FunctionObject | UndefinedValue): ExpressionCompletion<NumberValue> {
  // 1. If x and y are both undefined, return +0𝔽.
  if (x === Value.undefined && y === Value.undefined) {
    return F(+0);
  }
  // 2. If x is undefined, return 1𝔽.
  if (x === Value.undefined) {
    return F(1);
  }
  // 3. If y is undefined, return -1𝔽.
  if (y === Value.undefined) {
    return F(-1);
  }
  // 4. If comparefn is not undefined, then
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
  // 5. Let xString be ? ToString(x).
  const xString = Q(ToString(x));
  // 6. Let yString be ? ToString(y).
  const yString = Q(ToString(y));
  // 7. Let xSmaller be the result of performing Abstract Relational Comparison xString < yString.
  const xSmaller = AbstractRelationalComparison(xString, yString);
  // 8. If xSmaller is true, return -1𝔽.
  if (xSmaller === Value.true) {
    return F(-1);
  }
  // 9. Let ySmaller be the result of performing Abstract Relational Comparison yString < xString.
  const ySmaller = AbstractRelationalComparison(yString, xString);
  // 10. If ySmaller is true, return 1𝔽.
  if (ySmaller === Value.true) {
    return F(1);
  }
  // 11. Return +0𝔽.
  return F(+0);
}

/** https://tc39.es/ecma262/#sec-createarrayiterator */
export function CreateArrayIterator(array: ObjectValue, kind: 'key+value' | 'key' | 'value'): ExpressionCompletion<GeneratorObject> {
  // 1. Assert: Type(array) is Object.
  Assert(array instanceof ObjectValue);
  // 2. Assert: kind is key+value, key, or value.
  Assert(kind === 'key+value' || kind === 'key' || kind === 'value');
  // 3. Let closure be a new Abstract Closure with no parameters that captures kind and array and performs the following steps when called:
  const closure = function* closure(): YieldEvaluator {
    // a. Let index be 0.
    let index = 0;
    // b. Repeat,
    while (true) {
      let len;
      // i. If array has a [[TypedArrayName]] internal slot, then
      if (isIntegerIndexedExoticObject(array)) {
        // 1. If IsDetachedBuffer(array.[[ViewedArrayBuffer]]) is true, throw a TypeError exception.
        if (IsDetachedBuffer(array.ViewedArrayBuffer as ArrayBufferObject) === Value.true) {
          return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
        }
        // 2. Let len be array.[[ArrayLength]].
        len = array.ArrayLength;
      } else { // ii. Else,
        // 1. Let len be ? LengthOfArrayLike(array).
        len = Q(LengthOfArrayLike(array));
      }
      // iii. If index ≥ len, return undefined.
      if (index >= len) {
        return Value.undefined;
      }
      // iv. If kind is key, perform ? Yield(𝔽(index)).
      if (kind === 'key') {
        Q(yield* Yield(F(index)));
      } else { // v. Else,
        // 1. Let elementKey be ! ToString(𝔽(index)).
        const elementKey = X(ToString(F(index)));
        // 2. Let elementValue be ? Get(array, elementKey).
        const elementValue = Q(Get(array, elementKey));
        // 3. If kind is value, perform ? Yield(elementValue).
        if (kind === 'value') {
          Q(yield* Yield(elementValue));
        } else { // 4. Else,
          // a. Assert: kind is key+value.
          Assert(kind === 'key+value');
          // b. Perform ? Yield(! CreateArrayFromList(« 𝔽(index), elementValue »)).
          Q(yield* Yield(X(CreateArrayFromList([F(index), elementValue]))));
        }
      }
      // vi. Set index to index + 1.
      index += 1;
    }
  };
  // 4. Return ! CreateIteratorFromClosure(closure, "%ArrayIteratorPrototype%", %ArrayIteratorPrototype%).
  return X(CreateIteratorFromClosure(closure, Value('%ArrayIteratorPrototype%'), surroundingAgent.intrinsic('%ArrayIteratorPrototype%')));
}
