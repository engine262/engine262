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
import { MV_StringNumericLiteral } from '../runtime-semantics/all.mjs';
import {
  Assert,
  Call,
  Get,
  GetMethod,
  IsCallable,
  OrdinaryObjectCreate,
  SameValue,
  StringCreate,
  Z,
  F,
} from './all.mjs';

// 7.1.1 #sec-toprimitive
export function ToPrimitive(input, preferredType) {
  // 1. Assert: input is an ECMAScript language value.
  Assert(input instanceof Value);
  // 2. If Type(input) is Object, then
  if (Type(input) === 'Object') {
    // a. Let exoticToPrim be ? GetMethod(input, @@toPrimitive).
    const exoticToPrim = Q(GetMethod(input, wellKnownSymbols.toPrimitive));
    // b. If exoticToPrim is not undefined, then
    if (exoticToPrim !== Value.undefined) {
      let hint;
      // i. If preferredType is not present, let hint be "default".
      if (preferredType === undefined) {
        hint = new Value('default');
      } else if (preferredType === 'string') { // ii. Else if preferredType is string, let hint be "string".
        hint = new Value('string');
      } else { // iii. Else,
        // 1. Assert: preferredType is number.
        Assert(preferredType === 'number');
        // 2. Let hint be "number".
        hint = new Value('number');
      }
      // iv. Let result be ? Call(exoticToPrim, input, « hint »).
      const result = Q(Call(exoticToPrim, input, [hint]));
      // v. If Type(result) is not Object, return result.
      if (Type(result) !== 'Object') {
        return result;
      }
      // vi. Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
    }
    // c. If preferredType is not present, let preferredType be number.
    if (preferredType === undefined) {
      preferredType = 'number';
    }
    // d. Return ? OrdinaryToPrimitive(input, preferredType).
    return Q(OrdinaryToPrimitive(input, preferredType));
  }
  // 3. Return input.
  return input;
}

// 7.1.1.1 #sec-ordinarytoprimitive
export function OrdinaryToPrimitive(O, hint) {
  // 1. Assert: Type(O) is Object.
  Assert(Type(O) === 'Object');
  // 2. Assert: hint is either string or number.
  Assert(hint === 'string' || hint === 'number');
  let methodNames;
  // 3. If hint is string, then
  if (hint === 'string') {
    // a. Let methodNames be « "toString", "valueOf" ».
    methodNames = [new Value('toString'), new Value('valueOf')];
  } else { // 4. Else,
    // a. Let methodNames be « "valueOf", "toString" ».
    methodNames = [new Value('valueOf'), new Value('toString')];
  }
  // 5. For each element name of methodNames, do
  for (const name of methodNames) {
    // a. Let method be ? Get(O, name).
    const method = Q(Get(O, name));
    // b. If IsCallable(method) is true, then
    if (IsCallable(method) === Value.true) {
      // i. Let result be ? Call(method, O).
      const result = Q(Call(method, O));
      // ii. If Type(result) is not Object, return result.
      if (Type(result) !== 'Object') {
        return result;
      }
    }
  }
  // 6. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
}

// 7.1.2 #sec-toboolean
export function ToBoolean(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      // Return false.
      return Value.false;
    case 'Null':
      // Return false.
      return Value.false;
    case 'Boolean':
      // Return argument.
      return argument;
    case 'Number':
      // If argument is +0𝔽, -0𝔽, or NaN, return false; otherwise return true.
      if (argument.numberValue() === 0 || argument.isNaN()) {
        return Value.false;
      }
      return Value.true;
    case 'String':
      // If argument is the empty String (its length is zero), return false; otherwise return true.
      if (argument.stringValue().length === 0) {
        return Value.false;
      }
      return Value.true;
    case 'Symbol':
      // Return true.
      return Value.true;
    case 'BigInt':
      // If argument is 0ℤ, return false; otherwise return true.
      if (argument.bigintValue() === 0n) {
        return Value.false;
      }
      return Value.true;
    case 'Object':
      // Return true.
      return Value.true;
    default:
      throw new OutOfRange('ToBoolean', { type, argument });
  }
}

// #sec-tonumeric
export function ToNumeric(value) {
  // 1. Let primValue be ? ToPrimitive(value, number).
  const primValue = Q(ToPrimitive(value, 'number'));
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
      // Return NaN.
      return F(NaN);
    case 'Null':
      // Return +0𝔽.
      return F(+0);
    case 'Boolean':
      // If argument is true, return 1𝔽.
      if (argument === Value.true) {
        return F(1);
      }
      // If argument is false, return +0𝔽.
      return F(+0);
    case 'Number':
      // Return argument (no conversion).
      return argument;
    case 'String':
      return MV_StringNumericLiteral(argument.stringValue());
    case 'BigInt':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
    case 'Symbol':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'number');
    case 'Object': {
      // 1. Let primValue be ? ToPrimitive(argument, number).
      const primValue = Q(ToPrimitive(argument, 'number'));
      // 2. Return ? ToNumber(primValue).
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

// 7.1.4 #sec-tointegerorinfinity
export function ToIntegerOrInfinity(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument));
  // 2. If number is NaN, +0𝔽, or -0𝔽, return 0.
  if (number.isNaN() || number.numberValue() === 0) {
    return +0;
  }
  // 3. If number is +∞𝔽, return +∞.
  // 4. If number is -∞𝔽, return -∞.
  if (!number.isFinite()) {
    return number.numberValue();
  }
  // 4. Let integer be floor(abs(ℝ(number))).
  let integer = Math.floor(Math.abs(number.numberValue()));
  // 5. If number < +0𝔽, set integer to -integer.
  if (number.numberValue() < 0 && integer !== 0) {
    integer = -integer;
  }
  // 6. Return integer.
  return integer;
}

// 7.1.5 #sec-toint32
export function ToInt32(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return F(+0);
  }
  // 3. Let int be the mathematical value that is the same sign as number and whose magnitude is floor(abs(ℝ(number))).
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  // 4. Let int32bit be int modulo 2^32.
  const int32bit = mod(int, 2 ** 32);
  // 5. If int32bit ≥ 2^31, return 𝔽(int32bit - 2^32); otherwise return 𝔽(int32bit).
  if (int32bit >= (2 ** 31)) {
    return F(int32bit - (2 ** 32));
  }
  return F(int32bit);
}

// 7.1.6 #sec-touint32
export function ToUint32(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return F(+0);
  }
  // 3. Let int be the mathematical value that is the same sign as number and whose magnitude is floor(abs(ℝ(number))).
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  // 4. Let int32bit be int modulo 2^32.
  const int32bit = mod(int, 2 ** 32);
  // 5. Return 𝔽(int32bit).
  return F(int32bit);
}

// 7.1.7 #sec-toint16
export function ToInt16(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return F(+0);
  }
  // 3. Let int be the mathematical value that is the same sign as number and whose magnitude is floor(abs(ℝ(number))).
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  // 4. Let int16bit be int modulo 2^16.
  const int16bit = mod(int, 2 ** 16);
  // 5. If int16bit ≥ 2^31, return 𝔽(int16bit - 2^32); otherwise return 𝔽(int16bit).
  if (int16bit >= (2 ** 15)) {
    return F(int16bit - (2 ** 16));
  }
  return F(int16bit);
}

// 7.1.8 #sec-touint16
export function ToUint16(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return F(+0);
  }
  // 3. Let int be the mathematical value that is the same sign as number and whose magnitude is floor(abs(ℝ(number))).
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  // 4. Let int16bit be int modulo 2^16.
  const int16bit = mod(int, 2 ** 16);
  // 5. Return 𝔽(int16bit).
  return F(int16bit);
}

// 7.1.9 #sec-toint8
export function ToInt8(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return F(+0);
  }
  // 3. Let int be the mathematical value that is the same sign as number and whose magnitude is floor(abs(ℝ(number))).
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  // 4. Let int8bit be int modulo 2^8.
  const int8bit = mod(int, 2 ** 8);
  // 5. If int8bit ≥ 2^7, return 𝔽(int8bit - 2^8); otherwise return 𝔽(int8bit).
  if (int8bit >= (2 ** 7)) {
    return F(int8bit - (2 ** 8));
  }
  return F(int8bit);
}

// 7.1.10 #sec-touint8
export function ToUint8(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, +0𝔽, -0𝔽, +∞𝔽, or -∞𝔽, return +0𝔽.
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return F(+0);
  }
  // 3. Let int be the mathematical value that is the same sign as number and whose magnitude is floor(abs(ℝ(number))).
  const int = Math.sign(number) * Math.floor(Math.abs(number));
  // 4. Let int8bit be int modulo 2^8.
  const int8bit = mod(int, 2 ** 8);
  // 5. Return 𝔽(int8bit).
  return F(int8bit);
}

// 7.1.11 #sec-touint8clamp
export function ToUint8Clamp(argument) {
  // 1. Let number be ? ToNumber(argument).
  const number = Q(ToNumber(argument)).numberValue();
  // 2. If number is NaN, return +0𝔽.
  if (Number.isNaN(number)) {
    return F(+0);
  }
  // 3. If ℝ(number) ≤ 0, return +0𝔽.
  if (number <= 0) {
    return F(+0);
  }
  // 4. If ℝ(number) ≥ 255, return 255𝔽.
  if (number >= 255) {
    return F(255);
  }
  // 5. Let f be floor(ℝ(number)).
  const f = Math.floor(number);
  // 6. If f + 0.5 < ℝ(number), return 𝔽(f + 1).
  if (f + 0.5 < number) {
    return F(f + 1);
  }
  // 7. If ℝ(number) < f + 0.5, return 𝔽(f).
  if (number < f + 0.5) {
    return F(f);
  }
  // 8. If f is odd, return 𝔽(f + 1).
  if (f % 2 === 1) {
    return F(f + 1);
  }
  // 9. Return 𝔽(f).
  return F(f);
}

// #sec-tobigint
export function ToBigInt(argument) {
  // 1. Let prim be ? ToPrimitive(argument, number).
  const prim = Q(ToPrimitive(argument, 'number'));
  // 2. Return the value that prim corresponds to in Table 12 (#table-tobigint).
  switch (Type(prim)) {
    case 'Undefined':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
    case 'Null':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
    case 'Boolean':
      // Return 1ℤ if prim is true and 0ℤ if prim is false.
      if (prim === Value.true) {
        return Z(1n);
      }
      return Z(0n);
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
      // Throw a TypeError exception.
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
    return Z(BigInt(argument.stringValue()));
  } catch {
    return NaN;
  }
}

// #sec-tobigint64
export function ToBigInt64(argument) {
  // 1. Let n be ? ToBigInt(argument).
  const n = Q(ToBigInt(argument));
  // 2. Let int64bit be ℝ(n) modulo 2^64.
  const int64bit = n.bigintValue() % (2n ** 64n);
  // 3. If int64bit ≥ 2^63, return ℤ(int64bit - 2^64); otherwise return ℤ(int64bit).
  if (int64bit >= 2n ** 63n) {
    return Z(int64bit - (2n ** 64n));
  }
  return Z(int64bit);
}

// #sec-tobiguint64
export function ToBigUint64(argument) {
  // 1. Let n be ? ToBigInt(argument).
  const n = Q(ToBigInt(argument));
  // 2. Let int64bit be ℝ(n) modulo 2^64.
  const int64bit = n.bigintValue() % (2n ** 64n);
  // 3. Return ℤ(int64bit).
  return Z(int64bit);
}

// 7.1.12 #sec-tostring
export function ToString(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      // Return "undefined".
      return new Value('undefined');
    case 'Null':
      // Return "null".
      return new Value('null');
    case 'Boolean':
      // If argument is true, return "true".
      // If argument is false, return "false".
      return new Value(argument === Value.true ? 'true' : 'false');
    case 'Number':
      // Return ! Number::toString(argument).
      return X(NumberValue.toString(argument));
    case 'String':
      // Return argument.
      return argument;
    case 'Symbol':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'string');
    case 'BigInt':
      // Return ! BigInt::toString(argument).
      return X(BigIntValue.toString(argument));
    case 'Object': {
      // 1. Let primValue be ? ToPrimitive(argument, string).
      const primValue = Q(ToPrimitive(argument, 'string'));
      // 2. Return ? ToString(primValue).
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
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'undefined');
    case 'Null':
      // Throw a TypeError exception.
      return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'null');
    case 'Boolean': {
      // Return a new Boolean object whose [[BooleanData]] internal slot is set to argument.
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Boolean.prototype%'), ['BooleanData']);
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      // Return a new Number object whose [[NumberData]] internal slot is set to argument.
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Number.prototype%'), ['NumberData']);
      obj.NumberData = argument;
      return obj;
    }
    case 'String':
      // Return a new String object whose [[StringData]] internal slot is set to argument.
      return StringCreate(argument, surroundingAgent.intrinsic('%String.prototype%'));
    case 'Symbol': {
      // Return a new Symbol object whose [[SymbolData]] internal slot is set to argument.
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Symbol.prototype%'), ['SymbolData']);
      obj.SymbolData = argument;
      return obj;
    }
    case 'BigInt': {
      // Return a new BigInt object whose [[BigIntData]] internal slot is set to argument.
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%BigInt.prototype%'), ['BigIntData']);
      obj.BigIntData = argument;
      return obj;
    }
    case 'Object':
      // Return argument.
      return argument;
    default:
      throw new OutOfRange('ToObject', { type, argument });
  }
}

// 7.1.14 #sec-topropertykey
export function ToPropertyKey(argument) {
  // 1. Let key be ? ToPrimitive(argument, string).
  const key = Q(ToPrimitive(argument, 'string'));
  // 2. If Type(key) is Symbol, then
  if (Type(key) === 'Symbol') {
    // a. Return key.
    return key;
  }
  // 3. Return ! ToString(key).
  return X(ToString(key));
}

// 7.1.15 #sec-tolength
export function ToLength(argument) {
  // 1. Let len be ? ToIntegerOrInfinity(argument).
  const len = Q(ToIntegerOrInfinity(argument));
  // 2. If len ≤ 0, return +0𝔽.
  if (len <= 0) {
    return F(+0);
  }
  // 3. Return 𝔽(min(len, 253 - 1)).
  return F(Math.min(len, (2 ** 53) - 1));
}

// 7.1.16 #sec-canonicalnumericindexstring
export function CanonicalNumericIndexString(argument) {
  // 1. Assert: Type(argument) is String.
  Assert(Type(argument) === 'String');
  // 2. If argument is "-0", return -0𝔽.
  if (argument.stringValue() === '-0') {
    return F(-0);
  }
  // 3. Let n be ! ToNumber(argument).
  const n = X(ToNumber(argument));
  // 4. If SameValue(! ToString(n), argument) is false, return undefined.
  if (SameValue(X(ToString(n)), argument) === Value.false) {
    return Value.undefined;
  }
  // 4. Return n.
  return n;
}

// 7.1.17 #sec-toindex
export function ToIndex(value) {
  // 1. If value is undefined, then
  if (Type(value) === 'Undefined') {
    // a. Return 0.
    return 0;
  } else {
    // a. Let integerIndex be 𝔽(? ToIntegerOrInfinity(value)).
    const integerIndex = F(Q(ToIntegerOrInfinity(value)));
    // b. If integerIndex < +0𝔽, throw a RangeError exception.
    if (integerIndex.numberValue() < 0) {
      return surroundingAgent.Throw('RangeError', 'NegativeIndex', 'Index');
    }
    // c. Let index be ! ToLength(integerIndex).
    const index = X(ToLength(integerIndex));
    // d. If ! SameValue(integerIndex, index) is false, throw a RangeError exception.
    if (X(SameValue(integerIndex, index)) === Value.false) {
      return surroundingAgent.Throw('RangeError', 'OutOfRange', 'Index');
    }
    // e. Return ℝ(index).
    return index.numberValue();
  }
}
