import {
  Value,
  StringExoticObjectValue,
  Type,
  Descriptor,
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
  S.Extensible = Value.true;
  const length = new Value(value.stringValue().length);
  X(DefinePropertyOrThrow(S, new Value('length'), Descriptor({
    Value: length,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  return S;
}

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
  if (IsInteger(index) === false) {
    return Value.undefined;
  }
  if (Object.is(index.numberValue(), -0)) {
    return Value.undefined;
  }
  const str = S.StringData;
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
