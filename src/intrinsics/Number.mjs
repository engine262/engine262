import {
  OrdinaryCreateFromConstructor,
  ToInteger,
  ToNumber,
} from '../abstract-ops/all.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function NumberConstructor(args, { NewTarget }) {
  let n;
  if (args.length === 0) {
    n = new Value(0);
  } else {
    n = Q(ToNumber(args[0]));
  }
  if (Type(NewTarget) === 'Undefined') {
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
  const numberConstructor = BootstrapConstructor(realmRec, NumberConstructor, 'Number', 1, realmRec.Intrinsics['%NumberPrototype%'], [
    ['EPSILON', new Value(Number.EPSILON)],
    ['MAX_SAFE_INTEGER', new Value(Number.MAX_SAFE_INTEGER)],
    ['MAX_VALUE', new Value(Number.MAX_VALUE)],
    ['MIN_SAFE_INTEGER', new Value(Number.MIN_SAFE_INTEGER)],
    ['MIN_VALUE', new Value(Number.MIN_VALUE)],
    ['NaN', new Value(NaN)],
    ['NEGATIVE_INFINITY', new Value(Infinity)],
    ['POSITIVE_INFINITY', new Value(-Infinity)],

    ['isFinite', Number_isFinite, 1],
    ['isInteger', Number_isInteger, 1],
    ['isNaN', Number_isNaN, 1],
    // ['isSafeInteger'],
    // ['parseFloat'],
    // ['parseInt'],
  ]);

  realmRec.Intrinsics['%Number%'] = numberConstructor;
}
