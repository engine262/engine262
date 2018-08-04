/* @flow */

import {
  UndefinedValue,
  NullValue,
  BooleanValue,
  StringValue,
  NumberValue,
  SymbolValue,
  ObjectValue,
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  Call,
  Get,
  GetMethod,
  IsCallable,
} from './all.mjs';

/* ::
declare type Hint = 'String' | 'Number';
*/

// 7.1.1 ToPrimitive
export function ToPrimitive(input /* : Value */, preferredType /* : Hint */) /* : PrimitiveValue */ {
  if (Type(input) === 'Object') {
    let hint;
    if (preferredType === undefined) {
      hint = NewValue('default');
    } else if (preferredType === 'String') {
      hint = NewValue('string');
    } else if (preferredType === 'Number') {
      hint = NewValue('number');
    }
    const exoticToPrim = GetMethod(input, surroundingAgent.intrinsic('@@toPrimitive'));
    if (exoticToPrim.value !== undefined) {
      const result = Call(exoticToPrim, input, [hint]);
      if (Type(result) !== 'Object') {
        return result;
      }
      surroundingAgent.Throw('TypeError');
    }
    if (hint.stringValue() === 'default') {
      hint = NewValue('number');
    }
    return OrdinaryToPrimitive(input, hint);
  }
  return input;
}

// 7.1.1.1 OrdinaryToPrimitive
export function OrdinaryToPrimitive(
  O /* : ObjectValue */, hint /* : StringValue */,
) /* : PrimitiveValue */ {
  Assert(Type(O) === 'Object');
  Assert(Type(hint) === 'String'
         && (hint.stringValue() === 'string' || hint.stringValue() === 'number'));
  let methodNames;
  if (hint.stringValue() === 'string') {
    methodNames = [NewValue('toString'), NewValue('valueOf')];
  } else {
    methodNames = [NewValue('valueOf'), NewValue('toString')];
  }
  for (const name of methodNames) {
    const method = Get(O, name);
    if (IsCallable(method) === true) {
      const result = Call(method, O);
      if (Type(result) !== 'Object') {
        return result;
      }
    }
  }
  return surroundingAgent.Throw('TypeError');
}

// 7.1.2 ToBoolean
export function ToBoolean(argument /* : Value */) /* : BooleanValue */ {
  if (argument instanceof UndefinedValue) {
    return NewValue(false);
  }

  if (argument instanceof NullValue) {
    return NewValue(false);
  }

  if (argument instanceof BooleanValue) {
    return argument;
  }

  if (argument instanceof NumberValue) {
    if (argument.numberValue() === 0 || argument.isNaN()) {
      return NewValue(false);
    }
    return NewValue(true);
  }

  if (argument instanceof StringValue) {
    if (argument.stringValue().length > 0) {
      return NewValue(true);
    }
    return NewValue(false);
  }

  if (argument instanceof SymbolValue) {
    return NewValue(true);
  }

  if (argument instanceof ObjectValue) {
    return NewValue(true);
  }

  throw new RangeError('ToBoolean(argument) unknown type');
}

// 7.1.3 ToNumber
export function ToNumber(argument /* : Value */) /* : NumberValue */ {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return NewValue(NaN);
    case 'Null':
      return NewValue(0);
    case 'Boolean':
      if (argument.isTrue()) {
        return NewValue(1);
      }
      return NewValue(0);
    case 'Number':
      return argument;
    case 'Symbol':
      return surroundingAgent.Throw('TypeError');
    case 'Object': {
      const primValue = ToPrimitive(argument, 'Number');
      return ToNumber(primValue);
    }
    default:
      throw new RangeError('ToNumber(argument) unknown type');
  }
}

// 7.1.4 ToInteger
export function ToInteger(argument /* : Value */) {
  const number = ToNumber(argument);
  if (number.isNaN()) {
    return NewValue(0);
  }
  if (number.numberValue() === 0 // || number.value === -0
      || number.numberValue() === Infinity
      || number.numberValue() === -Infinity) {
    return number;
  }
  return NewValue(
    Math.floor(Math.abs(number.numberValue())) * number.numberValue() > 0 ? 1 : -1,
  );
}

// 7.1.6 ToUint32
export function ToUint32(argument /* : Value */) {
  const number = ToNumber(argument);
  if (number.numberValue() === 0 // || number.value === -0
      || number.numberValue() === Infinity
      || number.numberValue() === -Infinity) {
    return NewValue(0);
  }
  const int = Math.floor(Math.abs(number.numberValue())) * number.numberValue() > 0 ? 1 : -1;
  const int32bit = int % (2 ** 32);
  return NewValue(int32bit);
}

// 7.1.12 ToString
export function ToString(argument /* : Value */) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return NewValue('undefined');
    case 'Null':
      return NewValue('null');
    case 'Boolean':
      return NewValue(argument.isTrue() ? 'true' : 'false');
    case 'Number':
      return NumberToString(argument);
    case 'String':
      return argument;
    case 'Symbol':
      return surroundingAgent.Throw('TypeError');
    case 'Object': {
      const primValue = ToPrimitive(argument, 'String');
      return ToString(primValue);
    }
    default:
      throw new RangeError('ToString(argument) unknown type');
  }
}

// 7.1.12.1 NumberToString
export function NumberToString(m /* : NumberValue */) {
  if (m.isNaN()) {
    return NewValue('NaN');
  }
  if (m.numberValue() === 0) {
    return NewValue('0');
  }
}

// 7.1.13 ToObject
export function ToObject(argument /* : Value */) /* : ObjectValue */{
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError');
    case 'Null':
      return surroundingAgent.Throw('TypeError');
    case 'Boolean': {
      const obj = new ObjectValue(argument.realm, surroundingAgent.intrinsic('%BooleanPrototype%'));
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      const obj = new ObjectValue(argument.realm, surroundingAgent.intrinsic('%NumberPrototype%'));
      obj.NumberData = argument;
      return obj;
    }
    case 'String': {
      const obj = new ObjectValue(argument.realm, argument.realm.Intrinsics['%StringPrototype%']);
      obj.StringData = argument;
      return obj;
    }
    case 'Symbol': {
      const obj = new ObjectValue(argument.realm, argument.realm.Intrinsics['%SymbolPrototype%']);
      obj.SymbolData = argument;
      return obj;
    }
    case 'Object':
      return argument;
    default:
      throw new RangeError('ToObject(argument) unknown type');
  }
}

// 7.1.14 ToPropertyKey
export function ToPropertyKey(argument /* : Value */) {
  const key = ToPrimitive(argument, 'String');
  if (Type(key) === 'Symbol') {
    return key;
  }
  return ToString(key);
}

// 7.1.15 ToLength
export function ToLength(argument /* : Value */) {
  const len = ToInteger(argument);
  if (len.numberValue() <= 0) {
    return NewValue(0);
  }
  return NewValue(Math.min(len.numberValue(), (2 ** 53) - 1));
}
