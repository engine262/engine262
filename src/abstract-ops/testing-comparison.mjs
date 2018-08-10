/* @flow */

/* ::
import type {
  Value,
  BooleanValue,
  NumberValue,
  StringValue,
  ObjectValue,
} from '../value';
*/

import {
  Type,
  NullValue,
  ArrayValue,
  ProxyValue,
  New as NewValue,
} from '../value';

import {
  surroundingAgent,
} from '../engine';

import {
  Assert,
} from './notational-conventions';

// #sec-requireobjectcoercible
export function RequireObjectCoercible(argument /* : Value */) {
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
export function IsArray(argument /* : Value */) /* : BooleanValue */ {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if (argument instanceof ArrayValue) {
    return NewValue(true);
  }
  if (argument instanceof ProxyValue) {
    if (argument.ProxyHandler instanceof NullValue) {
      return surroundingAgent.Throw('TypeError');
    }
    const target = argument.ProxyTarget;
    return IsArray(target);
  }
  return NewValue(false);
}

// 7.2.3 IsCallable
export function IsCallable(argument /* : Value */) {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if ('Call' in argument) {
    return NewValue(true);
  }
  return NewValue(false);
}

// 7.2.4 IsConstructor
export function IsConstructor(argument /* : Value */) {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if ('Construct' in argument) {
    return NewValue(true);
  }
  return NewValue(false);
}

// 7.2.5 IsExtensible
export function IsExtensible(O /* : ObjectValue */) /* : BooleanValue */ {
  Assert(Type(O) === 'Object');
  return O.IsExtensible();
}

// 7.2.10 SameValue
export function SameValue(x /* : Value */, y /* : Value */) /* : boolean */ {
  if (Type(x) !== Type(y)) {
    return false;
  }

  if (Type(x) === 'Number') {
    /* :: x = ((x : any) : NumberValue); */
    /* :: y = ((y : any) : NumberValue); */
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
export function SameValueNonNumber(x /* : Value */, y /* : Value */) /* : boolean */ {
  Assert(Type(x) !== 'Number');
  Assert(Type(x) === Type(y));

  if (Type(x) === 'Undefined') {
    return true;
  }

  if (Type(x) === 'Null') {
    return true;
  }

  if (Type(x) === 'String') {
    /* :: x = ((x: any): StringValue); */
    /* :: y = ((y: any): StringValue); */
    if (x.stringValue() === y.stringValue()) {
      return true;
    }
    return false;
  }

  if (Type(x) === 'Boolean') {
    /* :: x = ((x: any): BooleanValue); */
    /* :: y = ((y: any): BooleanValue); */
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
export function IsPropertyKey(argument /* : Value */) /* : boolean */ {
  if (Type(argument) === 'String') {
    return true;
  }
  if (Type(argument) === 'Symbol') {
    return true;
  }
  return false;
}

// #sec-ispromise
export function IsPromise(x /* : Value */) {
  if (Type(x) !== 'Object') {
    return NewValue(false);
  }
  if (!('PromiseState' in x)) {
    return NewValue(false);
  }
  return NewValue(true);
}
