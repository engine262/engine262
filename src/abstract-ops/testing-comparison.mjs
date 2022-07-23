import {
  BigIntValue,
  Type,
  TypeForMethod,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Assert,
  Get,
  IsDetachedBuffer,
  ToBoolean,
  ToNumber,
  ToNumeric,
  ToPrimitive,
  StringToBigInt,
  isProxyExoticObject,
  isArrayExoticObject,
} from './all.mjs';

// This file covers abstract operations defined in
// 7.2 #sec-testing-and-comparison-operations

// 7.2.1 #sec-requireobjectcoercible
export function RequireObjectCoercible(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'undefined');
    case 'Null':
      return surroundingAgent.Throw('TypeError', 'CannotConvertToObject', 'null');
    case 'Boolean':
    case 'Number':
    case 'String':
    case 'Symbol':
    case 'BigInt':
    case 'Object':
      return argument;
    default:
      throw new OutOfRange('RequireObjectCoercible', { type, argument });
  }
}

// 7.2.2 #sec-isarray
export function IsArray(argument) {
  if (Type(argument) !== 'Object') {
    return Value.false;
  }
  if (isArrayExoticObject(argument)) {
    return Value.true;
  }
  if (isProxyExoticObject(argument)) {
    if (argument.ProxyHandler === Value.null) {
      return surroundingAgent.Throw('TypeError', 'ProxyRevoked', 'IsArray');
    }
    const target = argument.ProxyTarget;
    return IsArray(target);
  }
  return Value.false;
}

// 7.2.3 #sec-iscallable
export function IsCallable(argument) {
  if (Type(argument) !== 'Object') {
    return Value.false;
  }
  if ('Call' in argument) {
    return Value.true;
  }
  return Value.false;
}

// 7.2.4 #sec-isconstructor
export function IsConstructor(argument) {
  if (Type(argument) !== 'Object') {
    return Value.false;
  }
  if ('Construct' in argument) {
    return Value.true;
  }
  return Value.false;
}

// 7.2.5 #sec-isextensible-o
export function IsExtensible(O) {
  Assert(Type(O) === 'Object');
  return O.IsExtensible();
}

// 7.2.6 #sec-isinteger
export function IsIntegralNumber(argument) {
  if (Type(argument) !== 'Number') {
    return Value.false;
  }
  if (argument.isNaN() || argument.isInfinity()) {
    return Value.false;
  }
  if (Math.floor(Math.abs(argument.numberValue())) !== Math.abs(argument.numberValue())) {
    return Value.false;
  }
  return Value.true;
}

// 7.2.7 #sec-ispropertykey
export function IsPropertyKey(argument) {
  if (Type(argument) === 'String') {
    return true;
  }
  if (Type(argument) === 'Symbol') {
    return true;
  }
  return false;
}

// 7.2.8 #sec-isregexp
export function IsRegExp(argument) {
  if (Type(argument) !== 'Object') {
    return Value.false;
  }
  const matcher = Q(Get(argument, wellKnownSymbols.match));
  if (matcher !== Value.undefined) {
    return ToBoolean(matcher);
  }
  if ('RegExpMatcher' in argument) {
    return Value.true;
  }
  return Value.false;
}

// 7.2.9 #sec-isstringprefix
export function IsStringPrefix(p, q) {
  Assert(Type(p) === 'String');
  Assert(Type(q) === 'String');
  return q.stringValue().startsWith(p.stringValue());
}

// 7.2.10 #sec-samevalue
export function SameValue(x, y) {
  // 1. If Type(x) is different from Type(y), return false.
  if (Type(x) !== Type(y)) {
    return Value.false;
  }
  // 2. If Type(x) is Number or BigInt, then
  if (Type(x) === 'Number' || Type(x) === 'BigInt') {
    // a. Return ! Type(x)::sameValue(x, y).
    return TypeForMethod(x).sameValue(x, y);
  }
  // 3. Return ! SameValueNonNumeric(x, y).
  return X(SameValueNonNumber(x, y));
}

// 7.2.11 #sec-samevaluezero
export function SameValueZero(x, y) {
  // 1. If Type(x) is different from Type(y), return false.
  if (Type(x) !== Type(y)) {
    return Value.false;
  }
  // 2. If Type(x) is Number or BigInt, then
  if (Type(x) === 'Number' || Type(x) === 'BigInt') {
    // a. Return ! Type(x)::sameValueZero(x, y).
    return TypeForMethod(x).sameValueZero(x, y);
  }
  // 3. Return ! SameValueNonNumeric(x, y).
  return X(SameValueNonNumber(x, y));
}

// 7.2.12 #sec-samevaluenonnumber
export function SameValueNonNumber(x, y) {
  Assert(Type(x) !== 'Number');
  Assert(Type(x) === Type(y));

  if (Type(x) === 'Undefined') {
    return Value.true;
  }

  if (Type(x) === 'Null') {
    return Value.true;
  }

  if (Type(x) === 'String') {
    if (x.stringValue() === y.stringValue()) {
      return Value.true;
    }
    return Value.false;
  }

  if (Type(x) === 'Boolean') {
    if (x === y) {
      return Value.true;
    }
    return Value.false;
  }

  if (Type(x) === 'Symbol') {
    return x === y ? Value.true : Value.false;
  }

  return x === y ? Value.true : Value.false;
}

// 7.2.13 #sec-abstract-relational-comparison
export function AbstractRelationalComparison(x, y, LeftFirst = true) {
  let px;
  let py;
  // 1. If the LeftFirst flag is true, then
  if (LeftFirst === true) {
    // a. Let px be ? ToPrimitive(x, number).
    px = Q(ToPrimitive(x, 'number'));
    // b. Let py be ? ToPrimitive(y, number).
    py = Q(ToPrimitive(y, 'number'));
  } else {
    // a. NOTE: The order of evaluation needs to be reversed to preserve left to right evaluation.
    // b. Let py be ? ToPrimitive(y, number).
    py = Q(ToPrimitive(y, 'number'));
    // c. Let px be ? ToPrimitive(x, number).
    px = Q(ToPrimitive(x, 'number'));
  }
  // 3. If Type(px) is String and Type(py) is String, then
  if (Type(px) === 'String' && Type(py) === 'String') {
    // a. If IsStringPrefix(py, px) is true, return false.
    if (IsStringPrefix(py, px)) {
      return Value.false;
    }
    // b. If IsStringPrefix(px, py) is true, return true.
    if (IsStringPrefix(px, py)) {
      return Value.true;
    }
    // c. Let k be the smallest nonnegative integer such that the code unit at index k within px
    //    is different from the code unit at index k within py. (There must be such a k, for
    //    neither String is a prefix of the other.)
    let k = 0;
    while (true) {
      if (px.stringValue()[k] !== py.stringValue()[k]) {
        break;
      }
      k += 1;
    }
    // d. Let m be the integer that is the numeric value of the code unit at index k within px.
    const m = px.stringValue().charCodeAt(k);
    // e. Let n be the integer that is the numeric value of the code unit at index k within py.
    const n = py.stringValue().charCodeAt(k);
    // f. If m < n, return true. Otherwise, return false.
    if (m < n) {
      return Value.true;
    } else {
      return Value.false;
    }
  } else {
    // a. If Type(px) is BigInt and Type(py) is String, then
    if (Type(px) === 'BigInt' && Type(py) === 'String') {
      // i. Let ny be ! StringToBigInt(py).
      const ny = X(StringToBigInt(py));
      // ii. If ny is NaN, return undefined.
      if (Number.isNaN(ny)) {
        return Value.undefined;
      }
      // iii. Return BigInt::lessThan(px, ny).
      return BigIntValue.lessThan(px, ny);
    }
    // b. If Type(px) is String and Type(py) is BigInt, then
    if (Type(px) === 'String' && Type(py) === 'BigInt') {
      // i. Let ny be ! StringToBigInt(py).
      const nx = X(StringToBigInt(px));
      // ii. If ny is NaN, return undefined.
      if (Number.isNaN(nx)) {
        return Value.undefined;
      }
      // iii. Return BigInt::lessThan(px, ny).
      return BigIntValue.lessThan(nx, py);
    }
    // c. Let nx be ? ToNumeric(px). NOTE: Because px and py are primitive values evaluation order is not important.
    const nx = Q(ToNumeric(px));
    // d. Let ny be ? ToNumeric(py).
    const ny = Q(ToNumeric(py));
    // e. If Type(nx) is the same as Type(ny), return Type(nx)::lessThan(nx, ny).
    if (Type(nx) === Type(ny)) {
      return TypeForMethod(nx).lessThan(nx, ny);
    }
    // f. Assert: Type(nx) is BigInt and Type(ny) is Number, or Type(nx) is Number and Type(ny) is BigInt.
    Assert((Type(nx) === 'BigInt' && Type(ny) === 'Number') || (Type(nx) === 'Number' && Type(ny) === 'BigInt'));
    // g. If nx or ny is NaN, return undefined.
    if ((nx.isNaN && nx.isNaN()) || (ny.isNaN && ny.isNaN())) {
      return Value.undefined;
    }
    // h. If nx is -∞ or ny is +∞, return true.
    if ((nx.numberValue && nx.numberValue() === -Infinity) || (ny.numberValue && ny.numberValue() === +Infinity)) {
      return Value.true;
    }
    // i. If nx is +∞ or ny is -∞, return false.
    if ((nx.numberValue && nx.numberValue() === +Infinity) || (ny.numberValue && ny.numberValue() === -Infinity)) {
      return Value.false;
    }
    // j. If the mathematical value of nx is less than the mathematical value of ny, return true; otherwise return false.
    const a = nx.numberValue ? nx.numberValue() : nx.bigintValue();
    const b = ny.numberValue ? ny.numberValue() : ny.bigintValue();
    return a < b ? Value.true : Value.false;
  }
}

// 7.2.14 #sec-abstract-equality-comparison
export function AbstractEqualityComparison(x, y) {
  // 1. If Type(x) is the same as Type(y), then
  if (Type(x) === Type(y)) {
    // a. Return the result of performing Strict Equality Comparison x === y.
    return StrictEqualityComparison(x, y);
  }
  // 2. If x is null and y is undefined, return true.
  if (x === Value.null && y === Value.undefined) {
    return Value.true;
  }
  // 3. If x is undefined and y is null, return true.
  if (x === Value.undefined && y === Value.null) {
    return Value.true;
  }
  // 4. If Type(x) is Number and Type(y) is String, return the result of the comparison x == ! ToNumber(y).
  if (Type(x) === 'Number' && Type(y) === 'String') {
    return AbstractEqualityComparison(x, X(ToNumber(y)));
  }
  // 5. If Type(x) is String and Type(y) is Number, return the result of the comparison ! ToNumber(x) == y.
  if (Type(x) === 'String' && Type(y) === 'Number') {
    return AbstractEqualityComparison(X(ToNumber(x)), y);
  }
  // 6. If Type(x) is BigInt and Type(y) is String, then
  if (Type(x) === 'BigInt' && Type(y) === 'String') {
    // a. Let n be ! StringToBigInt(y).
    const n = X(StringToBigInt(y));
    // b. If n is NaN, return false.
    if (Number.isNaN(n)) {
      return Value.false;
    }
    // c. Return the result of the comparison x == n.
    return AbstractEqualityComparison(x, n);
  }
  // 7. If Type(x) is String and Type(y) is BigInt, return the result of the comparison y == x.
  if (Type(x) === 'String' && Type(y) === 'BigInt') {
    return AbstractEqualityComparison(y, x);
  }
  // 8. If Type(x) is Boolean, return the result of the comparison ! ToNumber(x) == y.
  if (Type(x) === 'Boolean') {
    return AbstractEqualityComparison(X(ToNumber(x)), y);
  }
  // 9. If Type(y) is Boolean, return the result of the comparison x == ! ToNumber(y).
  if (Type(y) === 'Boolean') {
    return AbstractEqualityComparison(x, X(ToNumber(y)));
  }
  // 10. If Type(x) is either String, Number, BigInt, or Symbol and Type(y) is Object, return the result of the comparison x == ToPrimitive(y).
  if (['String', 'Number', 'BigInt', 'Symbol'].includes(Type(x)) && Type(y) === 'Object') {
    return AbstractEqualityComparison(x, Q(ToPrimitive(y)));
  }
  // 11. If Type(x) is Object and Type(y) is either String, Number, BigInt, or Symbol, return the result of the comparison ToPrimitive(x) == y.
  if (Type(x) === 'Object' && ['String', 'Number', 'BigInt', 'Symbol'].includes(Type(y))) {
    return AbstractEqualityComparison(Q(ToPrimitive(x)), y);
  }
  // 12. If Type(x) is BigInt and Type(y) is Number, or if Type(x) is Number and Type(y) is BigInt, then
  if ((Type(x) === 'BigInt' && Type(y) === 'Number') || (Type(x) === 'Number' && Type(y) === 'BigInt')) {
    // a. If x or y are any of NaN, +∞, or -∞, return false.
    if ((x.isNaN && (x.isNaN() || !x.isFinite())) || (y.isNaN && (y.isNaN() || !y.isFinite()))) {
      return Value.false;
    }
    // b. If the mathematical value of x is equal to the mathematical value of y, return true; otherwise return false.
    const a = (x.numberValue ? x.numberValue() : x.bigintValue());
    const b = (y.numberValue ? y.numberValue() : y.bigintValue());
    return a == b ? Value.true : Value.false; // eslint-disable-line eqeqeq
  }
  // 13. Return false.
  return Value.false;
}

// 7.2.15 #sec-strict-equality-comparison
export function StrictEqualityComparison(x, y) {
  // 1. If Type(x) is different from Type(y), return false.
  if (Type(x) !== Type(y)) {
    return Value.false;
  }
  // 2. If Type(x) is Number or BigInt, then
  if (Type(x) === 'Number' || Type(x) === 'BigInt') {
    // a. Return ! Type(x)::equal(x, y).
    return X(TypeForMethod(x).equal(x, y));
  }
  // 3. Return ! SameValueNonNumeric(x, y).
  return SameValueNonNumber(x, y);
}

// #sec-isvalidintegerindex
export function IsValidIntegerIndex(O, index) {
  if (IsDetachedBuffer(O.ViewedArrayBuffer) === Value.true) {
    return Value.false;
  }
  Assert(Type(index) === 'Number');
  if (IsIntegralNumber(index) === Value.false) {
    return Value.false;
  }
  index = index.numberValue();
  if (Object.is(index, -0)) {
    return Value.false;
  }
  if (index < 0 || index >= O.ArrayLength) {
    return Value.false;
  }
  return Value.true;
}
