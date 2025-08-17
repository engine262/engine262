import {
  surroundingAgent, Descriptor, ObjectValue, JSStringValue, Value, wellKnownSymbols, type ObjectInternalMethods,
  NumberValue, UndefinedValue,
  BooleanValue,
  Q, X, type ValueCompletion, type ValueEvaluator,
  type Mutable, type YieldEvaluator,
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
  F, R,
  type OrdinaryObject,
  type FunctionObject,
  type GeneratorObject,
  MakeTypedArrayWithBufferWitnessRecord,
  IsTypedArrayOutOfBounds,
  TypedArrayLength,
  CreateIteratorResultObject,
  GeneratorYield,
} from '#self';
import { isTypedArrayObject } from '#self';

const InternalMethods = {
  /** https://tc39.es/ecma262/#sec-array-exotic-objects-defineownproperty-p-desc */
  * DefineOwnProperty(P, Desc): ValueEvaluator<BooleanValue> {
    const A = this;

    Assert(IsPropertyKey(P));
    if (P instanceof JSStringValue && P.stringValue() === 'length') {
      return Q(yield* ArraySetLength(A, Desc));
    } else if (isArrayIndex(P)) {
      let lengthDesc = OrdinaryGetOwnProperty(A, Value('length'));
      Assert(!(lengthDesc instanceof UndefinedValue));
      Assert(IsDataDescriptor(lengthDesc));
      Assert(lengthDesc.Configurable === Value.false);
      const length = lengthDesc.Value;
      Assert(length instanceof NumberValue && isNonNegativeInteger(R(length)));
      const index = X(ToUint32(P));
      if (R(index) >= R(length) && lengthDesc.Writable === Value.false) {
        return Value.false;
      }
      let succeeded = X(OrdinaryDefineOwnProperty(A, P, Desc));
      if (succeeded === Value.false) {
        return Value.false;
      }
      if (R(index) >= R(length)) {
        lengthDesc = Descriptor({ ...lengthDesc, Value: F(R(index) + 1) });
        succeeded = X(OrdinaryDefineOwnProperty(A, Value('length'), lengthDesc));
        Assert(succeeded === Value.true);
      }
      return Value.true;
    }
    return yield* OrdinaryDefineOwnProperty(A, P, Desc);
  },
} satisfies Partial<ObjectInternalMethods<OrdinaryObject>>;

export function isArrayExoticObject(O: Value) {
  return O instanceof ObjectValue && O.DefineOwnProperty === InternalMethods.DefineOwnProperty;
}

/** https://tc39.es/ecma262/#sec-arraycreate */
export function ArrayCreate(length: number, proto?: ObjectValue): ValueCompletion<OrdinaryObject> {
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
export function* ArraySpeciesCreate(originalArray: ObjectValue, length: number): ValueEvaluator<ObjectValue> {
  Assert(typeof length === 'number' && Number.isInteger(length) && length >= 0);
  if (Object.is(length, -0)) {
    length = +0;
  }
  const isArray = Q(IsArray(originalArray));
  if (isArray === Value.false) {
    return Q(ArrayCreate(length));
  }
  let C = Q(yield* Get(originalArray, Value('constructor')));
  if (IsConstructor(C)) {
    const thisRealm = surroundingAgent.currentRealmRecord;
    const realmC = Q(GetFunctionRealm(C));
    if (thisRealm !== realmC) {
      if (SameValue(C, realmC.Intrinsics['%Array%']) === Value.true) {
        C = Value.undefined;
      }
    }
  }
  if (C instanceof ObjectValue) {
    C = Q(yield* Get(C, wellKnownSymbols.species));
    if (C === Value.null) {
      C = Value.undefined;
    }
  }
  if (C === Value.undefined) {
    return Q(ArrayCreate(length));
  }
  if (!IsConstructor(C)) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', C);
  }
  return Q(yield* Construct(C, [F(length)]));
}

/** https://tc39.es/ecma262/#sec-arraysetlength */
export function* ArraySetLength(A: OrdinaryObject, Desc: Descriptor): ValueEvaluator<BooleanValue> {
  if (Desc.Value === undefined) {
    return yield* OrdinaryDefineOwnProperty(A, Value('length'), Desc);
  }
  let newLenDesc = Desc;
  const newLen = R(Q(yield* ToUint32(Desc.Value)));
  const numberLen = R(Q(yield* ToNumber(Desc.Value)));
  if (newLen !== numberLen) {
    return surroundingAgent.Throw('RangeError', 'InvalidArrayLength', Desc.Value);
  }
  newLenDesc = Descriptor({ ...Desc, Value: F(newLen) });
  const oldLenDesc = OrdinaryGetOwnProperty(A, Value('length'));
  Assert(!(oldLenDesc instanceof UndefinedValue));
  Assert(IsDataDescriptor(oldLenDesc));
  Assert(oldLenDesc.Configurable === Value.false);
  const oldLen = R(oldLenDesc.Value as NumberValue);
  if (newLen >= oldLen) {
    return yield* OrdinaryDefineOwnProperty(A, Value('length'), newLenDesc);
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
    const s = yield* OrdinaryDefineOwnProperty(A, Value('length'), Descriptor({ Writable: Value.false }));
    Assert(s === Value.true);
  }
  return Value.true;
}

/** https://tc39.es/ecma262/#sec-isconcatspreadable */
export function* IsConcatSpreadable(O: Value): ValueEvaluator<BooleanValue> {
  if (!(O instanceof ObjectValue)) {
    return Value.false;
  }
  const spreadable = Q(yield* Get(O, wellKnownSymbols.isConcatSpreadable));
  if (spreadable !== Value.undefined) {
    return ToBoolean(spreadable);
  }
  return Q(IsArray(O));
}

/** https://tc39.es/ecma262/#sec-comparearrayelements */
export function* CompareArrayElements(x: Value, y: Value, comparefn: FunctionObject | UndefinedValue): ValueEvaluator<NumberValue> {
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
    const v = Q(yield* ToNumber(Q(yield* Call(comparefn, Value.undefined, [x, y]))));
    // b. If v is NaN, return +0𝔽.
    if (v.isNaN()) {
      return F(+0);
    }
    // c. Return v.
    return v;
  }
  // 5. Let xString be ? ToString(x).
  const xString = Q(yield* ToString(x));
  // 6. Let yString be ? ToString(y).
  const yString = Q(yield* ToString(y));
  // 7. Let xSmaller be the result of performing Abstract Relational Comparison xString < yString.
  const xSmaller = yield* AbstractRelationalComparison(xString, yString);
  // 8. If xSmaller is true, return -1𝔽.
  if (xSmaller === Value.true) {
    return F(-1);
  }
  // 9. Let ySmaller be the result of performing Abstract Relational Comparison yString < xString.
  const ySmaller = yield* AbstractRelationalComparison(yString, xString);
  // 10. If ySmaller is true, return 1𝔽.
  if (ySmaller === Value.true) {
    return F(1);
  }
  // 11. Return +0𝔽.
  return F(+0);
}

/** https://tc39.es/ecma262/#sec-createarrayiterator */
export function CreateArrayIterator(array: ObjectValue, kind: 'key+value' | 'key' | 'value'): ValueCompletion<GeneratorObject> {
  // 3. Let closure be a new Abstract Closure with no parameters that captures kind and array and performs the following steps when called:
  const closure = function* closure(): YieldEvaluator {
    // a. Let index be 0.
    let index = 0;
    // b. Repeat,
    while (true) {
      let len;
      let result;
      // i. If array has a [[TypedArrayName]] internal slot, then
      if (isTypedArrayObject(array)) {
        const taRecord = MakeTypedArrayWithBufferWitnessRecord(array, 'seq-cst');
        if (IsTypedArrayOutOfBounds(taRecord)) {
          return surroundingAgent.Throw('TypeError', 'TypedArrayOutOfBounds');
        }
        // 2. Let len be array.[[ArrayLength]].
        len = TypedArrayLength(taRecord);
      } else { // ii. Else,
        // 1. Let len be ? LengthOfArrayLike(array).
        len = Q(yield* LengthOfArrayLike(array));
      }
      // iii. If index ≥ len, return undefined.
      if (index >= len) {
        // NON_SPEC
        generator.HostCapturedValues = undefined;
        return Value.undefined;
      }
      const indexNumber = F(index);
      // iv. If kind is key,
      if (kind === 'key') {
        result = indexNumber;
      } else { // v. Else,
        // 1. Let elementKey be ! ToString(indexNumber).
        const elementKey = X(ToString(indexNumber));
        // 2. Let elementValue be ? Get(array, elementKey).
        const elementValue = Q(yield* Get(array, elementKey));
        // 3. If kind is value, perform ? Yield(elementValue).
        if (kind === 'value') {
          result = elementValue;
        } else { // 4. Else,
          // a. Assert: kind is key+value.
          Assert(kind === 'key+value');
          // b. Perform ? Yield(! CreateArrayFromList(« 𝔽(index), elementValue »)).
          result = CreateArrayFromList([indexNumber, elementValue]);
        }
      }
      Q(yield* GeneratorYield(CreateIteratorResultObject(result, Value.false)));
      // vi. Set index to index + 1.
      index += 1;
    }
  };
  // 4. Return CreateIteratorFromClosure(closure, "%ArrayIteratorPrototype%", %ArrayIteratorPrototype%).
  const generator = CreateIteratorFromClosure(closure, Value('%ArrayIteratorPrototype%'), surroundingAgent.intrinsic('%ArrayIteratorPrototype%'), ['HostCapturedValues'], [array]);
  return generator;
}
