import {
  IsInteger,
  OrdinaryCreateFromConstructor,
  ToNumber,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

// 20.1.1.1 #sec-number-constructor-number-value
function NumberConstructor(args, { NewTarget }) {
  const [value] = args;
  let n;
  if (args.length !== 0) {
    n = Q(ToNumber(value));
  } else {
    n = new Value(0);
  }
  if (NewTarget === Value.undefined) {
    return n;
  }

  const O = OrdinaryCreateFromConstructor(NewTarget, '%Number.prototype%', ['NumberData']);
  O.NumberData = n;
  return O;
}

// 20.1.2.2 #sec-number.isfinite
function Number_isFinite([number = Value.undefined]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (number.isNaN() || number.isInfinity()) {
    return Value.false;
  }
  return Value.true;
}

// 20.1.2.3 #sec-number.isinteger
function Number_isInteger([number = Value.undefined]) {
  return X(IsInteger(number));
}

// 20.1.2.4 #sec-number.isnan
function Number_isNaN([number = Value.undefined]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (number.isNaN()) {
    return Value.true;
  }
  return Value.false;
}

// 20.1.2.5 #sec-number.issafeinteger
function Number_isSafeInteger([number = Value.undefined]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (X(IsInteger(number)) === Value.true) {
    if (Math.abs(number.numberValue()) <= (2 ** 53) - 1) {
      return Value.true;
    }
  }

  return Value.false;
}

export function CreateNumber(realmRec) {
  const override = {
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  };
  const numberConstructor = BootstrapConstructor(realmRec, NumberConstructor, 'Number', 1, realmRec.Intrinsics['%Number.prototype%'], [
    ['EPSILON', new Value(Number.EPSILON), undefined, override],
    ['MAX_SAFE_INTEGER', new Value(Number.MAX_SAFE_INTEGER), undefined, override],
    ['MAX_VALUE', new Value(Number.MAX_VALUE), undefined, override],
    ['MIN_SAFE_INTEGER', new Value(Number.MIN_SAFE_INTEGER), undefined, override],
    ['MIN_VALUE', new Value(Number.MIN_VALUE), undefined, override],
    ['NaN', new Value(NaN), undefined, override],
    ['NEGATIVE_INFINITY', new Value(-Infinity), undefined, override],
    ['POSITIVE_INFINITY', new Value(Infinity), undefined, override],

    ['isFinite', Number_isFinite, 1],
    ['isInteger', Number_isInteger, 1],
    ['isNaN', Number_isNaN, 1],
    ['isSafeInteger', Number_isSafeInteger, 1],
  ]);

  // 20.1.2.12 #sec-number.parsefloat
  // The value of the Number.parseFloat data property is the same built-in function object that is the value of the parseFloat property of the global object defined in 18.2.4.
  X(numberConstructor.DefineOwnProperty(new Value('parseFloat'), Descriptor({
    Value: realmRec.Intrinsics['%parseFloat%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  // 20.1.2.13 #sec-number.parseint
  // The value of the Number.parseInt data property is the same built-in function object that is the value of the parseInt property of the global object defined in 18.2.5.
  X(numberConstructor.DefineOwnProperty(new Value('parseInt'), Descriptor({
    Value: realmRec.Intrinsics['%parseInt%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  })));

  realmRec.Intrinsics['%Number%'] = numberConstructor;
}
