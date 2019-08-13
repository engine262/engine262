import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { MV_StringNumericLiteral } from '../runtime-semantics/all.mjs';
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
import { OutOfRange, msg } from '../helpers.mjs';

// 7.1.1 #sec-toprimitive
export function ToPrimitive(input, PreferredType) {
  Assert(input instanceof Value);
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
    if (exoticToPrim !== Value.undefined) {
      const result = Q(Call(exoticToPrim, input, [hint]));
      if (Type(result) !== 'Object') {
        return result;
      }
      return surroundingAgent.Throw('TypeError', msg('ObjectToPrimitive'));
    }
    if (hint.stringValue() === 'default') {
      hint = new Value('number');
    }
    return Q(OrdinaryToPrimitive(input, hint));
  }
  return input;
}

// 7.1.1.1 #sec-ordinarytoprimitive
export function OrdinaryToPrimitive(O, hint) {
  Assert(Type(O) === 'Object');
  Assert(Type(hint) === 'String' && (hint.stringValue() === 'string' || hint.stringValue() === 'number'));
  let methodNames;
  if (hint.stringValue() === 'string') {
    methodNames = [new Value('toString'), new Value('valueOf')];
  } else {
    methodNames = [new Value('valueOf'), new Value('toString')];
  }
  for (const name of methodNames) {
    const method = Q(Get(O, name));
    if (IsCallable(method) === Value.true) {
      const result = Q(Call(method, O));
      if (Type(result) !== 'Object') {
        return result;
      }
    }
  }
  return surroundingAgent.Throw('TypeError', msg('ObjectToPrimitive'));
}

// 7.1.2 #sec-toboolean
export function ToBoolean(argument) {
  const type = Type(argument);
  switch (type) {
    case 'Undefined':
      return Value.false;
    case 'Null':
      return Value.false;
    case 'Boolean':
      return argument;
    case 'Number':
      if (argument.numberValue() === 0 || argument.isNaN()) {
        return Value.false;
      }
      return Value.true;
    case 'String':
      if (argument.stringValue().length === 0) {
        return Value.false;
      }
      return Value.true;
    case 'Symbol':
      return Value.true;
    case 'Object':
      return Value.true;
    default:
      throw new OutOfRange('ToBoolean', { type, argument });
  }
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
      if (argument === Value.true) {
        return new Value(1);
      }
      return new Value(0);
    case 'Number':
      return argument;
    case 'String':
      return MV_StringNumericLiteral(argument.stringValue());
    case 'Symbol':
      return surroundingAgent.Throw('TypeError', msg('CannotConvertSymbol', 'number'));
    case 'Object': {
      const primValue = Q(ToPrimitive(argument, 'Number'));
      return Q(ToNumber(primValue));
    }
    default:
      throw new OutOfRange('ToNumber', { type, argument });
  }
}

const sign = (n) => (n >= 0 ? 1 : -1);
const mod = (n, m) => {
  const r = n % m;
  return Math.floor(r >= 0 ? r : r + m);
};

// 7.1.4 #sec-tointeger
export function ToInteger(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number)) {
    return new Value(0);
  }
  if (number === 0 || !Number.isFinite(number)) {
    return new Value(number);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  return new Value(int);
}

// 7.1.5 #sec-toint32
export function ToInt32(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  const int32bit = mod(int, 2 ** 32);
  if (int32bit >= (2 ** 31)) {
    return new Value(int32bit - (2 ** 32));
  }
  return new Value(int32bit);
}

// 7.1.6 #sec-touint32
export function ToUint32(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  const int32bit = mod(int, 2 ** 32);
  return new Value(int32bit);
}

// 7.1.7 #sec-toint16
export function ToInt16(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  const int16bit = mod(int, 2 ** 16);
  if (int16bit >= (2 ** 15)) {
    return new Value(int16bit - (2 ** 16));
  }
  return new Value(int16bit);
}

// 7.1.8 #sec-touint16
export function ToUint16(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  const int16bit = mod(int, 2 ** 16);
  return new Value(int16bit);
}

// 7.1.9 #sec-toint8
export function ToInt8(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  const int8bit = mod(int, 2 ** 8);
  if (int8bit >= (2 ** 7)) {
    return new Value(int8bit - (2 ** 8));
  }
  return new Value(int8bit);
}

// 7.1.10 #sec-touint8
export function ToUint8(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number) || number === 0 || !Number.isFinite(number)) {
    return new Value(0);
  }
  const int = sign(number) * Math.floor(Math.abs(number));
  const int8bit = mod(int, 2 ** 8);
  return new Value(int8bit);
}

// 7.1.11 #sec-touint8clamp
export function ToUint8Clamp(argument) {
  const number = Q(ToNumber(argument)).numberValue();
  if (Number.isNaN(number)) {
    return new Value(0);
  }
  if (number <= 0) {
    return new Value(0);
  }
  if (number >= 255) {
    return new Value(255);
  }
  const f = Math.floor(number);
  if (f + 0.5 < number) {
    return new Value(f + 1);
  }
  if (number < f + 0.5) {
    return new Value(f);
  }
  if (f % 2 === 1) {
    return new Value(f + 1);
  }
  return new Value(f);
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
      return new Value(argument === Value.true ? 'true' : 'false');
    case 'Number':
      return NumberToString(argument);
    case 'String':
      return argument;
    case 'Symbol':
      return surroundingAgent.Throw('TypeError', msg('CannotConvertSymbol', 'string'));
    case 'Object': {
      const primValue = Q(ToPrimitive(argument, 'String'));
      return Q(ToString(primValue));
    }
    default:
      throw new OutOfRange('ToString', { type, argument });
  }
}

// 7.1.12.1 #sec-tostring-applied-to-the-number-type
export function NumberToString(m) {
  if (m.isNaN()) {
    return new Value('NaN');
  }
  const mVal = m.numberValue();
  if (mVal === 0) {
    return new Value('0');
  }
  if (mVal < 0) {
    const str = X(NumberToString(new Value(-mVal))).stringValue();
    return new Value(`-${str}`);
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
      return surroundingAgent.Throw('TypeError', msg('CannotConvertToObject', 'undefined'));
    case 'Null':
      return surroundingAgent.Throw('TypeError', msg('CannotConvertToObject', 'null'));
    case 'Boolean': {
      const obj = ObjectCreate(surroundingAgent.intrinsic('%Boolean.prototype%'));
      obj.BooleanData = argument;
      return obj;
    }
    case 'Number': {
      const obj = ObjectCreate(surroundingAgent.intrinsic('%Number.prototype%'));
      obj.NumberData = argument;
      return obj;
    }
    case 'String':
      return StringCreate(argument, surroundingAgent.intrinsic('%String.prototype%'));
    case 'Symbol': {
      const obj = ObjectCreate(surroundingAgent.intrinsic('%Symbol.prototype%'));
      obj.SymbolData = argument;
      return obj;
    }
    case 'Object':
      return argument;
    default:
      throw new OutOfRange('ToObject', { type, argument });
  }
}

// 7.1.14 #sec-topropertykey
export function ToPropertyKey(argument) {
  const key = Q(ToPrimitive(argument, 'String'));
  if (Type(key) === 'Symbol') {
    return key;
  }
  return X(ToString(key));
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
    return new Value(-0);
  }
  const n = X(ToNumber(argument));
  if (SameValue(X(ToString(n)), argument) === Value.false) {
    return Value.undefined;
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
      return surroundingAgent.Throw('RangeError', msg('NegativeIndex'));
    }
    index = X(ToLength(integerIndex));
    if (SameValueZero(integerIndex, index) === Value.false) {
      return surroundingAgent.Throw('RangeError', msg('OutOfRange', 'Index'));
    }
  }
  return index;
}
