import {
  Value,
  StringExoticObjectValue,
  Type,
} from '../value.mjs';
import {
  Assert,
  CanonicalNumericIndexString,
  DefinePropertyOrThrow,
  IsInteger,
  IsPropertyKey,
} from './all.mjs';
import { X } from '../completion.mjs';

// #sec-stringcreate
export function StringCreate(value, prototype) {
  Assert(Type(value) === 'String');
  const S = new StringExoticObjectValue();
  S.StringData = value;
  S.Prototype = prototype;
  S.Extensible = true;
  const length = new Value(value.stringValue().length);
  X(DefinePropertyOrThrow(S, new Value('length'), {
    Value: length,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  }));
  return S;
}

export function StringGetOwnProperty(S, P) {
  Assert(Type(S) === 'Object' && 'StringData' in S);
  Assert(IsPropertyKey(P));
  if (Type(P) !== 'String') {
    return new Value(undefined);
  }
  const index = X(CanonicalNumericIndexString(P));
  if (Type(index) === 'Undefined') {
    return new Value(undefined);
  }
  if (IsInteger(index).isFalse()) {
    return new Value(undefined);
  }
  if (Object.is(index.numberValue(), -0)) {
    return new Value(undefined);
  }
  const str = S.StringData;
  const len = str.stringValue().length;
  if (index.numberValue() < 0 || len <= index.numberValue()) {
    return new Value(undefined);
  }
  const resultStr = str.stringValue()[index.numberValue()];
  return {
    Value: new Value(resultStr),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  };
}
