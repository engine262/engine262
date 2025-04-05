import { type GCMarker, surroundingAgent } from './host-defined/engine.mts';
import {
  Assert,
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
  F, R, type OrdinaryObject, type FunctionObject,
  type BuiltinFunctionObject,
} from './abstract-ops/all.mts';
import { EnvironmentRecord } from './environment.mts';
import {
  Q, X, type ValueEvaluator, type PlainCompletion,
} from './completion.mts';
import {
  PropertyKeyMap, OutOfRange, callable,
} from './helpers.mts';
import type { PrivateElementRecord } from './runtime-semantics/MethodDefinitionEvaluation.mts';
import type { PlainEvaluator } from './evaluator.mts';

let createStringValue: (value: string) => JSStringValue; // set by static block in StringValue for privileged access to constructor
let createNumberValue: (value: number) => NumberValue; // set by static block in NumberValue for privileged access to constructor
let createBigIntValue: (value: bigint) => BigIntValue; // set by static block in BigIntValue for privileged access to constructor

abstract class BaseValue {
  static declare readonly null: NullValue; // defined in static block of NullValue

  static declare readonly undefined: UndefinedValue; // defined in static block of UndefinedValue

  static declare readonly true: BooleanValue<true>; // defined in static block of BooleanValue

  static declare readonly false: BooleanValue<false>; // defined in static block of BooleanValue

  abstract type: Value['type']; // ensures new `Value` subtypes must be added to `Value` union

  declare [Symbol.hasInstance]: (value: unknown) => value is Value; // no need to actually declare it.
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export type Value =
  | UndefinedValue
  | NullValue
  | BooleanValue
  | JSStringValue
  | SymbolValue
  | NumberValue
  | BigIntValue
  | ObjectValue;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export const Value = (() => {
  // NOTE: Using IIFE so that the class does not conflict with the type of the same name
  @callable((_target, _thisArg, [value]) => {
    if (value === null) {
      return Value.null;
    } else if (value === undefined) {
      return Value.undefined;
    } else if (value === true) {
      return Value.true;
    } else if (value === false) {
      return Value.false;
    }
    switch (typeof value) {
      case 'string':
        return createStringValue(value);
      case 'number':
        return createNumberValue(value);
      case 'bigint':
        return createBigIntValue(value);
      default:
        throw new OutOfRange('new Value', value);
    }
  })
  abstract class Value extends BaseValue {
  }
  return Value;
})() as typeof BaseValue & {
  <T extends null | undefined | boolean | string | number | bigint>(value: T): // eslint-disable-line @engine262/no-use-in-def
    T extends null ? NullValue :
    T extends undefined ? UndefinedValue :
    T extends boolean ? BooleanValue<T> :
    T extends string ? JSStringValue :
    T extends number ? NumberValue :
    T extends bigint ? BigIntValue :
    never;
};

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export type PropertyKeyValue =
  | JSStringValue
  | SymbolValue;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export type PrimitiveValue =
  | UndefinedValue
  | NullValue
  | BooleanValue
  | JSStringValue
  | SymbolValue
  | NumberValue
  | BigIntValue;

/** https://tc39.es/ecma262/#sec-ecmascript-language-types */
export const PrimitiveValue = (() => {
  // NOTE: Using IIFE so that the class does not conflict with the type of the same name
  // NOTE: Only using IIFE because TypeScript errors when `abstract` is used on class expressions
  abstract class PrimitiveValue extends Value {
  }
  return PrimitiveValue;
})();

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-undefined-type */
export class UndefinedValue extends PrimitiveValue {
  declare readonly type: 'Undefined'; // defined on prototype by static block

  declare readonly value: undefined; // defined on prototype by static block

  private constructor() { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super();
  }

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'Undefined' });
    Object.defineProperty(this.prototype, 'value', { value: undefined });
    Object.defineProperty(Value, 'undefined', { value: new this() });
  }
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-null-type */
export class NullValue extends PrimitiveValue {
  declare readonly type: 'Null'; // defined on prototype by static block

  declare readonly value: null; // defined on prototype by static block

  private constructor() { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super();
  }

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'Null' });
    Object.defineProperty(this.prototype, 'value', { value: null });
    Object.defineProperty(Value, 'null', { value: new this() });
  }
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-boolean-type */
export class BooleanValue<T extends boolean = boolean> extends PrimitiveValue {
  declare readonly type: 'Boolean'; // defined on prototype by static block

  readonly value: T;

  private constructor(value: T) {
    super();
    this.value = value;
  }

  booleanValue() {
    return this.value;
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `Boolean { ${this.value} }`;
  }

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'Boolean' });
    Object.defineProperty(Value, 'true', { value: new this(true) });
    Object.defineProperty(Value, 'false', { value: new this(false) });
  }
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-string-type */
export class JSStringValue extends PrimitiveValue {
  declare readonly type: 'String'; // defined on prototype by static block

  readonly value: string;

  private constructor(value: string) {
    super();
    this.value = value;
  }

  stringValue() {
    return this.value;
  }

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'String' });
    createStringValue = (value) => new this(value);
  }
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type */
export class SymbolValue extends PrimitiveValue {
  declare readonly type: 'Symbol'; // defined on prototype by static block

  readonly Description: JSStringValue | UndefinedValue;

  constructor(Description: JSStringValue | UndefinedValue) {
    super();
    this.Description = Description;
  }

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'Symbol' });
  }
}

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-symbol-type */
export const wellKnownSymbols = {
  asyncIterator: new SymbolValue(Value('Symbol.asyncIterator')),
  hasInstance: new SymbolValue(Value('Symbol.hasInstance')),
  isConcatSpreadable: new SymbolValue(Value('Symbol.isConcatSpreadable')),
  iterator: new SymbolValue(Value('Symbol.iterator')),
  match: new SymbolValue(Value('Symbol.match')),
  matchAll: new SymbolValue(Value('Symbol.matchAll')),
  replace: new SymbolValue(Value('Symbol.replace')),
  search: new SymbolValue(Value('Symbol.search')),
  species: new SymbolValue(Value('Symbol.species')),
  split: new SymbolValue(Value('Symbol.split')),
  toPrimitive: new SymbolValue(Value('Symbol.toPrimitive')),
  toStringTag: new SymbolValue(Value('Symbol.toStringTag')),
  unscopables: new SymbolValue(Value('Symbol.unscopables')),
} as const;
Object.setPrototypeOf(wellKnownSymbols, null);
Object.freeze(wellKnownSymbols);

/** https://tc39.es/ecma262/#sec-ecmascript-language-types-number-type */
export class NumberValue extends PrimitiveValue {
  declare readonly type: 'Number'; // defined on prototype by static block

  readonly value: number;

  private constructor(value: number) {
    super();
    this.value = value;
  }

  numberValue() {
    return this.value;
  }

  isNaN() {
    return Number.isNaN(this.value);
  }

  isInfinity() {
    return !Number.isFinite(this.value) && !this.isNaN();
  }

  isFinite() {
    return Number.isFinite(this.value);
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
  static override toString(xV: NumberValue, radix: number): JSStringValue {
    if (xV.isNaN()) {
      return Value('NaN');
    }
    const x = R(xV);
    if (Object.is(x, -0) || Object.is(x, 0)) {
      return Value('0');
    }
    if (x < 0) {
      return Value(`-${NumberValue.toString(F(-x), radix).stringValue()}`);
    }
    if (xV.isInfinity()) {
      return Value('Infinity');
    }
    // TODO: implement properly, currently depends on host.
    return Value(`${x.toString(radix)}`);
  }

  static readonly unit = new NumberValue(1);

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'Number' });
    createNumberValue = (value) => new NumberValue(value);
  }
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
  declare readonly type: 'BigInt'; // defined on prototype by static block

  readonly value: bigint;

  private constructor(value: bigint) {
    super();
    this.value = value;
  }

  bigintValue() {
    return this.value;
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
  static override toString(x: BigIntValue, radix: number): JSStringValue {
    // 1. If x is less than zero, return the string-concatenation of the String "-" and ! BigInt::toString(-x).
    if (R(x) < 0n) {
      const str = X(BigIntValue.toString(Z(-R(x)), radix)).stringValue();
      return Value(`-${str}`);
    }
    // 2. Return the String value consisting of the code units of the digits of the decimal representation of x.
    return Value(`${R(x).toString(radix)}`);
  }

  static readonly unit = new BigIntValue(1n);

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'BigInt' });
    createBigIntValue = (value) => new BigIntValue(value);
  }
}

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

export interface ObjectInternalMethods<Self> {
  GetPrototypeOf(this: Self): ValueEvaluator<ObjectValue | NullValue>;
  SetPrototypeOf(this: Self, V: ObjectValue | NullValue): ValueEvaluator<BooleanValue>;
  IsExtensible(this: Self): ValueEvaluator<BooleanValue>;
  PreventExtensions(this: Self): ValueEvaluator<BooleanValue>;
  GetOwnProperty(this: Self, P: PropertyKeyValue): PlainEvaluator<Descriptor | UndefinedValue>;
  DefineOwnProperty(this: Self, P: PropertyKeyValue, Desc: Descriptor): ValueEvaluator<BooleanValue>;
  HasProperty(this: Self, P: PropertyKeyValue): ValueEvaluator<BooleanValue>;
  Get(this: Self, P: PropertyKeyValue, Receiver: Value): ValueEvaluator;
  Set(this: Self, P: PropertyKeyValue, V: Value, Receiver: Value): ValueEvaluator<BooleanValue>;
  Delete(this: Self, P: PropertyKeyValue): ValueEvaluator<BooleanValue>;
  OwnPropertyKeys(this: Self): PlainEvaluator<PropertyKeyValue[]>;
  Call?(this: Self, thisArg: Value, args: Arguments): ValueEvaluator;
  Construct?(this: Self, args: Arguments, newTarget: FunctionObject | UndefinedValue): ValueEvaluator<ObjectValue>;
}

type ObjectSlotReturn = {
  [key in keyof ObjectInternalMethods<ObjectValue>]: ReturnType<NonNullable<ObjectInternalMethods<ObjectValue>[key]>>
};
/** https://tc39.es/ecma262/#sec-object-type */
export class ObjectValue extends Value implements ObjectInternalMethods<ObjectValue> {
  declare readonly type: 'Object'; // defined on prototype by static block

  readonly properties: PropertyKeyMap<Descriptor>;

  readonly internalSlotsList: readonly string[];

  readonly PrivateElements: PrivateElementRecord[];

  constructor(internalSlotsList: readonly string[]) {
    super();

    this.PrivateElements = [];
    this.properties = new PropertyKeyMap();
    this.internalSlotsList = internalSlotsList;
    surroundingAgent.debugger_markObjectCreated(this);
  }

  // UNSAFE casts below. Methods below are expected to be rewritten when the object is not an OrdinaryObject. (an example is ArgumentExoticObject)
  // If those methods aren't rewritten, it is an error.
  // eslint-disable-next-line require-yield
  * GetPrototypeOf(): ObjectSlotReturn['GetPrototypeOf'] {
    return OrdinaryGetPrototypeOf(this as unknown as OrdinaryObject);
  }

  // eslint-disable-next-line require-yield
  * SetPrototypeOf(V: ObjectValue | NullValue): ObjectSlotReturn['SetPrototypeOf'] {
    Q(surroundingAgent.debugger_tryTouchDuringPreview(this));
    return OrdinarySetPrototypeOf(this as unknown as OrdinaryObject, V);
  }

  // eslint-disable-next-line require-yield
  * IsExtensible(): ObjectSlotReturn['IsExtensible'] {
    return OrdinaryIsExtensible(this as unknown as OrdinaryObject);
  }

  // eslint-disable-next-line require-yield
  * PreventExtensions(): ObjectSlotReturn['PreventExtensions'] {
    Q(surroundingAgent.debugger_tryTouchDuringPreview(this));
    return OrdinaryPreventExtensions(this as unknown as OrdinaryObject);
  }

  // eslint-disable-next-line require-yield
  * GetOwnProperty(P: PropertyKeyValue): ObjectSlotReturn['GetOwnProperty'] {
    return OrdinaryGetOwnProperty(this as unknown as OrdinaryObject, P);
  }

  * DefineOwnProperty(P: PropertyKeyValue, Desc: Descriptor): ObjectSlotReturn['DefineOwnProperty'] {
    Q(surroundingAgent.debugger_tryTouchDuringPreview(this));
    return yield* OrdinaryDefineOwnProperty(this as unknown as OrdinaryObject, P, Desc);
  }

  * HasProperty(P: PropertyKeyValue): ObjectSlotReturn['HasProperty'] {
    return yield* OrdinaryHasProperty(this as unknown as OrdinaryObject, P);
  }

  * Get(P: PropertyKeyValue, Receiver: Value): ObjectSlotReturn['Get'] {
    return yield* OrdinaryGet(this as unknown as OrdinaryObject, P, Receiver);
  }

  * Set(P: PropertyKeyValue, V: Value, Receiver: Value): ObjectSlotReturn['Set'] {
    // TODO:
    Q(surroundingAgent.debugger_tryTouchDuringPreview(Receiver as ObjectValue));
    return yield* OrdinarySet(this as unknown as OrdinaryObject, P, V, Receiver);
  }

  * Delete(P: PropertyKeyValue): ObjectSlotReturn['Delete'] {
    Q(surroundingAgent.debugger_tryTouchDuringPreview(this));
    return yield* OrdinaryDelete(this as unknown as OrdinaryObject, P);
  }

  // eslint-disable-next-line require-yield
  * OwnPropertyKeys(): ObjectSlotReturn['OwnPropertyKeys'] {
    return OrdinaryOwnPropertyKeys(this as unknown as OrdinaryObject);
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.properties);
    this.internalSlotsList.forEach((s) => {
      // @ts-ignore
      m(this[s]);
    });
  }

  static {
    Object.defineProperty(this.prototype, 'type', { value: 'Object' });
  }
}

/** https://tc39.es/ecma262/#sec-private-names */
export class PrivateName {
  // NOTE: The following declaration distinguishes `PrivateName` from `SymbolValue` so that type guards can properly
  //       remove it from unions with `SymbolValue` due to structural overlap.
  declare private _: never;

  readonly Description: JSStringValue;

  constructor(description: JSStringValue) {
    this.Description = description;
  }
}

export class ReferenceRecord {
  readonly Base: 'unresolvable' | Value | EnvironmentRecord;

  ReferencedName: Value | PrivateName;

  readonly Strict: BooleanValue;

  readonly ThisValue: Value | undefined;

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

export type DescriptorInit = Pick<Descriptor, 'Configurable' | 'Enumerable' | 'Get' | 'Set' | 'Value' | 'Writable'>;
// @ts-expect-error
export function Descriptor(O: DescriptorInit): Descriptor // @ts-expect-error
export @callable() class Descriptor {
  readonly Value?: Value;

  readonly Get?: FunctionObject | UndefinedValue;

  readonly Set?: FunctionObject | UndefinedValue;

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

/** https://tc39.es/ecma262/#sec-sametype */
export function SameType(x: Value, y: Value) {
  switch (true) {
    case x === Value.undefined && y === Value.undefined:
    case x === Value.null && y === Value.null:
    case x instanceof BooleanValue && y instanceof BooleanValue:
    case x instanceof NumberValue && y instanceof NumberValue:
    case x instanceof BigIntValue && y instanceof BigIntValue:
    case x instanceof SymbolValue && y instanceof SymbolValue:
    case x instanceof JSStringValue && y instanceof JSStringValue:
    case x instanceof ObjectValue && y instanceof ObjectValue:
      return true;
    default:
      return false;
  }
}

export type Arguments = readonly Value[];
export interface FunctionCallContext {
  readonly thisValue: Value;
  readonly NewTarget: FunctionObject | UndefinedValue;
}
export interface NativeSteps {
  (this: BuiltinFunctionObject, args: Arguments, context: FunctionCallContext): PlainEvaluator<Value | void> | PlainCompletion<Value | void>;
  section?: string;
}
export interface CanBeNativeSteps {
  (...args: Value[]): void | ValueEvaluator;
}
