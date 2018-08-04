/* @flow */

/* ::
import type {
  Value,
  ObjectValue,
} from '../value.mjs';
*/

import {
  Type,
  NullValue,
  ArrayValue,
  ProxyValue,
  New as NewValue,
} from '../value.mjs';

import {
  surroundingAgent,
} from '../engine.mjs';

import {
  Assert,
} from './all.mjs';

// 7.2.2 IsArray
export function IsArray(argument /* : Value */) {
  if (Type(argument) !== 'Object') {
    return NewValue(false);
  }
  if (argument instanceof ArrayValue) {
    return NewValue(true);
  }
  if (argument instanceof ProxyValue) {
    if (argument.ProxyHandler instanceof NullValue) {
      surroundingAgent.Throw('TypeError');
    }
    const target = argument.ProxyTarget;
    return IsArray(target);
  }
  return NewValue(false);
}

// 7.2.3 IsCallable
export function IsCallable(argument /* : Value */) {
  if (Type(argument) !== 'Object') {
    return false;
  }
  if ('Call' in argument) {
    return true;
  }
  return false;
}

// 7.2.4 IsConstructor
export function IsConstructor(argument /* : Value */) {
  if (Type(argument) !== 'Object') {
    return false;
  }
  if ('Construct' in argument) {
    return true;
  }
  return false;
}

// 7.2.5 IsExtensible
export function IsExtensible(O /* : ObjectValue */) {
  Assert(Type(O) === 'Object');
  return O.IsExtensible();
}

// 7.2.10 SameValue
export function SameValue(x /* : Value */, y /* : Value */) {
  if (Type(x) !== Type(y)) {
    return false;
  }

  if (Type(x) === 'Number') {
    if (x.isNaN() && y.isNaN()) {
      return true;
    }
    if (Object.is(x.numberValue(), 0) && Object.is(y.numberValue(), -0)) {
      return false;
    }
    if (Object.is(x.numberValue(), -0) && Object.is(y.numberValue(), 0)) {
      return false;
    }
    if (x.numberValue() === y.numberValue()) {
      return true;
    }
    return false;
  }

  return SameValueNonNumber(x, y);
}

// 7.2.12 SameValueNonNumber
export function SameValueNonNumber(x /* : Value */, y /* : Value */) {
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
    if (x.booleanValue() === y.booleanValue()) {
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
export function IsPropertyKey(argument /* : Value */) {
  if (Type(argument) === 'String') {
    return true;
  }
  if (Type(argument) === 'Symbol') {
    return true;
  }
  return false;
}
