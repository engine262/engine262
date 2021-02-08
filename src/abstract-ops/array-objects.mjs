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
  IsDataDescriptor,
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
  isArrayIndex,
  isNonNegativeInteger,
  𝔽,
} from './all.mjs';

// #sec-array-exotic-objects-defineownproperty-p-desc
function ArrayDefineOwnProperty(P, Desc) {
  const A = this;

  Assert(IsPropertyKey(P));
  if (Type(P) === 'String' && P.stringValue() === 'length') {
    return Q(ArraySetLength(A, Desc));
  } else if (isArrayIndex(P)) {
    const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
    Assert(X(IsDataDescriptor(oldLenDesc)));
    Assert(oldLenDesc.Configurable === Value.false);
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
      oldLenDesc.Value = 𝔽(index.numberValue() + 1);
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
  const A = X(MakeBasicObject(['Prototype', 'Extensible']));
  A.Prototype = proto;
  A.DefineOwnProperty = ArrayDefineOwnProperty;

  X(OrdinaryDefineOwnProperty(A, new Value('length'), Descriptor({
    Value: 𝔽(length),
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  return A;
}

// 9.4.2.3 #sec-arrayspeciescreate
export function ArraySpeciesCreate(originalArray, length) {
  Assert(typeof length === 'number' && Number.isInteger(length) && length >= 0);
  if (Object.is(length, -0)) {
    length = +0;
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
  return Q(Construct(C, [𝔽(length)]));
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
  newLenDesc.Value = 𝔽(newLen);
  const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
  Assert(X(IsDataDescriptor(oldLenDesc)));
  Assert(oldLenDesc.Configurable === Value.false);
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
      newLenDesc.Value = 𝔽(X(ToUint32(P)).numberValue() + 1);
      if (newWritable === false) {
        newLenDesc.Writable = Value.false;
      }
      X(OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc));
      return Value.false;
    }
  }
  if (newWritable === false) {
    const s = OrdinaryDefineOwnProperty(A, new Value('length'), Descriptor({ Writable: Value.false }));
    Assert(s === Value.true);
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
  // 1. If x and y are both undefined, return +0𝔽.
  if (x === Value.undefined && y === Value.undefined) {
    return 𝔽(+0);
  }
  // 2. If x is undefined, return 1𝔽.
  if (x === Value.undefined) {
    return 𝔽(1);
  }
  // 3. If y is undefined, return -1𝔽.
  if (y === Value.undefined) {
    return 𝔽(-1);
  }
  // 4. If comparefn is not undefined, then
  if (comparefn !== Value.undefined) {
    // a. Let v be ? ToNumber(? Call(comparefn, undefined, « x, y »)).
    const v = Q(ToNumber(Q(Call(comparefn, Value.undefined, [x, y]))));
    // b. If v is NaN, return +0𝔽.
    if (v.isNaN()) {
      return 𝔽(+0);
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
    return 𝔽(-1);
  }
  // 9. Let ySmaller be the result of performing Abstract Relational Comparison yString < xString.
  const ySmaller = AbstractRelationalComparison(yString, xString);
  // 10. If ySmaller is true, return 1𝔽.
  if (ySmaller === Value.true) {
    return 𝔽(1);
  }
  // 11. Return +0𝔽.
  return 𝔽(+0);
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
