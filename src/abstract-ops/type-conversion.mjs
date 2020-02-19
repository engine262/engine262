import {
  Type,
  Value,
  NumberValue,
  BigIntValue,
  wellKnownSymbols,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Assert,
  Call,
  Get,
  GetMethod,
  IsCallable,
  OrdinaryObjectCreate,
  SameValue,
  StringCreate,
} from './all.mjs';

// 7.1.1 #sec-toprimitive
export function ToPrimitive(input, PreferredType) {
  Assert(input instanceof Value);
  if (Type(input) === 'Object') {
    let hint;
    if (PreferredType === undefined) {
      hint = new Value('default');
    } else if (PreferredType === 'String') {
      hint = new Value('string');
    } else {
      Assert(PreferredType === 'Number');
      hint = new Value('number');
    }
    const exoticToPrim = Q(GetMethod(input, wellKnownSymbols.toPrimitive));
    if (exoticToPrim !== Value.undefined) {
      const result = Q(Call(exoticToPrim, input, [hint]));
      if (Type(result) !== 'Object') {
        return result;
      }
      return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
    }
    if (hint.stringValue() === 'default') {
      hint = new Value('number');
    }
    return Q(OrdinaryToPrimitive(input, hint));
  }
  return input;
}

// 7.1.1.1 #sec-ordinarytoprimitive
export function OrdinaryToPrimitive(O, hint) {
  Assert(Type(O) === 'Object');
  Assert(Type(hint) === 'String' && (hint.stringValue() === 'string' || hint.stringValue() === 'number'));
  let methodNames;
  if (hint.stringValue() === 'string') {
    methodNames = [new Value('toString'), new Value('valueOf')];
  } else {
    methodNames = [new Value('valueOf'), new Value('toString')];
  }
  for (const name of methodNames) {
    const method = Q(Get(O, name));
    if (IsCallable(method) === Value.true) {
      const result = Q(Call(method, O));
      if (Type(result) !== 'Object') {
        return result;
      }
    }
  }
  return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
}

// 7.1.2 #sec-toboolean
export function ToBoolean(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return Value.false;
    case 'Null':
      return Value.false;
    case 'Boolean':
      return argument;
    case 'Number':
      if (argument.numberValue() === 0 || argument.isNaN()) {
        return Value.false;
      }
      return Value.true;
    case 'String':
      if (argument.stringValue().length === 0) {
        return Value.false;
      }
      return Value.true;
    case 'Symbol':
      return Value.true;
    case 'BigInt':
      if (argument.bigintValue() === 0n) {
        return Value.false;
      }
      return Value.true;
    case 'Object':
      return Value.true;
    default:
      throw new OutOfRange('ToBoolean', { type, argument });
  }
}

// #sec-tonumeric
export function ToNumeric(value) {
  // 1. Let primValue be ? ToPrimitive(value, hint Number).
  const primValue = Q(ToPrimitive(value, 'Number'));
  // 2. If Type(primValue) is BigInt, return primValue.
  if (Type(primValue) === 'BigInt') {
    return primValue;
  }
  // 3. Return ? ToNumber(primValue).
  return Q(ToNumber(primValue));
}

// 7.1.3 #sec-tonumber
export function ToNumber(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return new Value(NaN);
    case 'Null':
      return new Value(0);
    case 'Boolean':
      if (argument === Value.true) {
        return new Value(1);
      }
      return new Value(0);
    case 'Number':
      return argument;
    case 'String':
      return new Value(Number(argument.stringValue()));
      return MV_StringNumericLiteral(argument.stringValue());
    case 'BigInt':
      return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
    case 'Symbol':
      return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'number');
    case 'Object': {
      const primValue = Q(ToPrimitive(argument, 'Number'));
      return Q(ToNumber(primValue));
    }
    default:
      throw new OutOfRange('ToNumber', { type, argument });
  }
}

const mod = (n, m) => {
  const r = n % m;
  return Math.floor(r >= 0 ? r : r + m);
};

// 7.1.4 #sec-tointeger
export function ToInteger(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0, or -0, return +0.
  if (Number.isNaN(number) || number === 0) {
    return new Value(0);
  }
  // 3. If number is +∞, or -∞, return number.
  if (!Number.isFinite(number)) {
    return new Value(number);
  }
  // 4. Let integer be the Number value that is the same sign as number and whose magnitude is floor(abs(number)).
  const integer = Math.sign(number) * Math.floor(Math.abs(number));
  // 5. If integer is -0, return +0.
  if (Object.is(integer, -0)) {
    return new Value(+0);
  }
  // 6. Return integer.
  return new Value(integer);
}

// 7.1.5 #sec-toint32
export function ToInt32(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  const int32bit = mod(int, 2 ** 32);
  if (int32bit >= (2 ** 31)) {
    return new Value(int32bit - (2 ** 32));
  }
  return new Value(int32bit);
}

// 7.1.6 #sec-touint32
export function ToUint32(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  const int32bit = mod(int, 2 ** 32);
  return new Value(int32bit);
}

// 7.1.7 #sec-toint16
export function ToInt16(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  const int16bit = mod(int, 2 ** 16);
  if (int16bit >= (2 ** 15)) {
    return new Value(int16bit - (2 ** 16));
  }
  return new Value(int16bit);
}

// 7.1.8 #sec-touint16
export function ToUint16(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  const int16bit = mod(int, 2 ** 16);
  return new Value(int16bit);
}

// 7.1.9 #sec-toint8
export function ToInt8(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  const int8bit = mod(int, 2 ** 8);
  if (int8bit >= (2 ** 7)) {
    return new Value(int8bit - (2 ** 8));
  }
  return new Value(int8bit);
}

// 7.1.10 #sec-touint8
export function ToUint8(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  const int8bit = mod(int, 2 ** 8);
  return new Value(int8bit);
}

// 7.1.11 #sec-touint8clamp
export function ToUint8Clamp(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number)) {
    return new Value(0);
  }
  if (number <= 0) {
    return new Value(0);
  }
  if (number >= 255) {
    return new Value(255);
  }
  const f = Math.floor(number);
  if (f + 0.5 < number) {
    return new Value(f + 1);
  }
  if (number < f + 0.5) {
    return new Value(f);
  }
  if (f % 2 === 1) {
    return new Value(f + 1);
  }
  return new Value(f);
}

// #sec-tobigint
export function ToBigInt(argument) {
  // 1. Let prim be ? ToPrimitive(argument, hint Number).
  const prim = Q(ToPrimitive(argument, 'Number'));
  // 2. Return the value that prim corresponds to in Table 12 (#table-tobigint).
  switch (Type(prim)) {
    case 'Undefined':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
    case 'Null':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
    case 'Boolean':
      // Return 1n if prim is true and 0n if prim is false.
      if (prim === Value.true) {
        return new Value(1n);
      }
      return new Value(0n);
    case 'BigInt':
      // Return prim.
      return prim;
    case 'Number':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
    case 'String': {
      // 1. Let n be ! StringToBigInt(prim).
      const n = X(StringToBigInt(prim));
      // 2. If n is NaN, throw a SyntaxError exception.
      if (Number.isNaN(n)) {
        return surroundingAgent.Throw('SyntaxError', 'CannotConvertToBigInt', prim);
      }
      // 3. Return n.
      return n;
    }
    case 'Symbol':
      return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'bigint');
    default:
      throw new OutOfRange('ToBigInt', argument);
  }
}

// #sec-stringtobigint
export function StringToBigInt(argument) {
  // Apply the algorithm in 7.1.4.1 (#sec-tonumber-applied-to-the-string-type) with the following changes:
  // 1. Replace the StrUnsignedDecimalLiteral production with DecimalDigits to not allow Infinity, decimal points, or exponents.
  // 2. If the MV is NaN, return NaN, otherwise return the BigInt which exactly corresponds to the MV, rather than rounding to a Number.
  // TODO: Adapt nearley grammar for this.
  try {
    return new Value(BigInt(argument.stringValue()));
  } catch {
    return NaN;
  }
}

// #sec-tobigint64
export function ToBigInt64(argument) {
  // 1. Let n be ? ToBigInt(argument).
  const n = Q(ToBigInt(argument));
  // 2. Let int64bit be n modulo 2^64.
  const int64bit = n.bigintValue() % (2n ** 64n);
  // 3. If int64bit ≥ 2^63, return int64bit - 2^64; otherwise return int64bit.
  if (int64bit >= 2n ** 63n) {
    return new Value(int64bit - (2n ** 64n));
  }
  return new Value(int64bit);
}

// #sec-tobiguint64
export function ToBigUint64(argument) {
  // 1. Let n be ? ToBigInt(argument).
  const n = Q(ToBigInt(argument));
  // 2. Let int64bit be n modulo 2^64.
  const int64bit = n.bigintValue() % (2n ** 64n);
  // 3. Return int64bit.
  return new Value(int64bit);
}

// 7.1.12 #sec-tostring
export function ToString(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return new Value('undefined');
    case 'Null':
      return new Value('null');
    case 'Boolean':
      return new Value(argument === Value.true ? 'true' : 'false');
    case 'Number':
      // Return ! Number::toString(argument).
      return X(NumberValue.toString(argument));
    case 'String':
      return argument;
    case 'Symbol':
      return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'string');
    case 'BigInt':
      // Return ! BigInt::toString(argument).
      return X(BigIntValue.toString(argument));
    case 'Object': {
      const primValue = Q(ToPrimitive(argument, 'String'));
      return Q(ToString(primValue));
    }
    default:
      throw new OutOfRange('ToString', { type, argument });
  }
}

// 7.1.13 #sec-toobject
export function ToObject(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'undefined');
    case 'Null':
      return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'null');
    case 'Boolean': {
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Boolean.prototype%'));
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Number.prototype%'));
      obj.NumberData = argument;
      return obj;
    }
    case 'String':
      return StringCreate(argument, surroundingAgent.intrinsic('%String.prototype%'));
    case 'Symbol': {
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Symbol.prototype%'));
      obj.SymbolData = argument;
      return obj;
    }
    case 'BigInt': {
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%BigInt.prototype%'));
      obj.BigIntData = argument;
      return obj;
    }
    case 'Object':
      return argument;
    default:
      throw new OutOfRange('ToObject', { type, argument });
  }
}

// 7.1.14 #sec-topropertykey
export function ToPropertyKey(argument) {
  const key = Q(ToPrimitive(argument, 'String'));
  if (Type(key) === 'Symbol') {
    return key;
  }
  return X(ToString(key));
}

// 7.1.15 #sec-tolength
export function ToLength(argument) {
  const len = Q(ToInteger(argument));
  if (len.numberValue() <= 0) {
    return new Value(0);
  }
  return new Value(Math.min(len.numberValue(), (2 ** 53) - 1));
}

// 7.1.16 #sec-canonicalnumericindexstring
export function CanonicalNumericIndexString(argument) {
  Assert(Type(argument) === 'String');
  if (argument.stringValue() === '-0') {
    return new Value(-0);
  }
  const n = X(ToNumber(argument));
  if (SameValue(X(ToString(n)), argument) === Value.false) {
    return Value.undefined;
  }
  return n;
}

// 7.1.17 #sec-toindex
export function ToIndex(value) {
  let index;
  if (Type(value) === 'Undefined') {
    index = new Value(0);
  } else {
    const integerIndex = Q(ToInteger(value));
    if (integerIndex.numberValue() < 0) {
      return surroundingAgent.Throw('RangeError', 'NegativeIndex', 'Index');
    }
    index = X(ToLength(integerIndex));
    if (X(SameValue(integerIndex, index)) === Value.false) {
      return surroundingAgent.Throw('RangeError', 'OutOfRange', 'Index');
    }
  }
  return index;
}
