// @ts-nocheck
import {
  Type, UndefinedValue, JSStringValue, SymbolValue,
  ObjectValue,
  Value,
  NumberValue,
  BigIntValue,
  wellKnownSymbols,
  NullValue,
  BooleanValue,
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

/** https://tc39.es/ecma262/#sec-toprimitive */
export function ToPrimitive(input, preferredType) {
  // 1. Assert: input is an ECMAScript language value.
  Assert(input instanceof Value);
  // 2. If Type(input) is Object, then
  if (input instanceof ObjectValue) {
    // a. Let exoticToPrim be ? GetMethod(input, @@toPrimitive).
    const exoticToPrim = Q(GetMethod(input, wellKnownSymbols.toPrimitive));
    // b. If exoticToPrim is not undefined, then
    if (exoticToPrim !== Value.undefined) {
      let hint;
      // i. If preferredType is not present, let hint be "default".
      if (preferredType === undefined) {
        hint = Value('default');
      } else if (preferredType === 'string') { // ii. Else if preferredType is string, let hint be "string".
        hint = Value('string');
      } else { // iii. Else,
        // 1. Assert: preferredType is number.
        Assert(preferredType === 'number');
        // 2. Let hint be "number".
        hint = Value('number');
      }
      // iv. Let result be ? Call(exoticToPrim, input, « hint »).
      const result = Q(Call(exoticToPrim, input, [hint]));
      // v. If Type(result) is not Object, return result.
      if (!(result instanceof ObjectValue)) {
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

/** https://tc39.es/ecma262/#sec-ordinarytoprimitive */
export function OrdinaryToPrimitive(O, hint) {
  // 1. Assert: Type(O) is Object.
  Assert(O instanceof ObjectValue);
  // 2. Assert: hint is either string or number.
  Assert(hint === 'string' || hint === 'number');
  let methodNames;
  // 3. If hint is string, then
  if (hint === 'string') {
    // a. Let methodNames be « "toString", "valueOf" ».
    methodNames = [Value('toString'), Value('valueOf')];
  } else { // 4. Else,
    // a. Let methodNames be « "valueOf", "toString" ».
    methodNames = [Value('valueOf'), Value('toString')];
  }
  // 5. For each element name of methodNames, do
  for (const name of methodNames) {
    // a. Let method be ? Get(O, name).
    const method = Q(Get(O, name));
    // b. If IsCallable(method) is true, then
    if (IsCallable(method)) {
      // i. Let result be ? Call(method, O).
      const result = Q(Call(method, O));
      // ii. If Type(result) is not Object, return result.
      if (!(result instanceof ObjectValue)) {
        return result;
      }
    }
  }
  // 6. Throw a TypeError exception.
  return surroundingAgent.Throw('TypeError', 'ObjectToPrimitive');
}

/** https://tc39.es/ecma262/#sec-toboolean */
export function ToBoolean(argument) {
  if (argument instanceof UndefinedValue) {
    // Return false.
    return Value.false;
  } else if (argument instanceof NullValue) {
    // Return false.
    return Value.false;
  } else if (argument instanceof BooleanValue) {
    // Return argument.
    return argument;
  } else if (argument instanceof NumberValue) {
    // If argument is +0𝔽, -0𝔽, or NaN, return false; otherwise return true.
    if (argument.numberValue() === 0 || argument.isNaN()) {
      return Value.false;
    }
    return Value.true;
  } else if (argument instanceof JSStringValue) {
    // If argument is the empty String, return false; otherwise return true.
    if (argument.stringValue().length === 0) {
      return Value.false;
    }
    return Value.true;
  } else if (argument instanceof SymbolValue) {
    // Return true.
    return Value.true;
  } else if (argument instanceof BigIntValue) {
    // If argument is 0ℤ, return false; otherwise return true.
    if (argument.bigintValue() === 0n) {
      return Value.false;
    }
    return Value.true;
  } else if (argument instanceof ObjectValue) {
    // Return true.
    return Value.true;
  }
  throw new OutOfRange('ToBoolean', { type: Type(argument), argument });
}

/** https://tc39.es/ecma262/#sec-tonumeric */
export function ToNumeric(value) {
  // 1. Let primValue be ? ToPrimitive(value, number).
  const primValue = Q(ToPrimitive(value, 'number'));
  // 2. If Type(primValue) is BigInt, return primValue.
  if (primValue instanceof BigIntValue) {
    return primValue;
  }
  // 3. Return ? ToNumber(primValue).
  return Q(ToNumber(primValue));
}

/** https://tc39.es/ecma262/#sec-tonumber */
export function ToNumber(argument) {
  if (argument instanceof UndefinedValue) {
    // Return NaN.
    return F(NaN);
  } else if (argument instanceof NullValue) {
    // Return +0𝔽.
    return F(+0);
  } else if (argument instanceof BooleanValue) {
    // If argument is true, return 1𝔽.
    if (argument === Value.true) {
      return F(1);
    }
    // If argument is false, return +0𝔽.
    return F(+0);
  } else if (argument instanceof NumberValue) {
    // Return argument (no conversion).
    return argument;
  } else if (argument instanceof JSStringValue) {
    return MV_StringNumericLiteral(argument.stringValue());
  } else if (argument instanceof BigIntValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotMixBigInts');
  } else if (argument instanceof SymbolValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'number');
  } else if (argument instanceof ObjectValue) {
    // 1. Let primValue be ? ToPrimitive(argument, number).
    const primValue = Q(ToPrimitive(argument, 'number'));
    // 2. Return ? ToNumber(primValue).
    return Q(ToNumber(primValue));
  }
  throw new OutOfRange('ToNumber', { type: Type(argument), argument });
}

const mod = (n, m) => {
  const r = n % m;
  return Math.floor(r >= 0 ? r : r + m);
};

/** https://tc39.es/ecma262/#sec-tointegerorinfinity */
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

/** https://tc39.es/ecma262/#sec-toint32 */
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

/** https://tc39.es/ecma262/#sec-touint32 */
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

/** https://tc39.es/ecma262/#sec-toint16 */
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

/** https://tc39.es/ecma262/#sec-touint16 */
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

/** https://tc39.es/ecma262/#sec-toint8 */
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

/** https://tc39.es/ecma262/#sec-touint8 */
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

/** https://tc39.es/ecma262/#sec-touint8clamp */
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

/** https://tc39.es/ecma262/#sec-tobigint */
export function ToBigInt(argument) {
  // 1. Let prim be ? ToPrimitive(argument, number).
  const prim = Q(ToPrimitive(argument, 'number'));
  // 2. Return the value that prim corresponds to in Table 12 (#table-tobigint).
  if (prim instanceof UndefinedValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
  } else if (prim instanceof NullValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
  } else if (prim instanceof BooleanValue) {
    // Return 1ℤ if prim is true and 0ℤ if prim is false.
    if (prim === Value.true) {
      return Z(1n);
    }
    return Z(0n);
  } else if (prim instanceof BigIntValue) {
    // Return prim.
    return prim;
  } else if (prim instanceof NumberValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToBigInt', prim);
  } else if (prim instanceof JSStringValue) {
    // 1. Let n be ! StringToBigInt(prim).
    const n = X(StringToBigInt(prim));
    // 2. If n is NaN, throw a SyntaxError exception.
    if (Number.isNaN(n)) {
      return surroundingAgent.Throw('SyntaxError', 'CannotConvertToBigInt', prim);
    }
    // 3. Return n.
    return n;
  } else if (prim instanceof SymbolValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'bigint');
  }
  throw new OutOfRange('ToBigInt', argument);
}

/** https://tc39.es/ecma262/#sec-stringtobigint */
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

/** https://tc39.es/ecma262/#sec-tobigint64 */
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

/** https://tc39.es/ecma262/#sec-tobiguint64 */
export function ToBigUint64(argument) {
  // 1. Let n be ? ToBigInt(argument).
  const n = Q(ToBigInt(argument));
  // 2. Let int64bit be ℝ(n) modulo 2^64.
  const int64bit = n.bigintValue() % (2n ** 64n);
  // 3. Return ℤ(int64bit).
  return Z(int64bit);
}

/** https://tc39.es/ecma262/#sec-tostring */
export function ToString(argument) {
  if (argument instanceof UndefinedValue) {
    // Return "undefined".
    return new JSStringValue('undefined');
  } else if (argument instanceof NullValue) {
    // Return "null".
    return new JSStringValue('null');
  } else if (argument instanceof BooleanValue) {
    // If argument is true, return "true".
    // If argument is false, return "false".
    return new JSStringValue(argument === Value.true ? 'true' : 'false');
  } else if (argument instanceof NumberValue) {
    // Return ! Number::toString(argument).
    return X(NumberValue.toString(argument));
  } else if (argument instanceof JSStringValue) {
    // Return argument.
    return argument;
  } else if (argument instanceof SymbolValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertSymbol', 'string');
  } else if (argument instanceof BigIntValue) {
    // Return ! BigInt::toString(argument).
    return X(BigIntValue.toString(argument));
  } else if (argument instanceof ObjectValue) {
    // 1. Let primValue be ? ToPrimitive(argument, string).
    const primValue = Q(ToPrimitive(argument, 'string'));
    // 2. Return ? ToString(primValue).
    return Q(ToString(primValue));
  }
  throw new OutOfRange('ToString', { type: Type(argument), argument });
}

/** https://tc39.es/ecma262/#sec-toobject */
export function ToObject(argument) {
  if (argument instanceof UndefinedValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'undefined');
  } else if (argument instanceof NullValue) {
    // Throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'null');
  } else if (argument instanceof BooleanValue) {
    // Return a new Boolean object whose [[BooleanData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Boolean.prototype%'), ['BooleanData']);
    obj.BooleanData = argument;
    return obj;
  } else if (argument instanceof NumberValue) {
    // Return a new Number object whose [[NumberData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Number.prototype%'), ['NumberData']);
    obj.NumberData = argument;
    return obj;
  } else if (argument instanceof JSStringValue) {
    // Return a new String object whose [[StringData]] internal slot is set to argument.
    return StringCreate(argument, surroundingAgent.intrinsic('%String.prototype%'));
  } else if (argument instanceof SymbolValue) {
    // Return a new Symbol object whose [[SymbolData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Symbol.prototype%'), ['SymbolData']);
    obj.SymbolData = argument;
    return obj;
  } else if (argument instanceof BigIntValue) {
    // Return a new BigInt object whose [[BigIntData]] internal slot is set to argument.
    const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%BigInt.prototype%'), ['BigIntData']);
    obj.BigIntData = argument;
    return obj;
  } else if (argument instanceof ObjectValue) {
    // Return argument.
    return argument;
  }
  throw new OutOfRange('ToObject', { type: Type(argument), argument });
}

/** https://tc39.es/ecma262/#sec-topropertykey */
export function ToPropertyKey(argument) {
  // 1. Let key be ? ToPrimitive(argument, string).
  const key = Q(ToPrimitive(argument, 'string'));
  // 2. If Type(key) is Symbol, then
  if (key instanceof SymbolValue) {
    // a. Return key.
    return key;
  }
  // 3. Return ! ToString(key).
  return X(ToString(key));
}

/** https://tc39.es/ecma262/#sec-tolength */
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

/** https://tc39.es/ecma262/#sec-canonicalnumericindexstring */
export function CanonicalNumericIndexString(argument) {
  // 1. Assert: Type(argument) is String.
  Assert(argument instanceof JSStringValue);
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

/** https://tc39.es/ecma262/#sec-toindex */
export function ToIndex(value) {
  // 1. If value is undefined, then
  if (value instanceof UndefinedValue) {
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
