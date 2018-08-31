import {
  wellKnownSymbols,
  PrimitiveValue,
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
  SameValue,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

// 7.1.1 ToPrimitive
export function ToPrimitive(
  input,
  preferredType,
) {
  if (Type(input) === 'Object') {
    let hint;
    if (preferredType === undefined) {
      hint = NewValue('default');
    } else if (preferredType === 'String') {
      hint = NewValue('string');
    } else {
      Assert(preferredType === 'Number');
      hint = NewValue('number');
    }
    const exoticToPrim = Q(GetMethod(input, wellKnownSymbols.toPrimitive));
    if (Type(exoticToPrim) !== 'Undefined') {
      const result = Q(Call(exoticToPrim, input, [hint]));
      if (Type(result) !== 'Object') {
        return result;
      }
      return surroundingAgent.Throw('TypeError');
    }
    if (hint.stringValue() === 'default') {
      hint = NewValue('number');
    }
    return Q(OrdinaryToPrimitive(input, hint));
  }
  Assert(input instanceof PrimitiveValue);
  return input;
}

// 7.1.1.1 OrdinaryToPrimitive
export function OrdinaryToPrimitive(
  O, hint,
) {
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
    const method = Q(Get(O, name));
    if (IsCallable(method).isTrue()) {
      const result = Q(Call(method, O));
      if (Type(result) !== 'Object') {
        return result;
      }
    }
  }
  return surroundingAgent.Throw('TypeError');
}

// 7.1.2 ToBoolean
export function ToBoolean(argument) {
  if (Type(argument) === 'Undefined') {
    return NewValue(false);
  }

  if (Type(argument) === 'Null') {
    return NewValue(false);
  }

  if (Type(argument) === 'Boolean') {
    return argument;
  }

  if (Type(argument) === 'Number') {
    if (argument.numberValue() === 0 || argument.isNaN()) {
      return NewValue(false);
    }
    return NewValue(true);
  }

  if (Type(argument) === 'String') {
    if (argument.stringValue().length > 0) {
      return NewValue(true);
    }
    return NewValue(false);
  }

  if (Type(argument) === 'Symbol') {
    return NewValue(true);
  }

  if (Type(argument) === 'Object') {
    return NewValue(true);
  }

  throw outOfRange('ToBoolean', argument);
}

// 7.1.3 ToNumber
export function ToNumber(argument) {
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
    case 'String':
      // FIXME(devsnek): https://tc39.github.io/ecma262/#sec-runtime-semantics-mv-s
      return NewValue(+(argument.stringValue()));
    case 'Symbol':
      return surroundingAgent.Throw('TypeError');
    case 'Object': {
      const primValue = Q(ToPrimitive(argument, 'Number'));
      return Q(ToNumber(primValue));
    }
    default:
      throw outOfRange('ToNumber', argument);
  }
}

// 7.1.4 ToInteger
export function ToInteger(argument) {
  const number = Q(ToNumber(argument));
  if (number.isNaN()) {
    return NewValue(0);
  }
  if (number.numberValue() === 0 // || number.value === -0
      || number.numberValue() === Infinity
      || number.numberValue() === -Infinity) {
    return number;
  }
  // Return the number value that is the same sign
  // as number and whose magnitude is floor(abs(number)).
  const mag = Math.floor(Math.abs(number.numberValue()));
  return NewValue(number.numberValue() >= 0 ? mag : -mag);
}

// #sec-toint32
export function ToInt32(argument) {
  const number = Q(ToNumber(argument));
  if (number.isNaN() || number.isInfinity() || number.numberValue() === 0) {
    return NewValue(0);
  }
  const int = Math.floor(Math.abs(number.numberValue())) * (number.numberValue() > 0 ? 1 : -1);
  const int32bit = int % (2 ** 32);
  if (int32bit > (2 ** 31)) {
    return int32bit - (2 ** 32);
  }
  return int32bit;
}

// 7.1.6 ToUint32
export function ToUint32(argument) {
  const number = Q(ToNumber(argument));
  if (number.numberValue() === 0 // || number.value === -0
      || number.numberValue() === Infinity
      || number.numberValue() === -Infinity) {
    return NewValue(0);
  }
  const int = Math.floor(Math.abs(number.numberValue())) * (number.numberValue() > 0 ? 1 : -1);
  const int32bit = int % (2 ** 32);
  return NewValue(int32bit);
}

// 7.1.12 ToString
export function ToString(argument) {
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
      const primValue = Q(ToPrimitive(argument, 'String'));
      return Q(ToString(primValue));
    }
    default:
      throw outOfRange('ToString', argument);
  }
}

// 7.1.12.1 NumberToString
export function NumberToString(m) {
  if (m.isNaN()) {
    return NewValue('NaN');
  }
  const mVal = m.numberValue();
  if (m.numberValue() === 0) {
    return NewValue('0');
  }
  if (mVal < 0) {
    return NewValue(`-${NumberToString(NewValue(-mVal)).stringValue()}`);
  }
  if (m.isInfinity()) {
    return NewValue('Infinity');
  }
  // TODO: implement properly
  return NewValue(`${mVal}`);
}

// 7.1.13 ToObject
export function ToObject(argument) {
  const type = Type(argument);
  const realm = surroundingAgent.currentRealmRecord;
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError');
    case 'Null':
      return surroundingAgent.Throw('TypeError');
    case 'Boolean': {
      const obj = new ObjectValue(realm, realm.Intrinsics['%BooleanPrototype%']);
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      const obj = new ObjectValue(realm, realm.Intrinsics['%NumberPrototype%']);
      obj.NumberData = argument;
      return obj;
    }
    case 'String': {
      const obj = new ObjectValue(realm, realm.Intrinsics['%StringPrototype%']);
      obj.StringData = argument;
      return obj;
    }
    case 'Symbol': {
      const obj = new ObjectValue(realm, realm.Intrinsics['%SymbolPrototype%']);
      obj.SymbolData = argument;
      return obj;
    }
    case 'Object':

      return argument;
    default:
      throw outOfRange('ToObject', argument);
  }
}

// 7.1.14 ToPropertyKey
export function ToPropertyKey(argument) {
  const key = Q(ToPrimitive(argument, 'String'));
  if (Type(key) === 'Symbol') {
    return key;
  }
  return ToString(key);
}

// 7.1.15 ToLength
export function ToLength(argument) {
  const len = Q(ToInteger(argument));
  if (len.numberValue() <= 0) {
    return NewValue(0);
  }
  return NewValue(Math.min(len.numberValue(), (2 ** 53) - 1));
}

// #sec-canonicalnumericindexstring
export function CanonicalNumericIndexString(argument) {
  Assert(Type(argument) === 'String');
  if (argument.stringValue() === '-0') {
    return -0;
  }
  const n = X(ToNumber(argument));
  if (SameValue(X(ToString(n)), argument) === false) {
    return NewValue(undefined);
  }
  return n;
}
