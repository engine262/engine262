import {
  New as NewValue,
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
  const length = NewValue(value.stringValue().length);
  X(DefinePropertyOrThrow(S, NewValue('length'), {
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
    return NewValue(undefined);
  }
  const index = X(CanonicalNumericIndexString(P));
  if (Type(index) === 'Undefined') {
    return NewValue(undefined);
  }
  if (IsInteger(index).isFalse()) {
    return NewValue(undefined);
  }
  if (Object.is(index.numberValue(), -0)) {
    return NewValue(undefined);
  }
  const str = S.StringData;
  const len = str.stringValue().length;
  if (index.numberValue() < 0 || len <= index.numberValue()) {
    return NewValue(undefined);
  }
  const resultStr = str.stringValue()[index.numberValue()];
  return {
    Value: NewValue(resultStr),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  };
}
