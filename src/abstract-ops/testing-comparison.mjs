import {
  ArrayExoticObjectValue,
  ProxyExoticObjectValue,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Get,
  ToBoolean,
  ToNumber,
  ToPrimitive,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { OutOfRange, msg } from '../helpers.mjs';

// This file covers abstract operations defined in
// 7.2 #sec-testing-and-comparison-operations

// 7.2.1 #sec-requireobjectcoercible
export function RequireObjectCoercible(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError', msg('CannotConvertToObject', 'undefined'));
    case 'Null':
      return surroundingAgent.Throw('TypeError', msg('CannotConvertToObject', 'null'));
    case 'Boolean':
    case 'Number':
    case 'String':
    case 'Symbol':
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
  if (argument instanceof ArrayExoticObjectValue) {
    return Value.true;
  }
  if (argument instanceof ProxyExoticObjectValue) {
    if (Type(argument.ProxyHandler) === 'Null') {
      return surroundingAgent.Throw('TypeError', msg('ProxyRevoked', 'IsArray'));
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
export function IsInteger(argument) {
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
  if (Type(x) !== Type(y)) {
    return Value.false;
  }

  if (Type(x) === 'Number') {
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

  return SameValueNonNumber(x, y);
}

// 7.2.11 #sec-samevaluezero
export function SameValueZero(x, y) {
  if (Type(x) !== Type(y)) {
    return Value.false;
  }
  if (Type(x) === 'Number') {
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
  return SameValueNonNumber(x, y);
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
  if (LeftFirst === true) {
    px = Q(ToPrimitive(x, 'Number'));
    py = Q(ToPrimitive(y, 'Number'));
  } else {
    py = Q(ToPrimitive(y, 'Number'));
    px = Q(ToPrimitive(x, 'Number'));
  }
  if (Type(px) === 'String' && Type(py) === 'String') {
    if (IsStringPrefix(py, px)) {
      return Value.false;
    }
    if (IsStringPrefix(px, py)) {
      return Value.true;
    }
    let k = 0;
    while (true) {
      if (px.stringValue()[k] !== py.stringValue()[k]) {
        break;
      }
      k += 1;
    }
    const m = px.stringValue().charCodeAt(k);
    const n = py.stringValue().charCodeAt(k);
    if (m < n) {
      return Value.true;
    } else {
      return Value.false;
    }
  } else {
    const nx = Q(ToNumber(px));
    const ny = Q(ToNumber(py));
    if (nx.isNaN()) {
      return Value.undefined;
    }
    if (ny.isNaN()) {
      return Value.undefined;
    }
    // If nx and ny are the same Number value, return false.
    // If nx is +0 and ny is -0, return false.
    // If nx is -0 and ny is +0, return false.
    if (nx.numberValue() === ny.numberValue()) {
      return Value.false;
    }
    if (nx.numberValue() === +Infinity) {
      return Value.false;
    }
    if (ny.numberValue() === +Infinity) {
      return Value.true;
    }
    if (ny.numberValue() === -Infinity) {
      return Value.false;
    }
    if (nx.numberValue() === -Infinity) {
      return Value.true;
    }
    return nx.numberValue() < ny.numberValue() ? Value.true : Value.false;
  }
}

// 7.2.14 #sec-abstract-equality-comparison
export function AbstractEqualityComparison(x, y) {
  if (Type(x) === Type(y)) {
    return StrictEqualityComparison(x, y);
  }
  if (x === Value.null && y === Value.undefined) {
    return Value.true;
  }
  if (x === Value.undefined && y === Value.null) {
    return Value.true;
  }
  if (Type(x) === 'Number' && Type(y) === 'String') {
    return AbstractEqualityComparison(x, X(ToNumber(y)));
  }
  if (Type(x) === 'String' && Type(y) === 'Number') {
    return AbstractEqualityComparison(X(ToNumber(x)), y);
  }
  if (Type(x) === 'Boolean') {
    return AbstractEqualityComparison(X(ToNumber(x)), y);
  }
  if (Type(y) === 'Boolean') {
    return AbstractEqualityComparison(x, X(ToNumber(y)));
  }
  if (['String', 'Number', 'Symbol'].includes(Type(x)) && Type(y) === 'Object') {
    return AbstractEqualityComparison(x, Q(ToPrimitive(y)));
  }
  if (Type(x) === 'Object' && ['String', 'Number', 'Symbol'].includes(Type(y))) {
    return AbstractEqualityComparison(Q(ToPrimitive(x)), y);
  }
  return Value.false;
}

// 7.2.15 #sec-strict-equality-comparison
export function StrictEqualityComparison(x, y) {
  if (Type(x) !== Type(y)) {
    return Value.false;
  }
  if (Type(x) === 'Number') {
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
  return SameValueNonNumber(x, y);
}
