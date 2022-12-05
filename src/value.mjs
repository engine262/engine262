// @ts-check
import { surroundingAgent } from './engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  OrdinaryDefineOwnProperty,
  OrdinaryDelete,
  OrdinaryGet,
  OrdinaryGetOwnProperty,
  OrdinaryGetPrototypeOf,
  OrdinaryHasProperty,
  OrdinaryIsExtensible,
  OrdinaryOwnPropertyKeys,
  OrdinaryPreventExtensions,
  OrdinarySet,
  OrdinarySetPrototypeOf,
  ToInt32,
  ToUint32,
  Z,
  F,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord } from './environment.mjs';
import { Completion, X } from './completion.mjs';
import { ValueMap, OutOfRange } from './helpers.mjs';
import { PrivateElementRecord } from './api.mjs';

// #sec-ecmascript-language-types
export class Value {
  /**
   * @param {undefined | Value | string | number | bigint | ((...args: any[]) => any)} value
   */
  constructor(value = undefined) {
    if (new.target !== Value) {
      return this;
    }

    switch (typeof value) {
      case 'string':
        return new StringValue(value);
      case 'number':
        return new NumberValue(value);
      case 'bigint':
        return new BigIntValue(value);
      case 'function':
        return CreateBuiltinFunction(value, 0, new Value(''), []);
      default:
        throw new OutOfRange('new Value', value);
    }
  }
}

export class PrimitiveValue extends Value {}

// #sec-ecmascript-language-types-undefined-type
export class UndefinedValue extends PrimitiveValue {}

// #sec-ecmascript-language-types-null-type
export class NullValue extends PrimitiveValue {}

// #sec-ecmascript-language-types-boolean-type
export class BooleanValue extends PrimitiveValue {
  /**
   * @param {boolean} v
   */
  constructor(v) {
    super();
    /**
     * @type {boolean}
     * @readonly
     */
    this.boolean = v;
  }

  booleanValue() {
    return this.boolean;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Boolean { ${this.boolean} }`;
  }
}

Value.undefined = new UndefinedValue();
Value.null = new NullValue();
Value.true = new BooleanValue(true);
Value.false = new BooleanValue(false);
Object.freeze(Value);

// #sec-ecmascript-language-types-string-type
class StringValue extends PrimitiveValue {
  /**
   * @param {string} string
   */
  constructor(string) {
    super();
    /**
     * @type {string}
     * @readonly
     */
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}
// rename for static semantics StringValue() conflict
export { StringValue as JSStringValue };

// #sec-ecmascript-language-types-symbol-type
export class SymbolValue extends PrimitiveValue {
  /**
   * @param {StringValue} Description
   */
  constructor(Description) {
    super();
    /**
     * @type {StringValue}
     * @readonly
     */
    this.Description = Description;
  }
}

export const wellKnownSymbols = {
  asyncIterator: new SymbolValue(new StringValue('Symbol.asyncIterator')),
  hasInstance: new SymbolValue(new StringValue('Symbol.hasInstance')),
  isConcatSpreadable: new SymbolValue(new StringValue('Symbol.isConcatSpreadable')),
  iterator: new SymbolValue(new StringValue('Symbol.iterator')),
  match: new SymbolValue(new StringValue('Symbol.match')),
  matchAll: new SymbolValue(new StringValue('Symbol.matchAll')),
  replace: new SymbolValue(new StringValue('Symbol.replace')),
  search: new SymbolValue(new StringValue('Symbol.search')),
  species: new SymbolValue(new StringValue('Symbol.species')),
  split: new SymbolValue(new StringValue('Symbol.split')),
  toPrimitive: new SymbolValue(new StringValue('Symbol.toPrimitive')),
  toStringTag: new SymbolValue(new StringValue('Symbol.toStringTag')),
  unscopables: new SymbolValue(new StringValue('Symbol.unscopables')),
}
Object.setPrototypeOf(wellKnownSymbols, null);
Object.freeze(wellKnownSymbols);

// #sec-ecmascript-language-types-number-type
export class NumberValue extends PrimitiveValue {
  /**
   * @param {number} number
   */
  constructor(number) {
    super();
    /**
     * @type {number}
     * @readonly
     */
    this.number = number;
  }

  numberValue() {
    return this.number;
  }

  isNaN() {
    return Number.isNaN(this.number);
  }

  isInfinity() {
    return !Number.isFinite(this.number) && !this.isNaN();
  }

  isFinite() {
    return Number.isFinite(this.number);
  }

  /**
   * #sec-numeric-types-number-unaryMinus
   * @param {NumberValue} x
   */
  static unaryMinus(x) {
    if (x.isNaN()) {
      return F(NaN);
    }
    return F(-x.numberValue());
  }

  /**
   * #sec-numeric-types-number-bitwiseNOT
   * @param {NumberValue} x
   */
  static bitwiseNOT(x) {
    // 1. Let oldValue be ! ToInt32(x).
    const oldValue = X(ToInt32(x));
    // 2. Return the result of applying bitwise complement to oldValue. The result is a signed 32-bit integer.
    return F(~oldValue.numberValue());
  }

  /**
   * #sec-numeric-types-number-exponentiate
   * @param {NumberValue} base
   * @param {NumberValue} exponent
   */
  static exponentiate(base, exponent) {
    return F(base.numberValue() ** exponent.numberValue());
  }

  /**
   * #sec-numeric-types-number-multiply
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static multiply(x, y) {
    return F(x.numberValue() * y.numberValue());
  }

  /**
   * #sec-numeric-types-number-divide
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static divide(x, y) {
    return F(x.numberValue() / y.numberValue());
  }

  /**
   * #sec-numeric-types-number-remainder
   * @param {NumberValue} n
   * @param {NumberValue} d
   */
  static remainder(n, d) {
    return F(n.numberValue() % d.numberValue());
  }

  /**
   * #sec-numeric-types-number-add
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static add(x, y) {
    return F(x.numberValue() + y.numberValue());
  }

  /**
   * #sec-numeric-types-number-subtract
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static subtract(x, y) {
    // The result of - operator is x + (-y).
    return NumberValue.add(x, F(-y.numberValue()));
  }

  /**
   * #sec-numeric-types-number-leftShift
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static leftShift(x, y) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = rnum.numberValue() & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of left shifting lnum by shiftCount bits. The result is a signed 32-bit integer.
    return F(lnum.numberValue() << shiftCount); // eslint-disable-line no-bitwise
  }

  /**
   * #sec-numeric-types-number-signedRightShift
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static signedRightShift(x, y) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = rnum.numberValue() & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of performing a sign-extending right shift of lnum by shiftCount bits.
    //    The most significant bit is propagated. The result is a signed 32-bit integer.
    return F(lnum.numberValue() >> shiftCount); // eslint-disable-line no-bitwise
  }

  /**
   * #sec-numeric-types-number-unsignedRightShift
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static unsignedRightShift(x, y) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = rnum.numberValue() & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of performing a zero-filling right shift of lnum by shiftCount bits.
    //    Vacated bits are filled with zero. The result is an unsigned 32-bit integer.
    return F(lnum.numberValue() >>> shiftCount); // eslint-disable-line no-bitwise
  }

  /**
   * #sec-numeric-types-number-lessThan
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static lessThan(x, y) {
    if (x.isNaN()) {
      return Value.undefined;
    }
    if (y.isNaN()) {
      return Value.undefined;
    }
    // If nx and ny are the same Number value, return false.
    // If nx is +0 and ny is -0, return false.
    // If nx is -0 and ny is +0, return false.
    if (x.numberValue() === y.numberValue()) {
      return Value.false;
    }
    if (x.numberValue() === +Infinity) {
      return Value.false;
    }
    if (y.numberValue() === +Infinity) {
      return Value.true;
    }
    if (y.numberValue() === -Infinity) {
      return Value.false;
    }
    if (x.numberValue() === -Infinity) {
      return Value.true;
    }
    return x.numberValue() < y.numberValue() ? Value.true : Value.false;
  }

  /**
   * #sec-numeric-types-number-equal
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static equal(x, y) {
    if (x.isNaN()) {
      return Value.false;
    }
    if (y.isNaN()) {
      return Value.false;
    }
    const xVal = x.numberValue();
    const yVal = y.numberValue();
    if (xVal === yVal) {
      return Value.true;
    }
    if (Object.is(xVal, 0) && Object.is(yVal, -0)) {
      return Value.true;
    }
    if (Object.is(xVal, -0) && Object.is(yVal, 0)) {
      return Value.true;
    }
    return Value.false;
  }

  /**
   * #sec-numeric-types-number-sameValue
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static sameValue(x, y) {
    if (x.isNaN() && y.isNaN()) {
      return Value.true;
    }
    const xVal = x.numberValue();
    const yVal = y.numberValue();
    if (Object.is(xVal, 0) && Object.is(yVal, -0)) {
      return Value.false;
    }
    if (Object.is(xVal, -0) && Object.is(yVal, 0)) {
      return Value.false;
    }
    if (xVal === yVal) {
      return Value.true;
    }
    return Value.false;
  }

  /**
   * #sec-numeric-types-number-sameValueZero
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static sameValueZero(x, y) {
    if (x.isNaN() && y.isNaN()) {
      return Value.true;
    }
    const xVal = x.numberValue();
    const yVal = y.numberValue();
    if (Object.is(xVal, 0) && Object.is(yVal, -0)) {
      return Value.true;
    }
    if (Object.is(xVal, -0) && Object.is(yVal, 0)) {
      return Value.true;
    }
    if (xVal === yVal) {
      return Value.true;
    }
    return Value.false;
  }

  /**
   * #sec-numeric-types-number-bitwiseAND
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static bitwiseAND(x, y) {
    // 1. Return NumberBitwiseOp(&, x, y).
    return NumberBitwiseOp('&', x, y);
  }

  /**
   * #sec-numeric-types-number-bitwiseXOR
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static bitwiseXOR(x, y) {
    // 1. Return NumberBitwiseOp(^, x, y).
    return NumberBitwiseOp('^', x, y);
  }

  /**
   * #sec-numeric-types-number-bitwiseOR
   * @param {NumberValue} x
   * @param {NumberValue} y
   */
  static bitwiseOR(x, y) {
    // 1. Return NumberBitwiseOp(|, x, y).
    return NumberBitwiseOp('|', x, y);
  }

  /**
   * #sec-numeric-types-number-tostring
   * @override
   * @param {NumberValue} x
   * @returns {StringValue}
   */
  static toString(x) {
    if (x.isNaN()) {
      return new StringValue('NaN');
    }
    const xVal = x.numberValue();
    if (xVal === 0) {
      return new StringValue('0');
    }
    if (xVal < 0) {
      const str = X(NumberValue.toString(F(-xVal))).stringValue();
      return new StringValue(`-${str}`);
    }
    if (x.isInfinity()) {
      return new StringValue('Infinity');
    }
    // TODO: implement properly
    return new StringValue(`${xVal}`);
  }
}

NumberValue.unit = new NumberValue(1);

/**
 * #sec-numberbitwiseop
 * @param {BitwiseOp} op
 * @param {NumberValue} x
 * @param {NumberValue} y
 * @returns
 */
function NumberBitwiseOp(op, x, y) {
  // 1. Let lnum be ! ToInt32(x).
  const lnum = X(ToInt32(x));
  // 2. Let rnum be ! ToUint32(y).
  const rnum = X(ToUint32(y));
  // 3. Return the result of applying the bitwise operator op to lnum and rnum. The result is a signed 32-bit integer.
  switch (op) {
    case '&':
      return F(lnum.numberValue() & rnum.numberValue());
    case '|':
      return F(lnum.numberValue() | rnum.numberValue());
    case '^':
      return F(lnum.numberValue() ^ rnum.numberValue());
    default:
      throw new OutOfRange('NumberBitwiseOp', op);
  }
}

// #sec-ecmascript-language-types-bigint-type
export class BigIntValue extends PrimitiveValue {
  /**
   * @param {bigint} bigint
   */
  constructor(bigint) {
    super();
    /**
     * @type {bigint}
     * @readonly
     */
    this.bigint = bigint;
  }

  bigintValue() {
    return this.bigint;
  }

  isNaN() {
    return false;
  }

  isFinite() {
    return true;
  }

  /**
   * #sec-numeric-types-bigint-unaryMinus
   * @param {BigIntValue} x
   */
  static unaryMinus(/** @type {BigIntValue} */ x) {
    if (x.bigintValue() === 0n) {
      return Z(0n);
    }
    return Z(-x.bigintValue());
  }

  /**
   * #sec-numeric-types-bigint-bitwiseNOT
   * @param {BigIntValue} x
   */
  static bitwiseNOT(/** @type {BigIntValue} */ x) {
    return Z(-x.bigintValue() - 1n);
  }

  /**
   * #sec-numeric-types-bigint-exponentiate
   * @param {BigIntValue} base
   * @param {BigIntValue} exponent
   */
  static exponentiate(base, exponent) {
    // 1. If exponent < 0n, throw a RangeError exception.
    if (exponent.bigintValue() < 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntNegativeExponent');
    }
    // 2. If base is 0n and exponent is 0n, return 1n.
    if (base.bigintValue() === 0n && exponent.bigintValue() === 0n) {
      return Z(1n);
    }
    // 3. Return the BigInt value that represents the mathematical value of base raised to the power exponent.
    return Z(base.bigintValue() ** exponent.bigintValue());
  }

  /**
   * #sec-numeric-types-bigint-multiply
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static multiply(x, y) {
    return Z(x.bigintValue() * y.bigintValue());
  }

  /**
   * #sec-numeric-types-bigint-divide
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static divide(x, y) {
    // 1. If y is 0n, throw a RangeError exception.
    if (y.bigintValue() === 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntDivideByZero');
    }
    // 2. Let quotient be the mathematical value of x divided by y.
    const quotient = x.bigintValue() / y.bigintValue();
    // 3. Return the BigInt value that represents quotient rounded towards 0 to the next integral value.
    return Z(quotient);
  }

  /**
   * #sec-numeric-types-bigint-remainder
   * @param {BigIntValue} n
   * @param {BigIntValue} d
   */
  static remainder(/** @type {BigIntValue} */ n, /** @type {BigIntValue} */ d) {
    // 1. If d is 0n, throw a RangeError exception.
    if (d.bigintValue() === 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntDivideByZero');
    }
    // 2. If n is 0n, return 0n.
    if (n.bigintValue() === 0n) {
      return Z(0n);
    }
    // 3. Let r be the BigInt defined by the mathematical relation r = n - (d × q)
    //   where q is a BigInt that is negative only if n/d is negative and positive
    //   only if n/d is positive, and whose magnitude is as large as possible without
    //   exceeding the magnitude of the true mathematical quotient of n and d.
    const r = Z(n.bigintValue() % d.bigintValue());
    // 4. Return r.
    return r;
  }

  /**
   * #sec-numeric-types-bigint-add
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static add(x, y) {
    return Z(x.bigintValue() + y.bigintValue());
  }

  /**
   * #sec-numeric-types-bigint-subtract
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static subtract(x, y) {
    return Z(x.bigintValue() - y.bigintValue());
  }

  /**
   * #sec-numeric-types-bigint-leftShift
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static leftShift(x, y) {
    return Z(x.bigintValue() << y.bigintValue()); // eslint-disable-line no-bitwise
  }

  /**
   * #sec-numeric-types-bigint-signedRightShift
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static signedRightShift(x, y) {
    // 1. Return BigInt::leftShift(x, -y).
    return BigIntValue.leftShift(x, Z(-y.bigintValue()));
  }

  // #sec-numeric-types-bigint-unsignedRightShift
  /**
   * #sec-numeric-types-bigint-unsignedRightShift
   * @param {BigIntValue} _x
   * @param {BigIntValue} _y
   */
  static unsignedRightShift(_x, _y) {
    return surroundingAgent.Throw('TypeError', 'BigIntUnsignedRightShift');
  }

  /**
   * #sec-numeric-types-bigint-lessThan
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static lessThan(x, y) {
    return x.bigintValue() < y.bigintValue() ? Value.true : Value.false;
  }

  /**
   * #sec-numeric-types-bigint-equal
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static equal(x, y) {
    // Return true if x and y have the same mathematical integer value and false otherwise.
    return x.bigintValue() === y.bigintValue() ? Value.true : Value.false;
  }

  /**
   * #sec-numeric-types-bigint-sameValue
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static sameValue(x, y) {
    // 1. Return BigInt::equal(x, y).
    return BigIntValue.equal(x, y);
  }

  /**
   * #sec-numeric-types-bigint-sameValueZero
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static sameValueZero(x, y) {
    // 1. Return BigInt::equal(x, y).
    return BigIntValue.equal(x, y);
  }

  /**
   * #sec-numeric-types-bigint-bitwiseAND
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static bitwiseAND(x, y) {
    // 1. Return BigIntBitwiseOp(&, x, y).
    return BigIntBitwiseOp('&', x, y);
  }

  /**
   * #sec-numeric-types-bigint-bitwiseXOR
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static bitwiseXOR(x, y) {
    // 1. Return BigIntBitwiseOp(^, x, y).
    return BigIntBitwiseOp('^', x, y);
  }

  /**
   * #sec-numeric-types-bigint-bitwiseOR
   * @param {BigIntValue} x
   * @param {BigIntValue} y
   */
  static bitwiseOR(x, y) {
    // 1. Return BigIntBitwiseOp(|, x, y);
    return BigIntBitwiseOp('|', x, y);
  }

  /**
   * #sec-numeric-types-bigint-tostring
   * @override
   * @param {BigIntValue} x
   * @returns {StringValue}
   */
  static toString(x) {
    // 1. If x is less than zero, return the string-concatenation of the String "-" and ! BigInt::toString(-x).
    if (x.bigintValue() < 0n) {
      const str = X(BigIntValue.toString(Z(-x.bigintValue()))).stringValue();
      return new StringValue(`-${str}`);
    }
    // 2. Return the String value consisting of the code units of the digits of the decimal representation of x.
    return new StringValue(`${x.bigintValue()}`);
  }
}

BigIntValue.unit = new BigIntValue(1n);

/**
 * @typedef {'&' | '|' | '^'} BitwiseOp
 */

/*
// #sec-binaryand
function BinaryAnd(x, y) {
  // 1. Assert: x is 0 or 1.
  Assert(x === 0n || x === 1n);
  // 2. Assert: y is 0 or 1.
  Assert(x === 0n || x === 1n);
  // 3. If x is 1 and y is 1, return 1.
  if (x === 1n && y === 1n) {
    return 1n;
  } else {
    // 4. Else, return 0.
    return 0n;
  }
}

// #sec-binaryor
function BinaryOr(x, y) {
  // 1. Assert: x is 0 or 1.
  Assert(x === 0n || x === 1n);
  // 2. Assert: y is 0 or 1.
  Assert(x === 0n || x === 1n);
  // 3. If x is 1 or y is 1, return 1.
  if (x === 1n || y === 1n) {
    return 1n;
  } else {
    // 4. Else, return 0.
    return 0n;
  }
}

// #sec-binaryxor
function BinaryXor(x, y) {
  // 1. Assert: x is 0 or 1.
  Assert(x === 0n || x === 1n);
  // 2. Assert: y is 0 or 1.
  Assert(x === 0n || x === 1n);
  // 3. If x is 1 and y is 0, return 1.
  if (x === 1n && y === 0n) {
    return 1n;
  } else if (x === 0n && y === 1n) {
    // Else if x is 0 and y is 1, return 1.
    return 1n;
  } else {
    // 4. Else, return 0.
    return 0n;
  }
}
*/

/**
 * #sec-bigintbitwiseop
 * @param {BitwiseOp} op
 * @param {BigIntValue} x
 * @param {BigIntValue} y
 */
function BigIntBitwiseOp(op, x, y) {
  // TODO: figure out why this doesn't work, probably the modulo.
  /*
  // 1. Assert: op is "&", "|", or "^".
  Assert(['&', '|', '^'].includes(op));
  // 2. Let result be 0n.
  let result = 0n;
  // 3. Let shift be 0.
  let shift = 0n;
  // 4. Repeat, until (x = 0 or x = -1) and (y = 0 or y = -1),
  while (!((x === 0n || x === -1n) && (y === 0n || y === -1n))) {
    // a. Let xDigit be x modulo 2.
    const xDigit = x % 2n;
    // b. Let yDigit be y modulo 2.
    const yDigit = y % 2n;
    // c. If op is "&", set result to result + 2^shift × BinaryAnd(xDigit, yDigit).
    if (op === '&') {
      result += (2n ** shift) * BinaryAnd(xDigit, yDigit);
    } else if (op === '|') {
      // d. Else if op is "|", set result to result + 2shift × BinaryOr(xDigit, yDigit).
      result += (2n ** shift) * BinaryXor(xDigit, yDigit);
    } else {
      // i. Assert: op is "^".
      Assert(op === '^');
      // ii. Set result to result + 2^shift × BinaryXor(xDigit, yDigit).
      result += (2n ** shift) * BinaryXor(xDigit, yDigit);
    }
    // f. Set shift to shift + 1.
    shift += 1n;
    // g. Set x to (x - xDigit) / 2.
    x = (x - xDigit) / 2n;
    // h. Set y to (y - yDigit) / 2.
    y = (y - yDigit) / 2n;
  }
  let tmp;
  // 5. If op is "&", let tmp be BinaryAnd(x modulo 2, y modulo 2).
  if (op === '&') {
    tmp = BinaryAnd(x % 2n, y % 2n);
  } else if (op === '|') {
    // 6. Else if op is "|", let tmp be BinaryOr(x modulo 2, y modulo 2).
    tmp = BinaryOr(x % 2n, y % 2n);
  } else {
    // a. Assert: op is "^".
    Assert(op === '^');
    // b. Let tmp be BinaryXor(x modulo 2, y modulo 2).
    tmp = BinaryXor(x % 2n, y % 2n);
  }
  // 8. If tmp ≠ 0, then
  if (tmp !== 0n) {
    // a. Set result to result - 2^shift. NOTE: This extends the sign.
    result -= 2n ** shift;
  }
  // 9. Return result.
  return Z(result);
  */
  switch (op) {
    case '&':
      return Z(x.bigintValue() & y.bigintValue());
    case '|':
      return Z(x.bigintValue() | y.bigintValue());
    case '^':
      return Z(x.bigintValue() ^ y.bigintValue());
    default:
      throw new OutOfRange('BigIntBitwiseOp', op);
  }
}

// #sec-private-names
export class PrivateName extends Value {
  /**
   * @param {StringValue} Description
   */
  constructor(Description) {
    super();

    /**
     * @type {StringValue}
     * @readonly
     */
    this.Description = Description;
  }
}

// #sec-object-type
export class ObjectValue extends Value {
  /**
   * @param {readonly string[]} internalSlotsList
   */
  constructor(internalSlotsList) {
    super();

    /**
     * @type {PrivateElementRecord[]}
     * @readonly
     */
    this.PrivateElements = [];
    /**
     * @type {ValueMap}
     * @readonly
     */
    this.properties = new ValueMap();
    /**
     * @type {readonly string[]}
     * @readonly
     */
    this.internalSlotsList = internalSlotsList;
  }

  GetPrototypeOf() {
    return OrdinaryGetPrototypeOf(this);
  }

  /**
   * @param {Value} V
   */
  SetPrototypeOf(V) {
    return OrdinarySetPrototypeOf(this, V);
  }

  IsExtensible() {
    return OrdinaryIsExtensible(this);
  }

  PreventExtensions() {
    return OrdinaryPreventExtensions(this);
  }

  /**
   * @param {PropertyKeyValue} P
   */
  GetOwnProperty(P) {
    return OrdinaryGetOwnProperty(this, P);
  }

  /**
   * @param {PropertyKeyValue} P
   * @param {Descriptor} Desc
   */
  DefineOwnProperty(P, Desc) {
    return OrdinaryDefineOwnProperty(this, P, Desc);
  }

  HasProperty(/** @type {PropertyKeyValue} */ P) {
    return OrdinaryHasProperty(this, P);
  }

  /**
   * @param {PropertyKeyValue} P
   * @param {Value} Receiver
   */
  Get(P, Receiver) {
    return OrdinaryGet(this, P, Receiver);
  }

  /**
   * @param {PropertyKeyValue} P
   * @param {Value} V
   * @param {Value} Receiver
   */
  Set(P, V, Receiver) {
    return OrdinarySet(this, P, V, Receiver);
  }

  /**
   * @param {PropertyKeyValue} P
   */
  Delete(P) {
    return OrdinaryDelete(this, P);
  }

  OwnPropertyKeys() {
    return OrdinaryOwnPropertyKeys(this);
  }

  /**
   * NON-SPEC
   * @param {import('./api.mjs').GCMarkCallback} m
   */
  mark(m) {
    m(this.properties);
    this.internalSlotsList.forEach((s) => {
      // @ts-expect-error
      m(this[s]);
    });
  }
}

export class ReferenceRecord {
  /**
   * @param {object} record
   * @param {Value | EnvironmentRecord | 'unresolvable'} record.Base
   * @param {StringValue | SymbolValue | PrivateName} record.ReferencedName
   * @param {boolean} record.Strict
   * @param {Value=} record.ThisValue
   */
  constructor({
    Base,
    ReferencedName,
    Strict,
    ThisValue,
  }) {
    /**
     * @type {Value | EnvironmentRecord | 'unresolvable'}
     * @readonly
     */
    this.Base = Base;
    /**
     * @type {StringValue | SymbolValue | PrivateName}
     * @readonly
     */
    this.ReferencedName = ReferencedName;
    /**
     * @type {boolean}
     * @readonly
     */
    this.Strict = Strict;
    /**
     * @type {Value=}
     * @readonly
     */
    this.ThisValue = ThisValue;
  }

  /**
   * NON-SPEC
   * @param {import('./api.mjs').GCMarkCallback} m
   */
  mark(m) {
    m(this.Base);
    m(this.ReferencedName);
    m(this.ThisValue);
  }
}

/**
 * @param {Omit<Descriptor, 'everyFieldIsAbsent' | 'mark'>} O
 */
export function Descriptor(O) {
  if (new.target === undefined) {
    return new Descriptor(O);
  }

  /**
   * @type {Value=}
   * @readonly
   */
  this.Value = O.Value;
  /**
   * @type {ObjectValue=}
   * @readonly
   */
  this.Get = O.Get;
  /**
   * @type {ObjectValue=}
   * @readonly
   */
  this.Set = O.Set;
  /**
   * @type {BooleanValue=}
   * @readonly
   */
  this.Writable = O.Writable;
  /**
   * @type {BooleanValue=}
   * @readonly
   */
  this.Enumerable = O.Enumerable;
  /**
   * @type {BooleanValue=}
   * @readonly
   */
  this.Configurable = O.Configurable;
  return this;
}

Descriptor.prototype.everyFieldIsAbsent = function everyFieldIsAbsent() {
  return this.Value === undefined
    && this.Get === undefined
    && this.Set === undefined
    && this.Writable === undefined
    && this.Enumerable === undefined
    && this.Configurable === undefined;
};

/**
 * NON-SPEC
 * @param {import('./api.mjs').GCMarkCallback} m
 */
Descriptor.prototype.mark = function mark(m) {
  m(this.Value);
  m(this.Get);
  m(this.Set);
};

export class DataBlock extends Uint8Array {
  /**
   * @param {number | ArrayBuffer} sizeOrBuffer
   */
  constructor(sizeOrBuffer) {
    if (sizeOrBuffer instanceof ArrayBuffer) {
      super(sizeOrBuffer);
    } else {
      Assert(typeof sizeOrBuffer === 'number');
      super(sizeOrBuffer);
    }
  }
}

/**
 * @typedef {'Undefined' | 'Null' | 'Boolean' | 'String' | 'Symbol' | 'Number' | 'Object' | 'BigInt' | 'PrivateName' | 'Completion' | 'EnvironmentRecord' | 'Descriptor' | 'Data Block'} Type
 */

/**
 * @param {Value} val
 * @returns {Type}
 */
export function Type(val) {
  if (val instanceof UndefinedValue) {
    return 'Undefined';
  }

  if (val instanceof NullValue) {
    return 'Null';
  }

  if (val instanceof BooleanValue) {
    return 'Boolean';
  }

  if (val instanceof StringValue) {
    return 'String';
  }

  if (val instanceof NumberValue) {
    return 'Number';
  }

  if (val instanceof BigIntValue) {
    return 'BigInt';
  }

  if (val instanceof SymbolValue) {
    return 'Symbol';
  }

  if (val instanceof ObjectValue) {
    return 'Object';
  }

  if (val instanceof PrivateName) {
    return 'PrivateName';
  }

  if (val instanceof Completion) {
    return 'Completion';
  }

  if (val instanceof EnvironmentRecord) {
    return 'EnvironmentRecord';
  }

  if (val instanceof Descriptor) {
    return 'Descriptor';
  }

  if (val instanceof DataBlock) {
    return 'Data Block';
  }

  throw new OutOfRange('Type', val);
}

/**
 * Used for Type(x)::y
 * @param {NumberValue | BigIntValue} val
 * @returns {{
 *  sameValue(a: Value, b: Value): BooleanValue
 *  sameValueZero(a: Value, b: Value): BooleanValue
 *  lessThan(a: Value, b: Value): BooleanValue
 *  equal(a: Value, b: Value): BooleanValue
 * }}
 */
export function TypeForMethod(val) {
  if (val instanceof Value) {
    return /** @type {any} */ (val.constructor);
  }
  throw new OutOfRange('TypeForValue', val);
}

/**
 * @typedef PropertyKeyValue
 * @type {StringValue | SymbolValue}
 */
