import {
  CreateBuiltinFunction,
  OrdinaryCreateFromConstructor,
  ToNumber,
  ToInteger,
} from '../abstract-ops/all.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import { Q } from '../completion.mjs';

function NumberConstructor(realm, args, { NewTarget }) {
  let n;
  if (args.length === 0) {
    n = NewValue(0);
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

function NumberIsFinite(realm, [number]) {
  if (Type(number) !== 'Number') {
    return NewValue(false);
  }

  if (number.isNaN() || number.isInfinity()) {
    return NewValue(false);
  }
  return NewValue(true);
}

function NumberIsInteger(realm, [number]) {
  if (Type(number) !== 'Number') {
    return NewValue(false);
  }

  if (number.isNaN() || number.isInfinity()) {
    return NewValue(false);
  }
  const integer = ToInteger(number);
  if (integer.numberValue() !== number.numberValue()) {
    return NewValue(false);
  }
  return NewValue(true);
}

function NumberIsNaN(realm, [number]) {
  if (Type(number) !== 'Number') {
    return NewValue(false);
  }

  if (number.isNaN()) {
    return NewValue(true);
  }
  return NewValue(false);
}

export function CreateNumber(realmRec) {
  const numberConstructor = CreateBuiltinFunction(NumberConstructor, [], realmRec);

  const proto = realmRec.Intrinsics['%NumberPrototype%'];
  numberConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: false,
    Configurable: false,
    Enumerable: false,
  });
  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: numberConstructor,
    Writable: false,
    Configurable: false,
    Enumerable: false,
  });

  [
    ['EPSILON', Number.EPSILON],
    ['MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
    ['MAX_VALUE', Number.MAX_VALUE],
    ['MIN_SAFE_INTEGER', Number.MIN_SAFE_INTEGER],
    ['MIN_VALUE', Number.MIN_VALUE],
    ['NaN', NaN],
    ['NEGATIVE_INFINITY', Infinity],
    ['POSITIVE_INFINITY', -Infinity],
  ].forEach(([name, value]) => {
    numberConstructor.DefineOwnProperty(NewValue(name), {
      Value: NewValue(value),
      Writable: false,
      Enumerable: false,
      Configurable: false,
    });
  });

  [
    ['isFinite', NumberIsFinite],
    ['isInteger', NumberIsInteger],
    ['isNaN', NumberIsNaN],
    // ['isSafeInteger'],
    // ['parseFloat'],
    // ['parseInt'],
  ].forEach(([name, fn]) => {
    numberConstructor.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%Number%'] = numberConstructor;
}
