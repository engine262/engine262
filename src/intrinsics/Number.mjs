import {
  OrdinaryCreateFromConstructor,
  ToInteger,
  ToNumber,
} from '../abstract-ops/all.mjs';
import {
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function NumberConstructor(args, { NewTarget }) {
  const [value] = args;
  let n;
  if (args.length === 0) {
    n = new Value(0);
  } else {
    n = Q(ToNumber(value));
  }
  if (NewTarget === Value.undefined) {
    return n;
  }

  const O = OrdinaryCreateFromConstructor(NewTarget, '%NumberPrototype%', ['NumberData']);
  O.NumberData = n;
  return O;
}

function Number_isFinite([number = Value.undefined]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (number.isNaN() || number.isInfinity()) {
    return Value.false;
  }
  return Value.true;
}

function Number_isInteger([number = Value.undefined]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (number.isNaN() || number.isInfinity()) {
    return Value.false;
  }
  const integer = ToInteger(number);
  if (integer.numberValue() !== number.numberValue()) {
    return Value.false;
  }
  return Value.true;
}

function Number_isNaN([number = Value.undefined]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (number.isNaN()) {
    return Value.true;
  }
  return Value.false;
}

export function CreateNumber(realmRec) {
  const override = {
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  };
  const numberConstructor = BootstrapConstructor(realmRec, NumberConstructor, 'Number', 1, realmRec.Intrinsics['%NumberPrototype%'], [
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
    // ['isSafeInteger'],
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
