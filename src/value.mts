import { type GCMarker, surroundingAgent } from './engine.mjs';
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
  F, R,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord } from './environment.mjs';
import { Completion, X } from './completion.mjs';
import { ValueMap, OutOfRange, callable } from './helpers.mjs';
import type { PrivateElementRecord } from './runtime-semantics/MethodDefinitionEvaluation.mjs';


// @ts-expect-error callable class
export declare function Value(value: string): StringValue; // @ts-expect-error callable class
export declare function Value(value: number): NumberValue; // @ts-expect-error callable class
export declare function Value(value: bigint): BigIntValue; // @ts-expect-error callable class
export declare function Value(value: undefined): UndefinedValue; // @ts-expect-error callable class
export declare function Value(value: null): NullValue; // @ts-expect-error callable class
// TODO(ts): define a FunctionObjectValue type.
export declare function Value(value: (...args: unknown[]) => unknown): ObjectValue; // @ts-expect-error callable class
export declare function Value(value: string | number): StringValue | NumberValue;
/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export @callable((_target, _thisArg, [value]) => {
  if (value === null) {
    return Value.null;
  }
  switch (typeof value) {
    case 'undefined':
      return Value.undefined;
    case 'string':
      return new StringValue(value);
    case 'number':
      return new NumberValue(value);
    case 'bigint':
      return new BigIntValue(value);
    case 'function':
      return CreateBuiltinFunction(value, 0, Value(''), []);
    default:
      throw new OutOfRange('new Value', value);
  }
}) // @ts-expect-error callable class
abstract class Value {
  /** @deprecated Use Value() instead of Value() */
  constructor(value?: never) {
    if (new.target !== Value) {
      return this;
    }
    return Value(value);
  }

  static declare readonly null: NullValue;
  static declare readonly undefined: UndefinedValue;
  static declare readonly true: BooleanValue;
  static declare readonly false: BooleanValue;
}

export class PrimitiveValue extends Value { }
export type PropertyKeyValue = StringValue | SymbolValue;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type */
export class UndefinedValue extends PrimitiveValue { }

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type */
export class NullValue extends PrimitiveValue { }

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type */
export class BooleanValue extends PrimitiveValue {
  readonly boolean: boolean;
  constructor(v: boolean) {
    super();
    this.boolean = v;
  }

  booleanValue() {
    return this.boolean;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Boolean { ${this.boolean} }`;
  }
}

Object.defineProperties(Value, {
  undefined: { value: new UndefinedValue(), configurable: false, writable: false },
  null: { value: new NullValue(), configurable: false, writable: false },
  true: { value: new BooleanValue(true), configurable: false, writable: false },
  false: { value: new BooleanValue(false), configurable: false, writable: false },
});

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type */
class StringValue extends PrimitiveValue {
  readonly string: string;
  constructor(string: string) {
    super();
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}
// rename for static semantics StringValue() conflict
export { StringValue as JSStringValue };

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type */
export class SymbolValue extends PrimitiveValue {
  readonly Description: StringValue;
  constructor(Description: StringValue) {
    super();
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
} as const;
Object.setPrototypeOf(wellKnownSymbols, null);
Object.freeze(wellKnownSymbols);

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type */
export class NumberValue extends PrimitiveValue {
  readonly number: number;
  constructor(number: number) {
    super();
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

  /** https://tc39.es/ecma262/#sec-numeric-types-number-unaryMinus */
  static unaryMinus(x: NumberValue) {
    if (x.isNaN()) {
      return F(NaN);
    }
    return F(-R(x));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseNOT */
  static bitwiseNOT(x: NumberValue) {
    // 1. Let oldValue be ! ToInt32(x).
    const oldValue = X(ToInt32(x));
    // 2. Return the result of applying bitwise complement to oldValue. The result is a signed 32-bit integer.
    return F(~R(oldValue));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate */
  static exponentiate(base: NumberValue, exponent: NumberValue) {
    return F(R(base) ** R(exponent));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-multiply */
  static multiply(x: NumberValue, y: NumberValue) {
    return F(R(x) * R(y));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-divide */
  static divide(x: NumberValue, y: NumberValue) {
    return F(R(x) / R(y));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-remainder */
  static remainder(n: NumberValue, d: NumberValue) {
    return F(R(n) % R(d));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-add */
  static add(x: NumberValue, y: NumberValue) {
    return F(R(x) + R(y));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-subtract */
  static subtract(x: NumberValue, y: NumberValue) {
    // The result of - operator is x + (-y).
    return NumberValue.add(x, F(-R(y)));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-leftShift */
  static leftShift(x: NumberValue, y: NumberValue) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = R(rnum) & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of left shifting lnum by shiftCount bits. The result is a signed 32-bit integer.
    return F(R(lnum) << shiftCount); // eslint-disable-line no-bitwise
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-signedRightShift */
  static signedRightShift(x: NumberValue, y: NumberValue) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = R(rnum) & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of performing a sign-extending right shift of lnum by shiftCount bits.
    //    The most significant bit is propagated. The result is a signed 32-bit integer.
    return F(R(lnum) >> shiftCount); // eslint-disable-line no-bitwise
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-unsignedRightShift */
  static unsignedRightShift(x: NumberValue, y: NumberValue) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = R(rnum) & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of performing a zero-filling right shift of lnum by shiftCount bits.
    //    Vacated bits are filled with zero. The result is an unsigned 32-bit integer.
    return F(R(lnum) >>> shiftCount); // eslint-disable-line no-bitwise
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-lessThan */
  static lessThan(x: NumberValue, y: NumberValue) {
    if (x.isNaN()) {
      return Value.undefined;
    }
    if (y.isNaN()) {
      return Value.undefined;
    }
    // If nx and ny are the same Number value, return false.
    // If nx is +0 and ny is -0, return false.
    // If nx is -0 and ny is +0, return false.
    if (R(x) === R(y)) {
      return Value.false;
    }
    if (R(x) === +Infinity) {
      return Value.false;
    }
    if (R(y) === +Infinity) {
      return Value.true;
    }
    if (R(y) === -Infinity) {
      return Value.false;
    }
    if (R(x) === -Infinity) {
      return Value.true;
    }
    return R(x) < R(y) ? Value.true : Value.false;
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-equal */
  static equal(x: NumberValue, y: NumberValue) {
    if (x.isNaN()) {
      return Value.false;
    }
    if (y.isNaN()) {
      return Value.false;
    }
    const xVal = R(x);
    const yVal = R(y);
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

  /** https://tc39.es/ecma262/#sec-numeric-types-number-sameValue */
  static sameValue(x: NumberValue, y: NumberValue) {
    if (x.isNaN() && y.isNaN()) {
      return Value.true;
    }
    const xVal = R(x);
    const yVal = R(y);
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

  /** https://tc39.es/ecma262/#sec-numeric-types-number-sameValueZero */
  static sameValueZero(x: NumberValue, y: NumberValue) {
    if (x.isNaN() && y.isNaN()) {
      return Value.true;
    }
    const xVal = R(x);
    const yVal = R(y);
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

  /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseAND */
  static bitwiseAND(x: NumberValue, y: NumberValue) {
    // 1. Return NumberBitwiseOp(&, x, y).
    return NumberBitwiseOp('&', x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseXOR */
  static bitwiseXOR(x: NumberValue, y: NumberValue) {
    // 1. Return NumberBitwiseOp(^, x, y).
    return NumberBitwiseOp('^', x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseOR */
  static bitwiseOR(x: NumberValue, y: NumberValue) {
    // 1. Return NumberBitwiseOp(|, x, y).
    return NumberBitwiseOp('|', x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-number-tostring */
  static override toString(x: NumberValue): StringValue {
    if (x.isNaN()) {
      return Value('NaN');
    }
    const xVal = R(x);
    if (xVal === 0) {
      return Value('0');
    }
    if (xVal < 0) {
      const str = X(NumberValue.toString(F(-xVal))).stringValue();
      return Value(`-${str}`);
    }
    if (x.isInfinity()) {
      return Value('Infinity');
    }
    // TODO: implement properly
    return Value(`${xVal}`);
  }

  static readonly unit = new NumberValue(1);
}

/** https://tc39.es/ecma262/#sec-numberbitwiseop */
function NumberBitwiseOp(op: '&' | '|' | '^', x: NumberValue, y: NumberValue) {
  // 1. Let lnum be ! ToInt32(x).
  const lnum = X(ToInt32(x));
  // 2. Let rnum be ! ToUint32(y).
  const rnum = X(ToUint32(y));
  // 3. Return the result of applying the bitwise operator op to lnum and rnum. The result is a signed 32-bit integer.
  switch (op) {
    case '&':
      return F(R(lnum) & R(rnum));
    case '|':
      return F(R(lnum) | R(rnum));
    case '^':
      return F(R(lnum) ^ R(rnum));
    default:
      throw new OutOfRange('NumberBitwiseOp', op);
  }
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-bigint-type */
export class BigIntValue extends PrimitiveValue {
  readonly bigint: bigint;
  constructor(bigint: bigint) {
    super();
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

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-unaryMinus */
  static unaryMinus(x: BigIntValue) {
    if (R(x) === 0n) {
      return Z(0n);
    }
    return Z(-R(x));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseNOT */
  static bitwiseNOT(x: BigIntValue) {
    return Z(-R(x) - 1n);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-exponentiate */
  static exponentiate(base: BigIntValue, exponent: BigIntValue) {
    // 1. If exponent < 0n, throw a RangeError exception.
    if (R(exponent) < 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntNegativeExponent');
    }
    // 2. If base is 0n and exponent is 0n, return 1n.
    if (R(base) === 0n && R(exponent) === 0n) {
      return Z(1n);
    }
    // 3. Return the BigInt value that represents the mathematical value of base raised to the power exponent.
    return Z(R(base) ** R(exponent));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-multiply */
  static multiply(x: BigIntValue, y: BigIntValue) {
    return Z(R(x) * R(y));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-divide */
  static divide(x: BigIntValue, y: BigIntValue) {
    // 1. If y is 0n, throw a RangeError exception.
    if (R(y) === 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntDivideByZero');
    }
    // 2. Let quotient be the mathematical value of x divided by y.
    const quotient = R(x) / R(y);
    // 3. Return the BigInt value that represents quotient rounded towards 0 to the next integral value.
    return Z(quotient);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-remainder */
  static remainder(n: BigIntValue, d: BigIntValue) {
    // 1. If d is 0n, throw a RangeError exception.
    if (R(d) === 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntDivideByZero');
    }
    // 2. If n is 0n, return 0n.
    if (R(n) === 0n) {
      return Z(0n);
    }
    // 3. Let r be the BigInt defined by the mathematical relation r = n - (d × q)
    //   where q is a BigInt that is negative only if n/d is negative and positive
    //   only if n/d is positive, and whose magnitude is as large as possible without
    //   exceeding the magnitude of the true mathematical quotient of n and d.
    const r = Z(R(n) % R(d));
    // 4. Return r.
    return r;
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-add */
  static add(x: BigIntValue, y: BigIntValue) {
    return Z(R(x) + R(y));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-subtract */
  static subtract(x: BigIntValue, y: BigIntValue) {
    return Z(R(x) - R(y));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-leftShift */
  static leftShift(x: BigIntValue, y: BigIntValue) {
    return Z(R(x) << R(y)); // eslint-disable-line no-bitwise
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-signedRightShift */
  static signedRightShift(x: BigIntValue, y: BigIntValue) {
    // 1. Return BigInt::leftShift(x, -y).
    return BigIntValue.leftShift(x, Z(-R(y)));
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-unsignedRightShift */
  static unsignedRightShift(_x: BigIntValue, _y: BigIntValue) {
    return surroundingAgent.Throw('TypeError', 'BigIntUnsignedRightShift');
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-lessThan */
  static lessThan(x: BigIntValue, y: BigIntValue) {
    return R(x) < R(y) ? Value.true : Value.false;
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-equal */
  static equal(x: BigIntValue, y: BigIntValue) {
    // Return true if x and y have the same mathematical integer value and false otherwise.
    return R(x) === R(y) ? Value.true : Value.false;
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-sameValue */
  static sameValue(x: BigIntValue, y: BigIntValue) {
    // 1. Return BigInt::equal(x, y).
    return BigIntValue.equal(x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-sameValueZero */
  static sameValueZero(x: BigIntValue, y: BigIntValue) {
    // 1. Return BigInt::equal(x, y).
    return BigIntValue.equal(x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseAND */
  static bitwiseAND(x: BigIntValue, y: BigIntValue) {
    // 1. Return BigIntBitwiseOp(&, x, y).
    return BigIntBitwiseOp('&', x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseXOR */
  static bitwiseXOR(x: BigIntValue, y: BigIntValue) {
    // 1. Return BigIntBitwiseOp(^, x, y).
    return BigIntBitwiseOp('^', x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-bitwiseOR */
  static bitwiseOR(x: BigIntValue, y: BigIntValue) {
    // 1. Return BigIntBitwiseOp(|, x, y);
    return BigIntBitwiseOp('|', x, y);
  }

  /** https://tc39.es/ecma262/#sec-numeric-types-bigint-tostring */
  static override toString(x: BigIntValue): StringValue {
    // 1. If x is less than zero, return the string-concatenation of the String "-" and ! BigInt::toString(-x).
    if (R(x) < 0n) {
      const str = X(BigIntValue.toString(Z(-R(x)))).stringValue();
      return Value(`-${str}`);
    }
    // 2. Return the String value consisting of the code units of the digits of the decimal representation of x.
    return Value(`${R(x)}`);
  }

  static readonly unit = new BigIntValue(1n);
}

/*
/** https://tc39.es/ecma262/#sec-binaryand */
// function BinaryAnd(x, y) {
//   // 1. Assert: x is 0 or 1.
//   Assert(x === 0n || x === 1n);
//   // 2. Assert: y is 0 or 1.
//   Assert(x === 0n || x === 1n);
//   // 3. If x is 1 and y is 1, return 1.
//   if (x === 1n && y === 1n) {
//     return 1n;
//   } else {
//     // 4. Else, return 0.
//     return 0n;
//   }
// }

/** https://tc39.es/ecma262/#sec-binaryor */
// function BinaryOr(x, y) {
//   // 1. Assert: x is 0 or 1.
//   Assert(x === 0n || x === 1n);
//   // 2. Assert: y is 0 or 1.
//   Assert(x === 0n || x === 1n);
//   // 3. If x is 1 or y is 1, return 1.
//   if (x === 1n || y === 1n) {
//     return 1n;
//   } else {
//     // 4. Else, return 0.
//     return 0n;
//   }
// }

/** https://tc39.es/ecma262/#sec-binaryxor */
// function BinaryXor(x, y) {
//   // 1. Assert: x is 0 or 1.
//   Assert(x === 0n || x === 1n);
//   // 2. Assert: y is 0 or 1.
//   Assert(x === 0n || x === 1n);
//   // 3. If x is 1 and y is 0, return 1.
//   if (x === 1n && y === 0n) {
//     return 1n;
//   } else if (x === 0n && y === 1n) {
//     // Else if x is 0 and y is 1, return 1.
//     return 1n;
//   } else {
//     // 4. Else, return 0.
//     return 0n;
//   }
// }

/** https://tc39.es/ecma262/#sec-bigintbitwiseop */
function BigIntBitwiseOp(op: '&' | '|' | '^', x: BigIntValue, y: BigIntValue) {
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
      return Z(R(x) & R(y));
    case '|':
      return Z(R(x) | R(y));
    case '^':
      return Z(R(x) ^ R(y));
    default:
      throw new OutOfRange('BigIntBitwiseOp', op);
  }
}

/** https://tc39.es/ecma262/#sec-private-names */
export class PrivateName extends Value {
  readonly Description: StringValue;
  constructor(Description: StringValue) {
    super();

    this.Description = Description;
  }
}

/** https://tc39.es/ecma262/#sec-object-type */
export class ObjectValue extends Value {
  readonly properties: ValueMap<StringValue | SymbolValue, Descriptor>;
  readonly internalSlotsList: readonly string[];
  readonly PrivateElements: PrivateElementRecord[];
  constructor(internalSlotsList: readonly string[]) {
    super();

    this.PrivateElements = [];
    this.properties = new ValueMap();
    this.internalSlotsList = internalSlotsList;
  }

  GetPrototypeOf() {
    return OrdinaryGetPrototypeOf(this);
  }

  SetPrototypeOf(V: Value) {
    return OrdinarySetPrototypeOf(this, V);
  }

  IsExtensible() {
    return OrdinaryIsExtensible(this);
  }

  PreventExtensions() {
    return OrdinaryPreventExtensions(this);
  }

  GetOwnProperty(P: PropertyKeyValue) {
    return OrdinaryGetOwnProperty(this, P);
  }

  DefineOwnProperty(P: PropertyKeyValue, Desc: Descriptor) {
    return OrdinaryDefineOwnProperty(this, P, Desc);
  }

  HasProperty(P: PropertyKeyValue) {
    return OrdinaryHasProperty(this, P);
  }

  Get(P: PropertyKeyValue, Receiver: Value) {
    return OrdinaryGet(this, P, Receiver);
  }

  Set(P: PropertyKeyValue, V: Value, Receiver: Value) {
    return OrdinarySet(this, P, V, Receiver);
  }

  Delete(P: PropertyKeyValue) {
    return OrdinaryDelete(this, P);
  }

  OwnPropertyKeys() {
    return OrdinaryOwnPropertyKeys(this);
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.properties);
    this.internalSlotsList.forEach((s) => {
      // @ts-ignore
      m(this[s]);
    });
  }
}

export class ReferenceRecord {
  Base: 'unresolvable' | Value;
  ReferencedName: StringValue | SymbolValue | PrivateName;
  Strict: BooleanValue;
  ThisValue: ObjectValue | undefined;
  constructor({
    Base,
    ReferencedName,
    Strict,
    ThisValue,
  }: Pick<ReferenceRecord, 'Base' | 'ReferencedName' | 'Strict' | 'ThisValue'>) {
    this.Base = Base;
    this.ReferencedName = ReferencedName;
    this.Strict = Strict;
    this.ThisValue = ThisValue;
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Base);
    m(this.ReferencedName);
    m(this.ThisValue);
  }
}

// @ts-expect-error
export function Descriptor(O: Pick<Descriptor, 'Configurable' | 'Enumerable' | 'Get' | 'Set' | 'Value' | 'Writable'>): Descriptor // @ts-expect-error
export @callable() class Descriptor {
  readonly Value?: Value;
  // TODO(ts): should be FunctionObjectValue
  readonly Get?: ObjectValue;
  // TODO(ts): should be FunctionObjectValue
  readonly Set?: ObjectValue;
  readonly Writable?: BooleanValue;
  readonly Enumerable?: BooleanValue;
  readonly Configurable?: BooleanValue;
  constructor(O: Pick<Descriptor, 'Configurable' | 'Enumerable' | 'Get' | 'Set' | 'Value' | 'Writable'>) {
    this.Value = O.Value;
    this.Get = O.Get;
    this.Set = O.Set;
    this.Writable = O.Writable;
    this.Enumerable = O.Enumerable;
    this.Configurable = O.Configurable;
  }

  everyFieldIsAbsent() {
    return this.Value === undefined
          && this.Get === undefined
          && this.Set === undefined
          && this.Writable === undefined
          && this.Enumerable === undefined
          && this.Configurable === undefined;
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Value);
    m(this.Get);
    m(this.Set);
  }
}

export class DataBlock extends Uint8Array {
  constructor(sizeOrBuffer: number | ArrayBuffer, byteOffset?: number, length?: number) {
    if (sizeOrBuffer instanceof ArrayBuffer) {
      super(sizeOrBuffer, byteOffset, length);
    } else {
      Assert(typeof sizeOrBuffer === 'number');
      super(sizeOrBuffer);
    }
  }
}

export function Type(val: Value) {
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

// Used for Type(x)::y
export function TypeForMethod(val: Value) {
  if (val instanceof Value) {
    return val.constructor;
  }
  throw new OutOfRange('TypeForValue', val);
}
