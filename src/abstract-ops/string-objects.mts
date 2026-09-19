import {
  Descriptor,
  ObjectValue,
  SymbolValue,
  JSStringValue,
  Value,
  type PropertyKeyValue,
  type ObjectInternalMethods,
} from '../value.mts';
import { X } from '../completion.mts';
import type { StringObject } from '../intrinsics/String.mts';
import type { Mutable } from '../utils/language.mts';
import {
  Assert,
  CanonicalNumericIndexString,
  DefinePropertyOrThrow,
  IsIntegralNumber,
  MakeBasicObject,
  OrdinaryGetOwnProperty,
  OrdinaryDefineOwnProperty,
  IsCompatiblePropertyDescriptor,
  ToIntegerOrInfinity,
  ToString,
  isArrayIndex,
  F, R,
  type FullyPopulatedDataDescriptor,
} from './all.mts';
import type { PlainEvaluator } from '#self';

const InternalMethods = {
  * GetOwnProperty(propertyKey) {
    const string = this;
    if (propertyKey instanceof JSStringValue) propertyKey = propertyKey.stringValue();
    const propertyDesc = OrdinaryGetOwnProperty(string, propertyKey);
    if (propertyDesc) return propertyDesc;
    return StringGetOwnProperty(string, propertyKey);
  },
  * DefineOwnProperty(propertyKey, propertyDesc) {
    const string = this;
    if (propertyKey instanceof JSStringValue) propertyKey = propertyKey.stringValue();
    const stringDesc = StringGetOwnProperty(string, propertyKey);
    if (stringDesc) {
      const extensible = string.Extensible;
      return IsCompatiblePropertyDescriptor(extensible, propertyDesc, stringDesc);
    }
    return X(OrdinaryDefineOwnProperty(string, propertyKey, propertyDesc));
  },
  * OwnPropertyKeys(): PlainEvaluator<PropertyKeyValue[]> {
    const obj = this;
    const keys: PropertyKeyValue[] = [];
    const string = obj.StringData;
    Assert(typeof string === 'string');
    const length = string.length;

    // 5. For each non-negative integer i starting with 0 such that i < len, in ascending order, do
    for (let i = 0; i < length; i += 1) {
      // a. Add ! ToString(𝔽(i)) as the last element of keys.
      keys.push(Value(X(ToString(F(i)))));
    }

    // For each own property key P of O such that P is an array index and
    // ToIntegerOrInfinity(P) ≥ len, in ascending numeric index order, do
    //   Add P as the last element of keys.
    for (const propertyKey of obj.properties.keys()) {
      // This is written with two nested ifs to work around https://github.com/devsnek/engine262/issues/24
      if (isArrayIndex(propertyKey)) {
        if (X(ToIntegerOrInfinity(propertyKey)) >= length) {
          keys.push(propertyKey);
        }
      }
    }

    // For each own property key P of O such that Type(P) is String and
    // P is not an array index, in ascending chronological order of property creation, do
    //   Add P as the last element of keys.
    for (const propertyKey of obj.properties.keys()) {
      if (propertyKey instanceof JSStringValue && isArrayIndex(propertyKey) === false) {
        keys.push(propertyKey);
      }
    }

    // For each own property key P of O such that Type(P) is Symbol,
    // in ascending chronological order of property creation, do
    //   Add P as the last element of keys.
    for (const propertyKey of obj.properties.keys()) {
      if (propertyKey instanceof SymbolValue) {
        keys.push(propertyKey);
      }
    }

    return keys;
  },
} satisfies Partial<ObjectInternalMethods<StringObject>>;

/** https://tc39.es/ecma262/#sec-stringcreate */
export function StringCreate(value: string, prototype: ObjectValue) {
  const string = MakeBasicObject(['Prototype', 'Extensible', 'StringData']) as Mutable<StringObject>;
  string.Prototype = prototype;
  string.StringData = value;
  string.GetOwnProperty = InternalMethods.GetOwnProperty;
  string.DefineOwnProperty = InternalMethods.DefineOwnProperty;
  string.OwnPropertyKeys = InternalMethods.OwnPropertyKeys;
  const length = value.length;
  X(DefinePropertyOrThrow(string, 'length', Descriptor({
    Value: F(length),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  })));
  return string;
}

/** https://tc39.es/ecma262/#sec-stringgetownproperty */
export function StringGetOwnProperty(string: StringObject, propertyKey: string | PropertyKeyValue): FullyPopulatedDataDescriptor | undefined {
  if (propertyKey instanceof JSStringValue) propertyKey = propertyKey.stringValue();
  if (typeof propertyKey !== 'string') return undefined;
  const numericIndex = CanonicalNumericIndexString(propertyKey);
  if (numericIndex === undefined) return undefined;
  if (!IsIntegralNumber(numericIndex)) return undefined;
  if (Object.is(numericIndex.value, -0) || numericIndex.value < 0) return undefined;
  const stringData = string.StringData;
  Assert(typeof stringData === 'string');
  const length = stringData.length;
  if (R(numericIndex) >= length) return undefined;
  const resultString = stringData[R(numericIndex)];
  return Descriptor({
    Value: Value(resultString),
    Writable: false,
    Enumerable: true,
    Configurable: false,
  });
}
