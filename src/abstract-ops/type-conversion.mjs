import {
  Value,
  Type,
  wellKnownSymbols,
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
  ObjectCreate,
  SameValue,
  SameValueZero,
  StringCreate,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

// 7.1.1 #sec-toprimitive
export function ToPrimitive(input, PreferredType) {
  if (Type(input) === 'Object') {
    let hint;
    if (PreferredType === undefined) {
      hint = new Value('default');
    } else if (PreferredType === 'String') {
      hint = new Value('string');
    } else {
      Assert(PreferredType === 'Number');
      hint = new Value('number');
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
      hint = new Value('number');
    }
    return Q(OrdinaryToPrimitive(input, hint));
  }
  return input;
}

// 7.1.1.1 #sec-ordinarytoprimitive
export function OrdinaryToPrimitive(
  O, hint,
) {
  Assert(Type(O) === 'Object');
  Assert(Type(hint) === 'String'
         && (hint.stringValue() === 'string' || hint.stringValue() === 'number'));
  let methodNames;
  if (hint.stringValue() === 'string') {
    methodNames = [new Value('toString'), new Value('valueOf')];
  } else {
    methodNames = [new Value('valueOf'), new Value('toString')];
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

// 7.1.2 #sec-toboolean
export function ToBoolean(argument) {
  if (Type(argument) === 'Undefined') {
    return new Value(false);
  }

  if (Type(argument) === 'Null') {
    return new Value(false);
  }

  if (Type(argument) === 'Boolean') {
    return argument;
  }

  if (Type(argument) === 'Number') {
    if (argument.numberValue() === 0 || argument.isNaN()) {
      return new Value(false);
    }
    return new Value(true);
  }

  if (Type(argument) === 'String') {
    if (argument.stringValue().length > 0) {
      return new Value(true);
    }
    return new Value(false);
  }

  if (Type(argument) === 'Symbol') {
    return new Value(true);
  }

  if (Type(argument) === 'Object') {
    return new Value(true);
  }

  throw outOfRange('ToBoolean', argument);
}

// 7.1.3 #sec-tonumber
export function ToNumber(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return new Value(NaN);
    case 'Null':
      return new Value(0);
    case 'Boolean':
      if (argument.isTrue()) {
        return new Value(1);
      }
      return new Value(0);
    case 'Number':
      return argument;
    case 'String':
      // FIXME(devsnek): https://tc39.github.io/ecma262/#sec-runtime-semantics-mv-s
      return new Value(+(argument.stringValue()));
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

// 7.1.4 #sec-tointeger
export function ToInteger(argument) {
  const number = Q(ToNumber(argument));
  if (number.isNaN()) {
    return new Value(0);
  }
  if (number.numberValue() === 0
  //  || number.value === -0
      || number.isInfinity()) {
    return number;
  }
  // Return the number value that is the same sign
  // as number and whose magnitude is floor(abs(number)).
  const mag = Math.floor(Math.abs(number.numberValue()));
  return new Value(number.numberValue() >= 0 ? mag : -mag);
}

// 7.1.5 #sec-toint32
export function ToInt32(argument) {
  const number = Q(ToNumber(argument));
  if (number.isNaN() || number.isInfinity() || number.numberValue() === 0) {
    return new Value(0);
  }
  const int = Math.floor(Math.abs(number.numberValue())) * (number.numberValue() > 0 ? 1 : -1);
  const int32bit = int % (2 ** 32);
  if (int32bit > (2 ** 31)) {
    return int32bit - (2 ** 32);
  }
  return int32bit;
}

// 7.1.6 #sec-touint32
export function ToUint32(argument) {
  const number = Q(ToNumber(argument));
  if (number.numberValue() === 0 // || number.value === -0
      || number.numberValue() === Infinity
      || number.numberValue() === -Infinity) {
    return new Value(0);
  }
  const int = Math.floor(Math.abs(number.numberValue())) * (number.numberValue() > 0 ? 1 : -1);
  const int32bit = int % (2 ** 32);
  return new Value(int32bit);
}

// 7.1.12 #sec-tostring
export function ToString(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return new Value('undefined');
    case 'Null':
      return new Value('null');
    case 'Boolean':
      return new Value(argument.isTrue() ? 'true' : 'false');
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

// 7.1.12.1 #sec-tostring-applied-to-the-number-type
export function NumberToString(m) {
  if (m.isNaN()) {
    return new Value('NaN');
  }
  const mVal = m.numberValue();
  if (m.numberValue() === 0) {
    return new Value('0');
  }
  if (mVal < 0) {
    return new Value(`-${NumberToString(new Value(-mVal)).stringValue()}`);
  }
  if (m.isInfinity()) {
    return new Value('Infinity');
  }
  // TODO: implement properly
  return new Value(`${mVal}`);
}

// 7.1.13 #sec-toobject
export function ToObject(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return surroundingAgent.Throw('TypeError', 'cannot convert undefined to object');
    case 'Null':
      return surroundingAgent.Throw('TypeError', 'cannot convert null to object');
    case 'Boolean': {
      const obj = ObjectCreate(surroundingAgent.intrinsic('%BooleanPrototype%'));
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      const obj = ObjectCreate(surroundingAgent.intrinsic('%NumberPrototype%'));
      obj.NumberData = argument;
      return obj;
    }
    case 'String':
      return StringCreate(argument, surroundingAgent.intrinsic('%StringPrototype%'));
    case 'Symbol': {
      const obj = ObjectCreate(surroundingAgent.intrinsic('%SymbolPrototype%'));
      obj.SymbolData = argument;
      return obj;
    }
    case 'Object':
      return argument;
    default:
      throw outOfRange('ToObject', argument);
  }
}

// 7.1.14 #sec-topropertykey
export function ToPropertyKey(argument) {
  const key = Q(ToPrimitive(argument, 'String'));
  if (Type(key) === 'Symbol') {
    return key;
  }
  return ToString(key);
}

// 7.1.15 #sec-tolength
export function ToLength(argument) {
  const len = Q(ToInteger(argument));
  if (len.numberValue() <= 0) {
    return new Value(0);
  }
  return new Value(Math.min(len.numberValue(), (2 ** 53) - 1));
}

// 7.1.16 #sec-canonicalnumericindexstring
export function CanonicalNumericIndexString(argument) {
  Assert(Type(argument) === 'String');
  if (argument.stringValue() === '-0') {
    return -0;
  }
  const n = X(ToNumber(argument));
  if (SameValue(X(ToString(n)), argument) === false) {
    return new Value(undefined);
  }
  return n;
}

// 7.1.17 #sec-toindex
export function ToIndex(value) {
  let index;
  if (Type(value) === 'Undefined') {
    index = new Value(0);
  } else {
    const integerIndex = Q(ToInteger(value));
    if (integerIndex.numberValue() < 0) {
      return surroundingAgent.Throw('RangeError', 'Index cannot be negative');
    }
    index = X(ToLength(integerIndex));
    if (!SameValueZero(integerIndex, index)) {
      return surroundingAgent.Throw('RangeError', 'Index out of range');
    }
  }
  return index;
}
