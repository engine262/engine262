// @ts-nocheck
import {
  Descriptor,
  ObjectValue,
  SymbolValue,
  JSStringValue,
  UndefinedValue,
  Value,
} from '../value.mts';
import { X } from '../completion.mts';
import {
  Assert,
  CanonicalNumericIndexString,
  DefinePropertyOrThrow,
  IsIntegralNumber,
  IsPropertyKey,
  MakeBasicObject,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  IsCompatiblePropertyDescriptor,
  ToIntegerOrInfinity,
  ToString,
  isArrayIndex,
  F, R,
} from './all.mts';

function StringExoticGetOwnProperty(P) {
  const S = this;
  Assert(IsPropertyKey(P));
  const desc = OrdinaryGetOwnProperty(S, P);
  if (!(desc instanceof UndefinedValue)) {
    return desc;
  }
  return X(StringGetOwnProperty(S, P));
}

function StringExoticDefineOwnProperty(P, Desc) {
  const S = this;
  Assert(IsPropertyKey(P));
  const stringDesc = X(StringGetOwnProperty(S, P));
  if (!(stringDesc instanceof UndefinedValue)) {
    const extensible = S.Extensible;
    return X(IsCompatiblePropertyDescriptor(extensible, Desc, stringDesc));
  }
  return X(OrdinaryDefineOwnProperty(S, P, Desc));
}

function StringExoticOwnPropertyKeys() {
  const O = this;
  const keys = [];
  const str = O.StringData;
  Assert(str instanceof JSStringValue);
  const len = str.stringValue().length;

  // 5. For each non-negative integer i starting with 0 such that i < len, in ascending order, do
  for (let i = 0; i < len; i += 1) {
    // a. Add ! ToString(𝔽(i)) as the last element of keys.
    keys.push(X(ToString(F(i))));
  }

  // For each own property key P of O such that P is an array index and
  // ToIntegerOrInfinity(P) ≥ len, in ascending numeric index order, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    // This is written with two nested ifs to work around https://github.com/devsnek/engine262/issues/24
    if (isArrayIndex(P)) {
      if (X(ToIntegerOrInfinity(P)) >= len) {
        keys.push(P);
      }
    }
  }

  // For each own property key P of O such that Type(P) is String and
  // P is not an array index, in ascending chronological order of property creation, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (P instanceof JSStringValue && isArrayIndex(P) === false) {
      keys.push(P);
    }
  }

  // For each own property key P of O such that Type(P) is Symbol,
  // in ascending chronological order of property creation, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (P instanceof SymbolValue) {
      keys.push(P);
    }
  }

  return keys;
}

/** https://tc39.es/ecma262/#sec-stringcreate */
export function StringCreate(value, prototype) {
  // 1. Assert: Type(value) is String.
  Assert(value instanceof JSStringValue);
  // 2. Let S be ! MakeBasicObject(« [[Prototype]], [[Extensible]], [[StringData]] »).
  const S = X(MakeBasicObject(['Prototype', 'Extensible', 'StringData']));
  // 3. Set S.[[Prototype]] to prototype.
  S.Prototype = prototype;
  // 4. Set S.[[StringData]] to value.
  S.StringData = value;
  // 5. Set S.[[GetOwnProperty]] as specified in 9.4.3.1.
  S.GetOwnProperty = StringExoticGetOwnProperty;
  // 6. Set S.[[DefineOwnProperty]] as specified in 9.4.3.2.
  S.DefineOwnProperty = StringExoticDefineOwnProperty;
  // 7. Set S.[[OwnPropertyKeys]] as specified in 9.4.3.3.
  S.OwnPropertyKeys = StringExoticOwnPropertyKeys;
  // 8. Let length be the number of code unit elements in value.
  const length = value.stringValue().length;
  // 9. Perform ! DefinePropertyOrThrow(S, "length", PropertyDescriptor { [[Value]]: length, [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(S, Value('length'), Descriptor({
    Value: F(length),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 10. Return S.
  return S;
}

/** https://tc39.es/ecma262/#sec-stringgetownproperty */
export function StringGetOwnProperty(S, P) {
  Assert(S instanceof ObjectValue && 'StringData' in S);
  Assert(IsPropertyKey(P));
  if (!(P instanceof JSStringValue)) {
    return Value.undefined;
  }
  const index = X(CanonicalNumericIndexString(P));
  if (index instanceof UndefinedValue) {
    return Value.undefined;
  }
  if (IsIntegralNumber(index) === Value.false) {
    return Value.undefined;
  }
  if (Object.is(R(index), -0)) {
    return Value.undefined;
  }
  const str = S.StringData;
  Assert(str instanceof JSStringValue);
  const len = str.stringValue().length;
  if (R(index) < 0 || len <= R(index)) {
    return Value.undefined;
  }
  const resultStr = str.stringValue()[R(index)];
  return Descriptor({
    Value: Value(resultStr),
    Writable: Value.false,
    Enumerable: Value.true,
    Configurable: Value.false,
  });
}
