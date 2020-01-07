import { ExecutionContext, surroundingAgent } from './engine.mjs';
import {
  ArraySetLength,
  Assert,
  Call,
  CanonicalNumericIndexString,
  CompletePropertyDescriptor,
  CreateListFromArrayLike,
  FromPropertyDescriptor,
  Get,
  Set,
  GetMethod,
  HasOwnProperty,
  IntegerIndexedElementGet,
  IntegerIndexedElementSet,
  IsAccessorDescriptor,
  IsCompatiblePropertyDescriptor,
  IsDataDescriptor,
  IsDetachedBuffer,
  IsExtensible,
  IsValidIntegerIndex,
  IsPropertyKey,
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
  SameValue,
  StringGetOwnProperty,
  ToBoolean,
  ToPropertyDescriptor,
  ToInt32,
  ToUint32,
  ToInteger,
  ToString,
  isArrayIndex,
  isIntegerIndex,
} from './abstract-ops/all.mjs';
import { EnvironmentRecord, LexicalEnvironment } from './environment.mjs';
import {
  Completion,
  Q,
  X,
} from './completion.mjs';
import { ValueMap, ValueSet, OutOfRange } from './helpers.mjs';
import { ResolvedBindingRecord } from './modules.mjs';

export function Value(value) {
  if (new.target !== undefined && new.target !== Value) {
    return undefined;
  }

  switch (typeof value) {
    case 'string':
      return new StringValue(value);
    case 'number':
      return new NumberValue(value);
    case 'bigint':
      return new BigIntValue(value);
    case 'function':
      return new BuiltinFunctionValue(value);
    default:
      throw new OutOfRange('new Value', value);
  }
}

export class PrimitiveValue extends Value {}

export class UndefinedValue extends PrimitiveValue {}

export class NullValue extends PrimitiveValue {}

export class BooleanValue extends PrimitiveValue {
  constructor(v) {
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

export class NumberValue extends PrimitiveValue {
  constructor(number) {
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

  // #sec-numeric-types-number-unaryMinus
  static unaryMinus(x) {
    if (x.isNaN()) {
      return new Value(NaN);
    }
    return new Value(-x.numberValue());
  }

  // #sec-numeric-types-number-bitwiseNOT
  static bitwiseNOT(x) {
    // 1. Let oldValue be ! ToInt32(x).
    const oldValue = X(ToInt32(x));
    // 2. Return the result of applying bitwise complement to oldValue. The result is a signed 32-bit integer.
    return new Value(~oldValue.numberValue()); // eslint-disable-line no-bitwise
  }

  // #sec-numeric-types-number-exponentiate
  static exponentiate(base, exponent) {
    return new Value(base.numberValue() ** exponent.numberValue());
  }

  // #sec-numeric-types-number-multiply
  static multiply(x, y) {
    return new Value(x.numberValue() * y.numberValue());
  }

  // #sec-numeric-types-number-divide
  static divide(x, y) {
    return new Value(x.numberValue() / y.numberValue());
  }

  // #sec-numeric-types-number-remainder
  static remainder(n, d) {
    return new Value(n.numberValue() % d.numberValue());
  }

  // #sec-numeric-types-number-add
  static add(x, y) {
    return new Value(x.numberValue() + y.numberValue());
  }

  // #sec-numeric-types-number-subtract
  static subtract(x, y) {
    // The result of - operator is x + (-y).
    return NumberValue.add(x, new Value(-y.numberValue()));
  }

  // #sec-numeric-types-number-leftShift
  static leftShift(x, y) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = rnum.numberValue() & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of left shifting lnum by shiftCount bits. The result is a signed 32-bit integer.
    return new Value(lnum.numberValue() << shiftCount); // eslint-disable-line no-bitwise
  }

  // #sec-numeric-types-number-signedRightShift
  static signedRightShift(x, y) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = rnum.numberValue() & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of performing a sign-extending right shift of lnum by shiftCount bits.
    //    The most significant bit is propagated. The result is a signed 32-bit integer.
    return new Value(lnum.numberValue() >> shiftCount); // eslint-disable-line no-bitwise
  }

  // #sec-numeric-types-number-unsignedRightShift
  static unsignedRightShift(x, y) {
    // 1. Let lnum be ! ToInt32(x).
    const lnum = X(ToInt32(x));
    // 2. Let rnum be ! ToUint32(y).
    const rnum = X(ToUint32(y));
    // 3. Let shiftCount be the result of masking out all but the least significant 5 bits of rnum, that is, compute rnum & 0x1F.
    const shiftCount = rnum.numberValue() & 0x1F; // eslint-disable-line no-bitwise
    // 4. Return the result of performing a zero-filling right shift of lnum by shiftCount bits.
    //    Vacated bits are filled with zero. The result is an unsigned 32-bit integer.
    return new Value(lnum.numberValue() >>> shiftCount); // eslint-disable-line no-bitwise
  }

  // #sec-numeric-types-number-lessThan
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

  // #sec-numeric-types-number-equal
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

  // #sec-numeric-types-number-sameValue
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

  // #sec-numeric-types-number-sameValueZero
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

  // #sec-numeric-types-number-bitwiseAND
  static bitwiseAND(x, y) {
    return NumberBitwiseOp('&', x, y);
  }

  // #sec-numeric-types-number-bitwiseXOR
  static bitwiseXOR(x, y) {
    return NumberBitwiseOp('^', x, y);
  }

  // #sec-numeric-types-number-bitwiseOR
  static bitwiseOR(x, y) {
    return NumberBitwiseOp('|', x, y);
  }

  // #sec-numeric-types-number-tostring
  static toString(x) {
    if (x.isNaN()) {
      return new Value('NaN');
    }
    const xVal = x.numberValue();
    if (xVal === 0) {
      return new Value('0');
    }
    if (xVal < 0) {
      const str = X(NumberValue.toString(new Value(-xVal))).stringValue();
      return new Value(`-${str}`);
    }
    if (x.isInfinity()) {
      return new Value('Infinity');
    }
    // TODO: implement properly
    return new Value(`${xVal}`);
  }
}

NumberValue.unit = new NumberValue(1);

// #sec-numberbitwiseop
function NumberBitwiseOp(op, x, y) {
  // 1. Let lnum be ! ToInt32(x).
  const lnum = X(ToInt32(x));
  // 2. Let rnum be ! ToUint32(y).
  const rnum = X(ToUint32(y));
  // 3. Return the result of applying the bitwise operator op to lnum and rnum. The result is a signed 32-bit integer.
  switch (op) {
    case '&':
      return new Value(lnum.numberValue() & rnum.numberValue()); // eslint-disable-line no-bitwise
    case '|':
      return new Value(lnum.numberValue() | rnum.numberValue()); // eslint-disable-line no-bitwise
    case '^':
      return new Value(lnum.numberValue() ^ rnum.numberValue()); // eslint-disable-line no-bitwise
    default:
      throw new OutOfRange('NumberBitwiseOp', op);
  }
}

export class BigIntValue extends PrimitiveValue {
  constructor(bigint) {
    super();
    this.bigint = bigint;
  }

  bigintValue() {
    return this.bigint;
  }

  // #sec-numeric-types-bigint-unaryMinus
  static unaryMinus(x) {
    if (x.bigintValue() === 0n) {
      return new Value(0n);
    }
    return new Value(-x.bigintValue());
  }

  // #sec-numeric-types-bigint-bitwiseNOT
  static bitwiseNOT(x) {
    return new Value(-x.bigintValue() - 1n);
  }

  // #sec-numeric-types-bigint-exponentiate
  static exponentiate(base, exponent) {
    // 1. If exponent < 0n, throw a RangeError exception.
    if (exponent.bigintValue() < 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntNegativeExponent');
    }
    // 2. If base is 0n and exponent is 0n, return 1n.
    if (base.bigintValue() === 0n && exponent.bigintValue() === 0n) {
      return new Value(1n);
    }
    // 3. Return the BigInt value that represents the mathematical value of base raised to the power exponent.
    return new Value(base.bigintValue() ** exponent.bigintValue());
  }

  // #sec-numeric-types-bigint-multiply
  static multiply(x, y) {
    return new Value(x.bigintValue() * y.bigintValue());
  }

  // #sec-numeric-types-bigint-divide
  static divide(x, y) {
    // 1. If y is 0n, throw a RangeError exception.
    if (y.bigintValue() === 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntDivideByZero');
    }
    // 2. Let quotient be the mathematical value of x divided by y.
    const quotient = x.bigintValue() / y.bigintValue();
    // 3. Return the BigInt value that represents quotient rounded towards 0 to the next integral value.
    return new Value(quotient);
  }

  // #sec-numeric-types-bigint-remainder
  static remainder(n, d) {
    // 1. If d is 0n, throw a RangeError exception.
    if (d.bigintValue() === 0n) {
      return surroundingAgent.Throw('RangeError', 'BigIntDivideByZero');
    }
    // 2. If n is 0n, return 0n.
    if (n.bigintValue() === 0n) {
      return new Value(0n);
    }
    // 3. Let r be the BigInt defined by the mathematical relation r = n - (d × q)
    //   where q is a BigInt that is negative only if n/d is negative and positive
    //   only if n/d is positive, and whose magnitude is as large as possible without
    //   exceeding the magnitude of the true mathematical quotient of n and d.
    const r = new Value(n.bigintValue() % d.bigintValue());
    // 4. Return r.
    return r;
  }

  // #sec-numeric-types-bigint-add
  static add(x, y) {
    return new Value(x.bigintValue() + y.bigintValue());
  }

  // #sec-numeric-types-bigint-subtract
  static subtract(x, y) {
    return new Value(x.bigintValue() - y.bigintValue());
  }

  // #sec-numeric-types-bigint-leftShift
  static leftShift(x, y) {
    return new Value(x.bigintValue() << y.bigintValue()); // eslint-disable-line no-bitwise
  }

  // #sec-numeric-types-bigint-signedRightShift
  static signedRightShift(x, y) {
    // 1. Return BigInt::leftShift(x, -y).
    return BigIntValue.leftShift(x, new Value(-y.bigintValue()));
  }

  // #sec-numeric-types-bigint-unsighedRightShift
  static unsignedRightShift(_x, _y) {
    return surroundingAgent.Throw('TypeError', 'BigIntUnsignedRightShift');
  }

  // #sec-numeric-types-bigint-lessThan
  static lessThan(x, y) {
    return x.bigintValue() < y.bigintValue() ? Value.true : Value.false;
  }

  // #sec-numeric-types-bigint-equal
  static equal(x, y) {
    // Return true if x and y have the same mathematical integer value and false otherwise.
    return x.bigintValue() === y.bigintValue() ? Value.true : Value.false;
  }

  // #sec-numeric-types-bigint-sameValue
  static sameValue(x, y) {
    // 1. Return BigInt::equal(x, y).
    return BigIntValue.equal(x, y);
  }

  // #sec-numeric-types-bigint-sameValueZero
  static sameValueZero(x, y) {
    // 1. Return BigInt::equal(x, y).
    return BigIntValue.equal(x, y);
  }

  // #sec-numeric-types-bigint-bitwiseAND
  static bitwiseAND(x, y) {
    // 1. Return BigIntBitwiseOp("&", x, y).
    return BigIntBitwiseOp('&', x.bigintValue(), y.bigintValue());
  }

  // #sec-numeric-types-bigint-bitwiseXOR
  static bitwiseXOR(x, y) {
    // 1. Return BigIntBitwiseOp("^", x, y).
    return BigIntBitwiseOp('^', x.bigintValue(), y.bigintValue());
  }

  // #sec-numeric-types-bigint-bitwiseOR
  static bitwiseOR(x, y) {
    // 1. Return BigIntBitwiseOp("|", x, y);
    return BigIntBitwiseOp('|', x.bigintValue(), y.bigintValue());
  }

  // #sec-numeric-types-bigint-tostring
  static toString(x) {
    // 1. If x is less than zero, return the string-concatenation of the String "-" and ! BigInt::toString(-x).
    if (x.bigintValue() < 0n) {
      const str = X(BigIntValue.toString(new Value(-x.bigintValue()))).stringValue();
      return new Value(`-${str}`);
    }
    // 2. Return the String value consisting of the code units of the digits of the decimal representation of x.
    return new Value(`${x.bigintValue()}`);
  }
}

BigIntValue.unit = new BigIntValue(1n);

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

// #sec-bigintbitwiseop
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
  return new Value(result);
  */
  switch (op) {
    case '&':
      return new Value(x & y); // eslint-disable-line no-bitwise
    case '|':
      return new Value(x | y); // eslint-disable-line no-bitwise
    case '^':
      return new Value(x ^ y); // eslint-disable-line no-bitwise
    default:
      throw new OutOfRange('BigIntBitwiseOp', op);
  }
}

export class StringValue extends PrimitiveValue {
  constructor(string) {
    super();
    this.string = string;
  }

  stringValue() {
    return this.string;
  }
}

export class SymbolValue extends PrimitiveValue {
  constructor(Description) {
    super();
    this.Description = Description;
  }
}

export const wellKnownSymbols = Object.create(null);
for (const name of [
  'asyncIterator',
  'hasInstance',
  'isConcatSpreadable',
  'iterator',
  'match',
  'matchAll',
  'replace',
  'search',
  'species',
  'split',
  'toPrimitive',
  'toStringTag',
  'unscopables',
]) {
  const sym = new SymbolValue(new StringValue(`Symbol.${name}`));
  wellKnownSymbols[name] = sym;
}
Object.freeze(wellKnownSymbols);


export class ObjectValue extends Value {
  constructor() {
    super();

    this.Prototype = undefined;
    this.Extensible = undefined;
    this.IsClassPrototype = false;
    this.properties = new ValueMap();
  }

  GetPrototypeOf() {
    return OrdinaryGetPrototypeOf(this);
  }

  SetPrototypeOf(V) {
    return OrdinarySetPrototypeOf(this, V);
  }

  IsExtensible() {
    return OrdinaryIsExtensible(this);
  }

  PreventExtensions() {
    return OrdinaryPreventExtensions(this);
  }

  GetOwnProperty(P) {
    return OrdinaryGetOwnProperty(this, P);
  }

  DefineOwnProperty(P, Desc) {
    return OrdinaryDefineOwnProperty(this, P, Desc);
  }

  HasProperty(P) {
    return OrdinaryHasProperty(this, P);
  }

  Get(P, Receiver) {
    return OrdinaryGet(this, P, Receiver);
  }

  Set(P, V, Receiver) {
    return OrdinarySet(this, P, V, Receiver);
  }

  Delete(P) {
    return OrdinaryDelete(this, P);
  }

  OwnPropertyKeys() {
    return OrdinaryOwnPropertyKeys(this);
  }
}
ObjectValue.prototype.isOrdinary = true;

export class ArrayExoticObjectValue extends ObjectValue {
  DefineOwnProperty(P, Desc) {
    const A = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'String' && P.stringValue() === 'length') {
      return Q(ArraySetLength(A, Desc));
    } else if (isArrayIndex(P)) {
      const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
      Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
      const oldLen = oldLenDesc.Value;
      const index = X(ToUint32(P));
      if (index.numberValue() >= oldLen.numberValue() && oldLenDesc.Writable === Value.false) {
        return Value.false;
      }
      const succeeded = X(OrdinaryDefineOwnProperty(A, P, Desc));
      if (succeeded === Value.false) {
        return Value.false;
      }
      if (index.numberValue() >= oldLen.numberValue()) {
        oldLenDesc.Value = new Value(index.numberValue() + 1);
        const succeeded = OrdinaryDefineOwnProperty(A, new Value('length'), oldLenDesc); // eslint-disable-line no-shadow
        Assert(succeeded === Value.true);
      }
      return Value.true;
    }
    return OrdinaryDefineOwnProperty(A, P, Desc);
  }
}
ArrayExoticObjectValue.prototype.isOrdinary = false;

export class FunctionValue extends ObjectValue {
  static [Symbol.hasInstance](V) {
    return V instanceof ObjectValue && typeof V.Call === 'function';
  }
}

function nativeCall(F, argumentsList, thisArgument, newTarget) {
  return F.nativeFunction(argumentsList, {
    thisValue: thisArgument || Value.undefined,
    NewTarget: newTarget || Value.undefined,
  });
}

export class BuiltinFunctionValue extends FunctionValue {
  constructor(nativeFunction, isConstructor = Value.false) {
    super();
    this.nativeFunction = nativeFunction;
    this.Realm = undefined;
    this.ScriptOrModule = undefined;

    if (isConstructor === Value.true) {
      this.Construct = function Construct(argumentsList, newTarget) {
        const F = this;

        // const callerContext = surroundingAgent.runningExecutionContext;
        // If callerContext is not already suspended, suspend callerContext.
        const calleeContext = new ExecutionContext();
        calleeContext.Function = F;
        const calleeRealm = F.Realm;
        calleeContext.Realm = calleeRealm;
        calleeContext.ScriptOrModule = F.ScriptOrModule;
        // 8. Perform any necessary implementation-defined initialization of calleeContext.
        surroundingAgent.executionContextStack.push(calleeContext);
        const result = nativeCall(F, argumentsList, undefined, newTarget);
        // Remove calleeContext from the execution context stack and
        // restore callerContext as the running execution context.
        surroundingAgent.executionContextStack.pop(calleeContext);
        return result;
      };
    }
  }

  Call(thisArgument, argumentsList) {
    const F = this;

    // const callerContext = surroundingAgent.runningExecutionContext;
    // If callerContext is not already suspended, suspend callerContext.
    const calleeContext = new ExecutionContext();
    calleeContext.Function = F;
    const calleeRealm = F.Realm;
    calleeContext.Realm = calleeRealm;
    calleeContext.ScriptOrModule = F.ScriptOrModule;
    // 8. Perform any necessary implementation-defined initialization of calleeContext.
    surroundingAgent.executionContextStack.push(calleeContext);
    const result = nativeCall(F, argumentsList, thisArgument, Value.undefined);
    // Remove calleeContext from the execution context stack and
    // restore callerContext as the running execution context.
    surroundingAgent.executionContextStack.pop(calleeContext);
    return result;
  }
}
BuiltinFunctionValue.prototype.isOrdinary = false;

// 9.4.3 #sec-string-exotic-objects
export class StringExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.StringData = undefined;
  }

  GetOwnProperty(P) {
    const S = this;
    Assert(IsPropertyKey(P));
    const desc = OrdinaryGetOwnProperty(S, P);
    if (Type(desc) !== 'Undefined') {
      return desc;
    }
    return X(StringGetOwnProperty(S, P));
  }

  DefineOwnProperty(P, Desc) {
    const S = this;
    Assert(IsPropertyKey(P));
    const stringDesc = X(StringGetOwnProperty(S, P));
    if (Type(stringDesc) !== 'Undefined') {
      const extensible = S.Extensible;
      return X(IsCompatiblePropertyDescriptor(extensible, Desc, stringDesc));
    }
    return X(OrdinaryDefineOwnProperty(S, P, Desc));
  }

  OwnPropertyKeys() {
    const O = this;
    const keys = [];
    const str = O.StringData;
    Assert(Type(str) === 'String');
    const len = str.stringValue().length;

    for (let i = 0; i < len; i += 1) {
      keys.push(new Value(`${i}`));
    }

    // For each own property key P of O such that P is an array index and
    // ToInteger(P) ≥ len, in ascending numeric index order, do
    //   Add P as the last element of keys.
    for (const P of O.properties.keys()) {
      // This is written with two nested ifs to work around https://github.com/devsnek/engine262/issues/24
      if (isArrayIndex(P)) {
        if (X(ToInteger(P)).numberValue() >= len) {
          keys.push(P);
        }
      }
    }

    // For each own property key P of O such that Type(P) is String and
    // P is not an array index, in ascending chronological order of property creation, do
    //   Add P as the last element of keys.
    for (const P of O.properties.keys()) {
      if (Type(P) === 'String' && isArrayIndex(P) === false) {
        keys.push(P);
      }
    }

    // For each own property key P of O such that Type(P) is Symbol,
    // in ascending chronological order of property creation, do
    //   Add P as the last element of keys.
    for (const P of O.properties.keys()) {
      if (Type(P) === 'Symbol') {
        keys.push(P);
      }
    }

    return keys;
  }
}
StringExoticObjectValue.prototype.isOrdinary = false;

// 9.4.4 #sec-arguments-exotic-objects
export class ArgumentsExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.ParameterMap = undefined;
  }

  GetOwnProperty(P) {
    const args = this;
    const desc = OrdinaryGetOwnProperty(args, P);
    if (desc === Value.undefined) {
      return desc;
    }
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped === Value.true) {
      desc.Value = Get(map, P);
    }
    return desc;
  }

  DefineOwnProperty(P, Desc) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    let newArgDesc = Desc;
    if (isMapped === Value.true && IsDataDescriptor(Desc) === true) {
      if (Desc.Value === undefined && Desc.Writable !== undefined && Desc.Writable === Value.false) {
        newArgDesc = Descriptor({ ...Desc });
        newArgDesc.Value = X(Get(map, P));
      }
    }
    const allowed = Q(OrdinaryDefineOwnProperty(args, P, newArgDesc));
    if (allowed === Value.false) {
      return Value.false;
    }
    if (isMapped === Value.true) {
      if (IsAccessorDescriptor(Desc) === true) {
        map.Delete(P);
      } else {
        if (Desc.Value !== undefined) {
          const setStatus = Set(map, P, Desc.Value, Value.false);
          Assert(setStatus === Value.true);
        }
        if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
          map.Delete(P);
        }
      }
    }
    return Value.true;
  }

  Get(P, Receiver) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    if (isMapped === Value.false) {
      return Q(OrdinaryGet(args, P, Receiver));
    } else {
      return Get(map, P);
    }
  }

  Set(P, V, Receiver) {
    const args = this;
    let isMapped;
    let map;
    if (SameValue(args, Receiver) === Value.false) {
      isMapped = false;
    } else {
      map = args.ParameterMap;
      isMapped = X(HasOwnProperty(map, P)) === Value.true;
    }
    if (isMapped) {
      const setStatus = Set(map, P, V, Value.false);
      Assert(setStatus === Value.true);
    }
    return Q(OrdinarySet(args, P, V, Receiver));
  }

  Delete(P) {
    const args = this;
    const map = args.ParameterMap;
    const isMapped = X(HasOwnProperty(map, P));
    const result = Q(OrdinaryDelete(args, P));
    if (result === Value.true && isMapped === Value.true) {
      map.Delete(P);
    }
    return result;
  }
}
ArgumentsExoticObjectValue.prototype.isOrdinary = false;

// 9.4.5 #sec-integer-indexed-exotic-objects
export class IntegerIndexedExoticObjectValue extends ObjectValue {
  constructor() {
    super();
    this.ViewedArrayBuffer = Value.undefined;
    this.ArrayLength = Value.undefined;
    this.ByteOffset = Value.undefined;
    this.TypedArrayName = Value.undefined;
  }

  // 9.4.5.1 #sec-integer-indexed-exotic-objects-getownproperty-p
  GetOwnProperty(P) {
    const O = this;
    Assert(IsPropertyKey(P));
    Assert(O instanceof IntegerIndexedExoticObjectValue);
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        const value = Q(IntegerIndexedElementGet(O, numericIndex));
        if (value === Value.undefined) {
          return Value.undefined;
        }
        return Descriptor({
          Value: value,
          Writable: Value.true,
          Enumerable: Value.true,
          Configurable: Value.false,
        });
      }
    }
    return OrdinaryGetOwnProperty(O, P);
  }

  // 9.4.5.2 #sec-integer-indexed-exotic-objects-hasproperty-p
  HasProperty(P) {
    const O = this;
    Assert(IsPropertyKey(P));
    Assert(O instanceof IntegerIndexedExoticObjectValue);
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        const buffer = O.ViewedArrayBuffer;
        if (IsDetachedBuffer(buffer)) {
          return surroundingAgent.Throw('TypeError', 'ArrayBufferDetached');
        }
        if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
          return Value.false;
        }
        return Value.true;
      }
    }
    return Q(OrdinaryHasProperty(O, P));
  }

  // 9.4.5.3 #sec-integer-indexed-exotic-objects-defineownproperty-p-desc
  DefineOwnProperty(P, Desc) {
    const O = this;
    Assert(IsPropertyKey(P));
    Assert(O instanceof ObjectValue && 'ViewedArrayBuffer' in O);
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        if (IsValidIntegerIndex(O, numericIndex) === Value.false) {
          return Value.false;
        }
        if (IsAccessorDescriptor(Desc)) {
          return Value.false;
        }
        if (Desc.Configurable === Value.true) {
          return Value.false;
        }
        if (Desc.Enumerable === Value.false) {
          return Value.false;
        }
        if (Desc.Writable === Value.false) {
          return Value.false;
        }
        if (Desc.Value !== undefined) {
          const value = Desc.Value;
          return Q(IntegerIndexedElementSet(O, numericIndex, value));
        }
        return Value.true;
      }
    }
    return Q(OrdinaryDefineOwnProperty(O, P, Desc));
  }

  // 9.4.5.4 #sec-integer-indexed-exotic-objects-get-p-receiver
  Get(P, Receiver) {
    const O = this;
    Assert(IsPropertyKey(P));
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        return Q(IntegerIndexedElementGet(O, numericIndex));
      }
    }
    return Q(OrdinaryGet(O, P, Receiver));
  }

  // 9.4.5.5 #sec-integer-indexed-exotic-objects-set-p-v-receiver
  Set(P, V, Receiver) {
    const O = this;
    Assert(IsPropertyKey(P));
    if (Type(P) === 'String') {
      const numericIndex = X(CanonicalNumericIndexString(P));
      if (numericIndex !== Value.undefined) {
        return Q(IntegerIndexedElementSet(O, numericIndex, V));
      }
    }
    return Q(OrdinarySet(O, P, V, Receiver));
  }

  // 9.4.5.6 #sec-integer-indexed-exotic-objects-ownpropertykeys
  OwnPropertyKeys() {
    const O = this;
    const keys = [];
    Assert(O instanceof IntegerIndexedExoticObjectValue);
    const len = O.ArrayLength.numberValue();
    for (let i = 0; i < len; i += 1) {
      keys.push(X(ToString(new Value(i))));
    }
    for (const P of O.properties.keys()) {
      if (Type(P) === 'String') {
        if (!isIntegerIndex(P)) {
          keys.push(P);
        }
      }
    }
    for (const P of O.properties.keys()) {
      if (Type(P) === 'Symbol') {
        keys.push(P);
      }
    }
    return keys;
  }
}
IntegerIndexedExoticObjectValue.prototype.isOrdinary = false;

// 9.4.7.2 #sec-set-immutable-prototype
function SetImmutablePrototype(O, V) {
  Assert(Type(V) === 'Object' || Type(V) === 'Null');
  const current = Q(O.GetPrototypeOf());
  if (SameValue(V, current) === Value.true) {
    return Value.true;
  }
  return Value.false;
}

// 9.4.6 #sec-module-namespace-exotic-objects
export class ModuleNamespaceExoticObjectValue extends ObjectValue {
  constructor() {
    super();
    this.Module = null;
    this.Exports = null;
    this.Prototype = Value.null;
  }

  SetPrototypeOf(V) {
    const O = this;

    return Q(SetImmutablePrototype(O, V));
  }

  IsExtensible() {
    return Value.false;
  }

  PreventExtensions() {
    return Value.true;
  }

  GetOwnProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryGetOwnProperty(O, P);
    }
    const exports = O.Exports;
    if (!exports.has(P)) {
      return Value.undefined;
    }
    const value = Q(O.Get(P, O));
    return Descriptor({
      Value: value,
      Writable: Value.true,
      Enumerable: Value.true,
      Configurable: Value.false,
    });
  }

  DefineOwnProperty(P, Desc) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryDefineOwnProperty(O, P, Desc);
    }

    const current = Q(O.GetOwnProperty(P));
    if (current === Value.undefined) {
      return Value.false;
    }
    if (IsAccessorDescriptor(Desc)) {
      return Value.false;
    }
    if (Desc.Writable !== undefined && Desc.Writable === Value.false) {
      return Value.false;
    }
    if (Desc.Enumerable !== undefined && Desc.Enumerable === Value.false) {
      return Value.false;
    }
    if (Desc.Configurable !== undefined && Desc.Configurable === Value.true) {
      return Value.false;
    }
    if (Desc.Value !== undefined) {
      return SameValue(Desc.Value, current.Value);
    }
    return Value.true;
  }

  HasProperty(P) {
    const O = this;

    if (Type(P) === 'Symbol') {
      return OrdinaryHasProperty(O, P);
    }
    const exports = O.Exports;
    if (exports.has(P)) {
      return Value.true;
    }
    return Value.false;
  }

  Get(P, Receiver) {
    const O = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'Symbol') {
      return OrdinaryGet(O, P, Receiver);
    }
    const exports = O.Exports;
    if (!exports.has(P)) {
      return Value.undefined;
    }
    const m = O.Module;
    const binding = m.ResolveExport(P);
    Assert(binding instanceof ResolvedBindingRecord);
    const targetModule = binding.Module;
    Assert(targetModule !== Value.undefined);
    const targetEnv = targetModule.Environment;
    if (targetEnv === Value.undefined) {
      return surroundingAgent.Throw('ReferenceError', 'NotDefined', P);
    }
    const targetEnvRec = targetEnv.EnvironmentRecord;
    return Q(targetEnvRec.GetBindingValue(binding.BindingName, Value.true));
  }

  Set() {
    return Value.false;
  }

  Delete(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    if (Type(P) === 'Symbol') {
      return Q(OrdinaryDelete(O, P));
    }
    const exports = O.Exports;
    if (exports.has(P)) {
      return Value.false;
    }
    return Value.true;
  }

  OwnPropertyKeys() {
    const O = this;

    const exports = [...O.Exports];
    const symbolKeys = X(OrdinaryOwnPropertyKeys(O));
    exports.push(...symbolKeys);
    return exports;
  }
}
ModuleNamespaceExoticObjectValue.prototype.isOrdinary = false;

// 9.5 #sec-proxy-object-internal-methods-and-internal-slots
export class ProxyExoticObjectValue extends ObjectValue {
  constructor() {
    super();

    this.ProxyTarget = undefined;
    this.ProxyHandler = undefined;
  }

  GetPrototypeOf() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'getPrototypeOf');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('getPrototypeOf')));
    if (trap === Value.undefined) {
      return Q(target.GetPrototypeOf());
    }
    const handlerProto = Q(Call(trap, handler, [target]));
    if (Type(handlerProto) !== 'Object' && Type(handlerProto) !== 'Null') {
      return surroundingAgent.Throw('TypeError', 'ProxyGetPrototypeOfInvalid');
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === Value.true) {
      return handlerProto;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(handlerProto, targetProto) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'ProxyGetPrototypeOfNonExtensible');
    }
    return handlerProto;
  }

  SetPrototypeOf(V) {
    const O = this;

    Assert(Type(V) === 'Object' || Type(V) === 'Null');
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'setPrototypeOf');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('setPrototypeOf')));
    if (trap === Value.undefined) {
      return Q(target.SetPrototypeOf(V));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, V])));
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    const extensibleTarget = Q(IsExtensible(target));
    if (extensibleTarget === Value.true) {
      return Value.true;
    }
    const targetProto = Q(target.GetPrototypeOf());
    if (SameValue(V, targetProto) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'ProxySetPrototypeOfNonExtensible');
    }
    return Value.true;
  }

  IsExtensible() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'isExtensible');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('isExtensible')));
    if (trap === Value.undefined) {
      return Q(IsExtensible(target));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target])));
    const targetResult = Q(IsExtensible(target));
    if (SameValue(booleanTrapResult, targetResult) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'ProxyIsExtensibleInconsistent', targetResult);
    }
    return booleanTrapResult;
  }

  PreventExtensions() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'preventExtensions');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('preventExtensions')));
    if (trap === Value.undefined) {
      return Q(target.PreventExtensions());
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target])));
    if (booleanTrapResult === Value.true) {
      const extensibleTarget = Q(IsExtensible(target));
      if (extensibleTarget === Value.true) {
        return surroundingAgent.Throw('TypeError', 'ProxyPreventExtensionsExtensible');
      }
    }
    return booleanTrapResult;
  }

  GetOwnProperty(P) {
    const O = this;

    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Let handler be O.[[ProxyHandler]].
    const handler = O.ProxyHandler;
    // 3. If handler is null, throw a TypeError exception.
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'getOwnPropertyDescriptor');
    }
    // 4. Assert: Type(Handler) is Object.
    Assert(Type(handler) === 'Object');
    // 5. Let target be O.[[ProxyTarget]].
    const target = O.ProxyTarget;
    // 6. Let trap be ? Getmethod(handler, "getOwnPropertyDescriptor").
    const trap = Q(GetMethod(handler, new Value('getOwnPropertyDescriptor')));
    // 7. If trap is undefined, then
    if (trap === Value.undefined) {
      // a. Return ? target.[[GetOwnProperty]](P).
      return Q(target.GetOwnProperty(P));
    }
    // 8. Let trapResultObj be ? Call(trap, handler, « target, P »).
    const trapResultObj = Q(Call(trap, handler, [target, P]));
    // 9. If Type(trapResultObj) is neither Object nor Undefined, throw a TypeError exception.
    if (Type(trapResultObj) !== 'Object' && Type(trapResultObj) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError', 'ProxyGetOwnPropertyDescriptorInvalid', P);
    }
    // 10. Let targetDesc be ? target.[[GetOwnProperty]](P).
    const targetDesc = Q(target.GetOwnProperty(P));
    // 11. If trapResultObj is undefined, then
    if (trapResultObj === Value.undefined) {
      // a. If targetDesc is undefined, return undefined.
      if (targetDesc === Value.undefined) {
        return Value.undefined;
      }
      // b. If targetDesc.[[Configurable]] is false, throw a TypeError exception.
      if (targetDesc.Configurable === Value.false) {
        return surroundingAgent.Throw('TypeError', 'ProxyGetOwnPropertyDescriptorUndefined', P);
      }
      // c. Let extensibleTarget be ? IsExtensible(target).
      const extensibleTarget = Q(IsExtensible(target));
      // d. If extensibleTarget is false, throw a TypeError exception.
      if (extensibleTarget === Value.false) {
        return surroundingAgent.Throw('TypeError', 'ProxyGetOwnPropertyDescriptorNonExtensible', P);
      }
      // e. Return undefined.
      return Value.undefined;
    }
    // 12. Let extensibleTarget be ? IsExtensible(target).
    const extensibleTarget = Q(IsExtensible(target));
    // 13. Let resultDesc be ? ToPropertyDescriptor(trapResultObj).
    const resultDesc = Q(ToPropertyDescriptor(trapResultObj));
    // 14. Call CompletePropertyDescriptor(resultDesc).
    CompletePropertyDescriptor(resultDesc);
    // 15. Let valid be IsCompatiblePropertyDescriptor(extensibleTarget, resultDesc, targetDesc).
    const valid = IsCompatiblePropertyDescriptor(extensibleTarget, resultDesc, targetDesc);
    // 16. If valid is false, throw a TypeError exception.
    if (valid === Value.false) {
      return surroundingAgent.Throw('TypeError', 'ProxyGetOwnPropertyDescriptorIncompatible', P);
    }
    // 17. If resultDesc.[[Configurable]] is false, then
    if (resultDesc.Configurable === Value.false) {
      // a. If targetDesc is undefined or targetDesc.[[Configurable]] is true, then
      if (targetDesc === Value.undefined || targetDesc.Configurable === Value.true) {
        // i. Throw a TypeError exception.
        return surroundingAgent.Throw('TypeError', 'ProxyGetOwnPropertyDescriptorNonConfigurable', P);
      }
      // b. If resultDesc has a [[Writable]] field and resultDesc.[[Writable]] is false, then
      if ('Writable' in resultDesc && resultDesc.Writable === Value.false) {
        // i. If targetDesc.[[Writable]] is true, throw a TypeError exception.
        if (targetDesc.Writable === Value.true) {
          return surroundingAgent.Throw('TypeError', 'ProxyGetOwnPropertyDescriptorNonConfigurableWritable', P);
        }
      }
    }
    // 18. Return resultDesc.
    return resultDesc;
  }

  DefineOwnProperty(P, Desc) {
    const O = this;

    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Let handler be O.[[ProxyHandler]].
    const handler = O.ProxyHandler;
    // 3. If handler is null, throw a TypeError exception.
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'defineProperty');
    }
    // 4. Assert: Type(handler) is Object.
    Assert(Type(handler) === 'Object');
    // 5. Let target be O.[[ProxyTarget]].
    const target = O.ProxyTarget;
    // 6. Let trap be ? GetMethod(handler, "defineProperty").
    const trap = Q(GetMethod(handler, new Value('defineProperty')));
    // 7. If trap is undefined, then
    if (trap === Value.undefined) {
      // a. Return ? target.[[DefineOwnProperty]](P, Desc).
      return Q(target.DefineOwnProperty(P, Desc));
    }
    // 8. Let descObj be FromPropertyDescriptor(Desc).
    const descObj = FromPropertyDescriptor(Desc);
    // 9. Let booleanTrapResult be ! ToBoolean(? Call(trap, handler, « target, P, descObj »)).
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P, descObj])));
    // 10. If booleanTrapResult is false, return false.
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    // 11. Let targetDesc be ? target.[[GetOwnProperty]](P).
    const targetDesc = Q(target.GetOwnProperty(P));
    // 12. Let extensibleTarget be ? IsExtensible(target).
    const extensibleTarget = Q(IsExtensible(target));
    let settingConfigFalse;
    // 13. If Desc has a [[Configurable]] field and if Desc.[[Configurable]] is false, then
    if (Desc.Configurable !== undefined && Desc.Configurable === Value.false) {
      // a. Let settingConfigFalse be true.
      settingConfigFalse = true;
    } else {
      // Else, let settingConfigFalse be false.
      settingConfigFalse = false;
    }
    // 15. If targetDesc is undefined, then
    if (targetDesc === Value.undefined) {
      // a. If extensibleTarget is false, throw a TypeError exception.
      if (extensibleTarget === Value.false) {
        return surroundingAgent.Throw('TypeError', 'ProxyDefinePropertyNonExtensible', P);
      }
      // b. If settingConfigFalse is true, throw a TypeError exception.
      if (settingConfigFalse === true) {
        return surroundingAgent.Throw('TypeError', 'ProxyDefinePropertyNonConfigurable', P);
      }
    } else {
      // a. If IsCompatiblePropertyDescriptor(extensibleTarget, Desc, targetDesc) is false, throw a TypeError exception.
      if (IsCompatiblePropertyDescriptor(extensibleTarget, Desc, targetDesc) === Value.false) {
        return surroundingAgent.Throw('TypeError', 'ProxyDefinePropertyIncompatible', P);
      }
      // b. If settingConfigFalse is true and targetDesc.[[Configurable]] is true, throw a TypeError exception.
      if (settingConfigFalse === true && targetDesc.Configurable === Value.true) {
        return surroundingAgent.Throw('TypeError', 'ProxyDefinePropertyNonConfigurable', P);
      }
      // c. If IsDataDescriptor(targetDesc) is true, targetDesc.[[Configurable]] is false, and targetDesc.[[Writable]] is true, then
      if (IsDataDescriptor(targetDesc)
          && targetDesc.Configurable === Value.false
          && targetDesc.Writable === Value.true) {
        // i. If Desc has a [[Writable]] field and Desc.[[Writable]] is false, throw a TypeError exception.
        if ('Writable' in Desc && Desc.Writable === Value.false) {
          return surroundingAgent.Throw('TypeError', 'ProxyDefinePropertyNonConfigurableWritable', P);
        }
      }
    }
    return Value.true;
  }

  HasProperty(P) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'has');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('has')));
    if (trap === Value.undefined) {
      return Q(target.HasProperty(P));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P])));
    if (booleanTrapResult === Value.false) {
      const targetDesc = Q(target.GetOwnProperty(P));
      if (targetDesc !== Value.undefined) {
        if (targetDesc.Configurable === Value.false) {
          return surroundingAgent.Throw('TypeError', 'ProxyHasNonConfigurable', P);
        }
        const extensibleTarget = Q(IsExtensible(target));
        if (extensibleTarget === Value.false) {
          return surroundingAgent.Throw('TypeError', 'ProxyHasNonExtensible', P);
        }
      }
    }
    return booleanTrapResult;
  }

  Get(P, Receiver) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'get');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('get')));
    if (trap === Value.undefined) {
      return Q(target.Get(P, Receiver));
    }
    const trapResult = Q(Call(trap, handler, [target, P, Receiver]));
    const targetDesc = Q(target.GetOwnProperty(P));
    if (targetDesc !== Value.undefined && targetDesc.Configurable === Value.false) {
      if (IsDataDescriptor(targetDesc) === true && targetDesc.Writable === Value.false) {
        if (SameValue(trapResult, targetDesc.Value) === Value.false) {
          return surroundingAgent.Throw('TypeError', 'ProxyGetNonConfigurableData', P);
        }
      }
      if (IsAccessorDescriptor(targetDesc) === true && targetDesc.Get === Value.undefined) {
        if (trapResult !== Value.undefined) {
          return surroundingAgent.Throw('TypeError', 'ProxyGetNonConfigurableAccessor', P);
        }
      }
    }
    return trapResult;
  }

  Set(P, V, Receiver) {
    const O = this;

    Assert(IsPropertyKey(P));
    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'set');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('set')));
    if (trap === Value.undefined) {
      return Q(target.Set(P, V, Receiver));
    }
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P, V, Receiver])));
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    const targetDesc = Q(target.GetOwnProperty(P));
    if (targetDesc !== Value.undefined && targetDesc.Configurable === Value.false) {
      if (IsDataDescriptor(targetDesc) === true && targetDesc.Writable === Value.false) {
        if (SameValue(V, targetDesc.Value) === Value.false) {
          return surroundingAgent.Throw('TypeError', 'ProxySetFrozenData', P);
        }
      }
      if (IsAccessorDescriptor(targetDesc) === true) {
        if (targetDesc.Set === Value.undefined) {
          return surroundingAgent.Throw('TypeError', 'ProxySetFrozenAccessor', P);
        }
      }
    }
    return Value.true;
  }

  Delete(P) {
    const O = this;

    // 1. Assert: IsPropertyKey(P) is true.
    Assert(IsPropertyKey(P));
    // 2. Let handler be O.[[ProxyHandler]].
    const handler = O.ProxyHandler;
    // 3. If handler is null, throw a TypeError exception.
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'deleteProperty');
    }
    // 4. Assert: Type(handler) is Object.
    Assert(Type(handler) === 'Object');
    // 5. Let target be O.[[ProxyTarget]].
    const target = O.ProxyTarget;
    // 6. Let trap be ? GetMethod(handler, "deleteProperty").
    const trap = Q(GetMethod(handler, new Value('deleteProperty')));
    // 7. If trap is undefined, then
    if (trap === Value.undefined) {
      // a. Return ? target.[[Delete]](P).
      return Q(target.Delete(P));
    }
    // 8. Let booleanTrapResult be ! ToBoolean(? Call(trap, handler, « target, P »)).
    const booleanTrapResult = ToBoolean(Q(Call(trap, handler, [target, P])));
    // 9. If booleanTrapResult is false, return false.
    if (booleanTrapResult === Value.false) {
      return Value.false;
    }
    // 10. Let targetDesc be ? target.[[GetOwnProperty]](P).
    const targetDesc = Q(target.GetOwnProperty(P));
    // 11. If targetDesc is undefined, return true.
    if (targetDesc === Value.undefined) {
      return Value.true;
    }
    // 12. If targetDesc.[[Configurable]] is false, throw a TypeError exception.
    if (targetDesc.Configurable === Value.false) {
      return surroundingAgent.Throw('TypeError', 'ProxyDeletePropertyNonConfigurable', P);
    }
    // 13. Let extensibleTarget be ? IsExtensible(target).
    const extensibleTarget = Q(IsExtensible(target));
    // 14. If extensibleTarget is false, throw a TypeError exception.
    if (extensibleTarget === Value.false) {
      return surroundingAgent.Throw('TypeError', 'ProxyDeletePropertyNonExtensible', P);
    }
    // 15. Return true.
    return Value.true;
  }

  OwnPropertyKeys() {
    const O = this;

    const handler = O.ProxyHandler;
    if (handler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'ownKeys');
    }
    Assert(Type(handler) === 'Object');
    const target = O.ProxyTarget;
    const trap = Q(GetMethod(handler, new Value('ownKeys')));
    if (trap === Value.undefined) {
      return Q(target.OwnPropertyKeys());
    }
    const trapResultArray = Q(Call(trap, handler, [target]));
    const trapResult = Q(CreateListFromArrayLike(trapResultArray, ['String', 'Symbol']));
    if (new ValueSet(trapResult).size !== trapResult.length) {
      return surroundingAgent.Throw('TypeError', 'ProxyOwnKeysDuplicateEntries');
    }
    const extensibleTarget = Q(IsExtensible(target));
    const targetKeys = Q(target.OwnPropertyKeys());
    // Assert: targetKeys is a List containing only String and Symbol values.
    // Assert: targetKeys contains no duplicate entries.
    const targetConfigurableKeys = [];
    const targetNonconfigurableKeys = [];
    for (const key of targetKeys) {
      const desc = Q(target.GetOwnProperty(key));
      if (desc !== Value.undefined && desc.Configurable === Value.false) {
        targetNonconfigurableKeys.push(key);
      } else {
        targetConfigurableKeys.push(key);
      }
    }
    if (extensibleTarget === Value.true && targetNonconfigurableKeys.length === 0) {
      return trapResult;
    }
    const uncheckedResultKeys = new ValueSet(trapResult);
    for (const key of targetNonconfigurableKeys) {
      if (!uncheckedResultKeys.has(key)) {
        return surroundingAgent.Throw('TypeError', 'ProxyOwnKeysMissing', 'non-configurable key');
      }
      uncheckedResultKeys.delete(key);
    }
    if (extensibleTarget === Value.true) {
      return trapResult;
    }
    for (const key of targetConfigurableKeys) {
      if (!uncheckedResultKeys.has(key)) {
        return surroundingAgent.Throw('TypeError', 'ProxyOwnKeysMissing', 'configurable key');
      }
      uncheckedResultKeys.delete(key);
    }
    if (uncheckedResultKeys.size > 0) {
      return surroundingAgent.Throw('TypeError', 'ProxyOwnKeysNonExtensible');
    }
    return trapResult;
  }
}
ProxyExoticObjectValue.prototype.isOrdinary = false;

export class Reference {
  constructor({ BaseValue, ReferencedName, StrictReference }) {
    this.BaseValue = BaseValue;
    this.ReferencedName = ReferencedName;
    Assert(Type(StrictReference) === 'Boolean');
    this.StrictReference = StrictReference;
  }
}

export class SuperReference extends Reference {
  constructor({
    BaseValue,
    ReferencedName,
    thisValue,
    StrictReference,
  }) {
    super({ BaseValue, ReferencedName, StrictReference });
    this.thisValue = thisValue;
  }
}

export function Descriptor(O) {
  if (new.target === Descriptor) {
    this.Value = O.Value;
    this.Get = O.Get;
    this.Set = O.Set;
    this.Writable = O.Writable;
    this.Enumerable = O.Enumerable;
    this.Configurable = O.Configurable;
  } else {
    return new Descriptor(O);
  }
}

Descriptor.prototype.everyFieldIsAbsent = function everyFieldIsAbsent() {
  return this.Value === undefined
    && this.Get === undefined
    && this.Set === undefined
    && this.Writable === undefined
    && this.Enumerable === undefined
    && this.Configurable === undefined;
};

export class DataBlock extends Uint8Array {
  constructor(sizeOrBuffer, ...restArgs) {
    if (sizeOrBuffer instanceof ArrayBuffer) {
      // fine.
      super(sizeOrBuffer, ...restArgs);
    } else {
      Assert(typeof sizeOrBuffer === 'number');
      super(sizeOrBuffer);
    }
  }
}

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

  if (val instanceof Reference) {
    return 'Reference';
  }

  if (val instanceof Completion) {
    return 'Completion';
  }

  if (val instanceof EnvironmentRecord) {
    return 'EnvironmentRecord';
  }

  if (val instanceof LexicalEnvironment) {
    return 'LexicalEnvironment';
  }

  if (val instanceof Descriptor) {
    return 'Descriptor';
  }

  if (val instanceof DataBlock) {
    return 'Data Block';
  }

  throw new OutOfRange('Type', val);
}

// Used for Type(x)::y for numerics
export function TypeNumeric(val) {
  if (val instanceof NumberValue) {
    return NumberValue;
  }

  if (val instanceof BigIntValue) {
    return BigIntValue;
  }

  throw new OutOfRange('TypeNumeric', val);
}
