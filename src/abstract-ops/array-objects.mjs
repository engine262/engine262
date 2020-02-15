import { surroundingAgent } from '../engine.mjs';
import {
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import {
  AbstractRelationalComparison,
  Assert,
  Call,
  Construct,
  Get,
  GetFunctionRealm,
  IsAccessorDescriptor,
  IsArray,
  IsConstructor,
  OrdinaryDefineOwnProperty,
  OrdinaryGetOwnProperty,
  OrdinaryObjectCreate,
  MakeBasicObject,
  SameValue,
  ToBoolean,
  ToNumber,
  ToString,
  ToUint32,
  IsPropertyKey,
  IsNonNegativeInteger,
  isArrayIndex,
} from './all.mjs';

// #sec-array-exotic-objects-defineownproperty-p-desc
function ArrayDefineOwnProperty(P, Desc) {
  const A = this;

  Assert(IsPropertyKey(P));
  if (Type(P) === 'String' && P.stringValue() === 'length') {
    return Q(ArraySetLength(A, Desc));
  } else if (isArrayIndex(P)) {
    const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
    Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
    const oldLen = oldLenDesc.Value;
    const index = X(ToUint32(P));
    if (index.numberValue() >= oldLen.numberValue() && oldLenDesc.Writable === Value.false) {
      return Value.false;
    }
    const succeeded = X(OrdinaryDefineOwnProperty(A, P, Desc));
    if (succeeded === Value.false) {
      return Value.false;
    }
    if (index.numberValue() >= oldLen.numberValue()) {
      oldLenDesc.Value = new Value(index.numberValue() + 1);
      const succeeded = OrdinaryDefineOwnProperty(A, new Value('length'), oldLenDesc); // eslint-disable-line no-shadow
      Assert(succeeded === Value.true);
    }
    return Value.true;
  }
  return OrdinaryDefineOwnProperty(A, P, Desc);
}

export function isArrayExoticObject(O) {
  return O.DefineOwnProperty === ArrayDefineOwnProperty;
}

// 9.4.2.2 #sec-arraycreate
export function ArrayCreate(length, proto) {
  Assert(X(IsNonNegativeInteger(length)) === Value.true);
  if (Object.is(length.numberValue(), -0)) {
    length = new Value(0);
  }
  if (length.numberValue() > (2 ** 32) - 1) {
    return surroundingAgent.Throw('RangeError', 'InvalidArrayLength', length);
  }
  if (proto === undefined) {
    proto = surroundingAgent.intrinsic('%Array.prototype%');
  }
  const A = X(MakeBasicObject(['Prototype', 'Extensible']));
  A.Prototype = proto;
  A.DefineOwnProperty = ArrayDefineOwnProperty;

  X(OrdinaryDefineOwnProperty(A, new Value('length'), Descriptor({
    Value: length,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  return A;
}

// 9.4.2.3 #sec-arrayspeciescreate
export function ArraySpeciesCreate(originalArray, length) {
  Assert(Type(length) === 'Number' && Number.isInteger(length.numberValue()) && length.numberValue() >= 0);
  if (Object.is(length.numberValue(), -0)) {
    length = new Value(+0);
  }
  const isArray = Q(IsArray(originalArray));
  if (isArray === Value.false) {
    return Q(ArrayCreate(length));
  }
  let C = Q(Get(originalArray, new Value('constructor')));
  if (IsConstructor(C) === Value.true) {
    const thisRealm = surroundingAgent.currentRealmRecord;
    const realmC = Q(GetFunctionRealm(C));
    if (thisRealm !== realmC) {
      if (SameValue(C, realmC.Intrinsics['%Array%']) === Value.true) {
        C = Value.undefined;
      }
    }
  }
  if (Type(C) === 'Object') {
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
  return Q(Construct(C, [length]));
}

// 9.4.2.4 #sec-arraysetlength
export function ArraySetLength(A, Desc) {
  if (Desc.Value === undefined) {
    return OrdinaryDefineOwnProperty(A, new Value('length'), Desc);
  }
  const newLenDesc = Descriptor({ ...Desc });
  const newLen = Q(ToUint32(Desc.Value)).numberValue();
  const numberLen = Q(ToNumber(Desc.Value)).numberValue();
  if (newLen !== numberLen) {
    return surroundingAgent.Throw('RangeError', 'InvalidArrayLength', Desc.Value);
  }
  newLenDesc.Value = new Value(newLen);
  const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
  Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
  const oldLen = oldLenDesc.Value.numberValue();
  if (newLen >= oldLen) {
    return OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc);
  }
  if (oldLenDesc.Writable === Value.false) {
    return Value.false;
  }
  let newWritable;
  if (newLenDesc.Writable === undefined || newLenDesc.Writable === Value.true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc.Writable = Value.true;
  }
  const succeeded = X(OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc));
  if (succeeded === Value.false) {
    return Value.false;
  }
  const keys = [];
  A.properties.forEach((value, key) => {
    if (isArrayIndex(key) && Number(key.stringValue()) >= newLen) {
      keys.push(key);
    }
  });
  keys.sort((a, b) => Number(b.stringValue()) - Number(a.stringValue()));
  for (const P of keys) {
    const deleteSucceeded = X(A.Delete(P));
    if (deleteSucceeded === Value.false) {
      newLenDesc.Value = new Value(X(ToUint32(P)).numberValue() + 1);
      if (newWritable === false) {
        newLenDesc.Writable = Value.false;
      }
      X(OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc));
      return Value.false;
    }
  }
  if (newWritable === false) {
    OrdinaryDefineOwnProperty(A, new Value('length'), Descriptor({ Writable: Value.false }));
  }
  return Value.true;
}

// 22.1.3.1.1 #sec-isconcatspreadable
export function IsConcatSpreadable(O) {
  if (Type(O) !== 'Object') {
    return Value.false;
  }
  const spreadable = Q(Get(O, wellKnownSymbols.isConcatSpreadable));
  if (spreadable !== Value.undefined) {
    return ToBoolean(spreadable);
  }
  return Q(IsArray(O));
}

// 22.1.3.27.1 #sec-sortcompare
export function SortCompare(x, y, comparefn) {
  if (x === Value.undefined && y === Value.undefined) {
    return new Value(+0);
  }
  if (x === Value.undefined) {
    return new Value(1);
  }
  if (y === Value.undefined) {
    return new Value(-1);
  }
  if (comparefn !== Value.undefined) {
    const callRes = Q(Call(comparefn, Value.undefined, [x, y]));
    const v = Q(ToNumber(callRes));
    if (v.isNaN()) {
      return new Value(+0);
    }
    return v;
  }
  const xString = Q(ToString(x));
  const yString = Q(ToString(y));
  const xSmaller = AbstractRelationalComparison(xString, yString);
  if (xSmaller === Value.true) {
    return new Value(-1);
  }
  const ySmaller = AbstractRelationalComparison(yString, xString);
  if (ySmaller === Value.true) {
    return new Value(1);
  }
  return new Value(+0);
}

// 22.1.5.1 #sec-createarrayiterator
export function CreateArrayIterator(array, kind) {
  // 1. Assert: Type(array) is Object.
  Assert(Type(array) === 'Object');
  // 2. Assert: kind is key+value, key, or value.
  Assert(kind === 'key+value' || kind === 'key' || kind === 'value');
  // 3. Let iterator be ObjectCreate(%ArrayIteratorPrototype%, « [[IteratedArrayLike]], [[ArrayLikeNextIndex]], [[ArrayLikeIterationKind]] »).
  const iterator = OrdinaryObjectCreate(surroundingAgent.intrinsic('%ArrayIterator.prototype%'), [
    'IteratedArrayLike',
    'ArrayLikeNextIndex',
    'ArrayLikeIterationKind',
  ]);
  // 4. Set iterator.[[IteratedArrayLike]] to array.
  iterator.IteratedArrayLike = array;
  // 5. Set iterator.[[ArrayLikeNextIndex]] to 0.
  iterator.ArrayLikeNextIndex = 0;
  // 6. Set iterator.[[ArrayLikeIterationKind]] to kind.
  iterator.ArrayLikeIterationKind = kind;
  // 7. Return iterator.
  return iterator;
}
