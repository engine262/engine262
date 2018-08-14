import {
  Type,
  ProxyValue,
  New as NewValue,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  ValidateAndApplyPropertyDescriptor,
} from './all.mjs';

// #sec-requireobjectcoercible
export function RequireObjectCoercible(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
    case 'Null':
      return surroundingAgent.Throw('TypeError');
    case 'Boolean':
    case 'Number':
    case 'String':
    case 'Symbol':
    case 'Object':
      return argument;
    default:
      throw new RangeError('RequireObjectCoercible: unknown type');
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
  if (argument instanceof ProxyValue) {
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

// #sec-iscompatiblepropertydescriptor
export function IsCompatiblePropertyDescriptor(Extensible, Desc, Current) {
  return ValidateAndApplyPropertyDescriptor(
    NewValue(undefined), NewValue(undefined), Extensible, Desc, Current,
  );
}
