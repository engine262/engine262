import {
  OrdinaryCreateFromConstructor,
  ToInteger,
  ToNumber,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function NumberConstructor(args, { NewTarget, callLength }) {
  let n;
  if (callLength === 0) {
    n = new Value(0);
  } else {
    n = Q(ToNumber(args[0]));
  }
  if (NewTarget === Value.undefined) {
    return n;
  }

  const O = OrdinaryCreateFromConstructor(NewTarget, '%NumberPrototype%', ['NumberData']);
  O.NumberData = n;
  return O;
}

function Number_isFinite([number]) {
  if (Type(number) !== 'Number') {
    return Value.false;
  }

  if (number.isNaN() || number.isInfinity()) {
    return Value.false;
  }
  return Value.true;
}

function Number_isInteger([number]) {
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

function Number_isNaN([number]) {
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
    // ['parseFloat'],
    // ['parseInt'],
  ]);

  realmRec.Intrinsics['%Number%'] = numberConstructor;
}
