import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import { X } from '../completion.mjs';
import {
  Assert,
  CanonicalNumericIndexString,
  DefinePropertyOrThrow,
  IsInteger,
  IsPropertyKey,
  MakeBasicObject,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  IsCompatiblePropertyDescriptor,
  ToInteger,
  isArrayIndex,
} from './all.mjs';

function StringExoticGetOwnProperty(P) {
  const S = this;
  Assert(IsPropertyKey(P));
  const desc = OrdinaryGetOwnProperty(S, P);
  if (Type(desc) !== 'Undefined') {
    return desc;
  }
  return X(StringGetOwnProperty(S, P));
}

function StringExoticDefineOwnProperty(P, Desc) {
  const S = this;
  Assert(IsPropertyKey(P));
  const stringDesc = X(StringGetOwnProperty(S, P));
  if (Type(stringDesc) !== 'Undefined') {
    const extensible = S.Extensible;
    return X(IsCompatiblePropertyDescriptor(extensible, Desc, stringDesc));
  }
  return X(OrdinaryDefineOwnProperty(S, P, Desc));
}

function StringExoticOwnPropertyKeys() {
  const O = this;
  const keys = [];
  const str = O.StringData;
  Assert(Type(str) === 'String');
  const len = str.stringValue().length;

  for (let i = 0; i < len; i += 1) {
    keys.push(new Value(`${i}`));
  }

  // For each own property key P of O such that P is an array index and
  // ToInteger(P) ≥ len, in ascending numeric index order, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    // This is written with two nested ifs to work around https://github.com/devsnek/engine262/issues/24
    if (isArrayIndex(P)) {
      if (X(ToInteger(P)).numberValue() >= len) {
        keys.push(P);
      }
    }
  }

  // For each own property key P of O such that Type(P) is String and
  // P is not an array index, in ascending chronological order of property creation, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (Type(P) === 'String' && isArrayIndex(P) === false) {
      keys.push(P);
    }
  }

  // For each own property key P of O such that Type(P) is Symbol,
  // in ascending chronological order of property creation, do
  //   Add P as the last element of keys.
  for (const P of O.properties.keys()) {
    if (Type(P) === 'Symbol') {
      keys.push(P);
    }
  }

  return keys;
}

// 9.4.3.4 #sec-stringcreate
export function StringCreate(value, prototype) {
  // 1. Assert: Type(value) is String.
  Assert(Type(value) === 'String');
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
  const length = new Value(value.stringValue().length);
  // 9. Perform ! DefinePropertyOrThrow(S, "length", PropertyDescriptor { [[Value]]: length, [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(S, new Value('length'), Descriptor({
    Value: length,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 10. Return S.
  return S;
}

// 9.4.3.5 #sec-stringgetownproperty
export function StringGetOwnProperty(S, P) {
  Assert(Type(S) === 'Object' && 'StringData' in S);
  Assert(IsPropertyKey(P));
  if (Type(P) !== 'String') {
    return Value.undefined;
  }
  const index = X(CanonicalNumericIndexString(P));
  if (Type(index) === 'Undefined') {
    return Value.undefined;
  }
  if (IsInteger(index) === Value.false) {
    return Value.undefined;
  }
  if (Object.is(index.numberValue(), -0)) {
    return Value.undefined;
  }
  const str = S.StringData;
  Assert(Type(str) === 'String');
  const len = str.stringValue().length;
  if (index.numberValue() < 0 || len <= index.numberValue()) {
    return Value.undefined;
  }
  const resultStr = str.stringValue()[index.numberValue()];
  return Descriptor({
    Value: new Value(resultStr),
    Writable: Value.false,
    Enumerable: Value.true,
    Configurable: Value.false,
  });
}
