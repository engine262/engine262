import {
  New as NewValue,
  ProxyExoticObjectValue,
  Type,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  ToNumber,
  ToPrimitive,
  ValidateAndApplyPropertyDescriptor,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-requireobjectcoercible
export function RequireObjectCoercible(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError', 'undefined cannot be convered to an object');
    case 'Null':
      return surroundingAgent.Throw('TypeError', 'null cannot be converted to an object');
    case 'Boolean':
    case 'Number':
    case 'String':
    case 'Symbol':
    case 'Object':
      return argument;
    default:
      throw outOfRange('RequireObjectCoercible', argument);
  }
}

// 7.2.2 IsArray
export function IsArray(argument) {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if (Type(argument) === 'Array') {
    return NewValue(true);
  }
  if (argument instanceof ProxyExoticObjectValue) {
    if (Type(argument.ProxyHandler) === 'Null') {
      return surroundingAgent.Throw('TypeError');
    }
    const target = argument.ProxyTarget;
    return IsArray(target);
  }
  return NewValue(false);
}

// 7.2.3 IsCallable
export function IsCallable(argument) {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if ('Call' in argument) {
    return NewValue(true);
  }
  return NewValue(false);
}

// 7.2.4 IsConstructor
export function IsConstructor(argument) {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if ('Construct' in argument) {
    return NewValue(true);
  }
  return NewValue(false);
}

// 7.2.5 IsExtensible
export function IsExtensible(O) {
  Assert(Type(O) === 'Object');
  return O.IsExtensible();
}

// 7.2.10 SameValue
export function SameValue(x, y) {
  if (Type(x) !== Type(y)) {
    return false;
  }

  if (Type(x) === 'Number') {
    if (x.isNaN() && y.isNaN()) {
      return true;
    }
    const xVal = x.numberValue();
    const yVal = y.numberValue();
    if (Object.is(xVal, 0) && Object.is(yVal, -0)) {
      return false;
    }
    if (Object.is(xVal, -0) && Object.is(yVal, 0)) {
      return false;
    }
    if (xVal === yVal) {
      return true;
    }
    return false;
  }

  return SameValueNonNumber(x, y);
}

// #sec-samevaluezero
export function SameValueZero(x, y) {
  if (Type(x) !== Type(y)) {
    return NewValue(false);
  }
  if (Type(x) === 'Number') {
    if (x.isNaN() && y.isNaN()) {
      return true;
    }
    // If x is +0 and y is -0, return true.
    // If x is -0 and y is +0, return true.
    // If x is the same Number value as y, return true.
    if (x.numberValue() === y.numberValue()) {
      return NewValue(true);
    }
    return NewValue(false);
  }
  return NewValue(SameValueNonNumber(x, y));
}

// 7.2.12 SameValueNonNumber
export function SameValueNonNumber(x, y) {
  Assert(Type(x) !== 'Number');
  Assert(Type(x) === Type(y));

  if (Type(x) === 'Undefined') {
    return true;
  }

  if (Type(x) === 'Null') {
    return true;
  }

  if (Type(x) === 'String') {
    if (x.stringValue() === y.stringValue()) {
      return true;
    }
    return false;
  }

  if (Type(x) === 'Boolean') {
    if (x.isTrue() === y.isTrue()) {
      return true;
    }
    return false;
  }

  if (Type(x) === 'Symbol') {
    return x === y;
  }

  return x === y;
}

// 7.2.7 IsPropertyKey
export function IsPropertyKey(argument) {
  if (Type(argument) === 'String') {
    return true;
  }
  if (Type(argument) === 'Symbol') {
    return true;
  }
  return false;
}

// #sec-ispromise
export function IsPromise(x) {
  if (Type(x) !== 'Object') {
    return NewValue(false);
  }
  if (!('PromiseState' in x)) {
    return NewValue(false);
  }
  return NewValue(true);
}

// #sec-isinteger
export function IsInteger(argument) {
  if (Type(argument) !== 'Number') {
    return false;
  }
  if (argument.isNaN() || argument.isInfinity()) {
    return false;
  }
  if (Math.floor(Math.abs(argument.numberValue())) !== argument.numberValue()) {
    return false;
  }
  return true;
}

// #sec-isstringprefix
export function IsStringPrefix(p, q) {
  Assert(Type(p) === 'String');
  Assert(Type(q) === 'String');
  return p.stringValue().startsWith(q.stringValue());
}

// #sec-iscompatiblepropertydescriptor
export function IsCompatiblePropertyDescriptor(Extensible, Desc, Current) {
  return ValidateAndApplyPropertyDescriptor(
    NewValue(undefined), NewValue(undefined), Extensible, Desc, Current,
  );
}

// #sec-abstract-relational-comparison
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
      return NewValue(false);
    }
    if (IsStringPrefix(px, py)) {
      return NewValue(true);
    }
    let k = 0;
    while (true) {
      if (px.stringValue()[k] !== py.stringValue[k]) {
        break;
      }
      k += 1;
    }
    const m = px.stringValue().charCodeAt(k);
    const n = py.stringValue().charCodeAt(k);
    if (m < n) {
      return NewValue(true);
    } else {
      return NewValue(false);
    }
  } else {
    const nx = Q(ToNumber(px));
    const ny = Q(ToNumber(py));
    if (nx.isNaN()) {
      return NewValue(undefined);
    }
    if (y.isNaN()) {
      return NewValue(undefined);
    }
    // If nx and ny are the same Number value, return false.
    // If nx is +0 and ny is -0, return false.
    // If nx is -0 and ny is +0, return false.
    if (nx.numberValue() === ny.numberValue()) {
      return NewValue(false);
    }
    if (nx.numberValue() === +Infinity) {
      return NewValue(false);
    }
    if (ny.numberValue() === +Infinity) {
      return NewValue(true);
    }
    if (ny.numberValue() === -Infinity) {
      return NewValue(false);
    }
    if (nx.numberValue() === -Infinity) {
      return NewValue(true);
    }
    return NewValue(nx.numberValue() < ny.numberValue());
  }
}

// #sec-abstract-equality-comparison
export function AbstractEqualityComparison(x, y) {
  if (Type(x) === Type(y)) {
    return StrictEqualityComparision(x, y);
  }
  if (Type(x) === 'Null' && Type(y) === 'Undefined') {
    return NewValue(true);
  }
  if (Type(x) === 'Undefined' && Type(y) === 'Null') {
    return NewValue(true);
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
    return AbstractEqualityComparison(x, ToPrimitive(y));
  }
  if (Type(x) === 'Object' && ['String', 'Number', 'Symbol'].includes(Type(y))) {
    return AbstractEqualityComparison(ToPrimitive(x), y);
  }
  return NewValue(false);
}

// #sec-strict-equality-comparison
export function StrictEqualityComparision(x, y) {
  if (Type(x) !== Type(y)) {
    return NewValue(false);
  }
  if (Type(x) === 'Number') {
    if (x.isNaN()) {
      return NewValue(false);
    }
    if (y.isNaN()) {
      return NewValue(false);
    }
    // If x is the same Number value as y, return true.
    // If x is +0 and y is -0, return true.
    // If x is -0 and y is +0, return true.
    if (x.numberValue() === y.numberValue()) {
      return NewValue(true);
    }
    return NewValue(false);
  }
  return NewValue(SameValueNonNumber(x, y));
}
