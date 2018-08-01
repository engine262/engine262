import {
  ObjectValue,
  New as NewValue,
} from '../value.mjs';

import {
  CreateBuiltinFunction,
} from '../engine.mjs';

function MathAbs(thisArg, [x]) {
  if (isNaN(x.value)) {
    return NewValue(x.realm, NaN);
  }
  if (Object.is(x.value, -0)) {
    return NewValue(x.realm, 0);
  }
  if (x.value === -Infinity) {
    return NewValue(x.realm, Infinity);
  }
  return x.value >= 0 ? x.value : -x.value;
}

function MathAcos(thisArg, [x]) {
  return NewValue(x.realm, Math.acos(x));
}

// 20.2 The Math Object
export function CreateMath(realmRec) {
  const mathObj = new ObjectValue(realmRec, realmRec.Intrinsics['%ObjectPrototype%']);

  // 20.2.1 Value Properties of the Math Object
  [
    ['E', Math.E],
    ['LN10', Math.LN10],
    ['LN2', Math.LN2],
    ['LOG10E', Math.LOG10E],
    ['LOG2E', Math.LOG2E],
    ['PI', Math.PI],
    ['SQRT1_2', Math.SQRT1_2],
    ['SQRT2', Math.SQRT2],
  ].forEach(([name, value]) => {
    mathObj.DefineOwnProperty(NewValue(realmRec, name), {
      Value: NewValue(realmRec, value),
      Writable: false,
      Enumerable: false,
      Configurable: false,
    });
  });

  mathObj.DefineOwnProperty(realmRec.Intrinsics['@@toStringTag'], {
    Value: NewValue(realmRec, 'Math'),
    Enumerable: false,
    Configurable: false,
  });

  // 20.2.2 Function Properties of the Math Object

  [
    ['abs', MathAbs],
    ['acos', MathAcos],
    ['acosh'],
    ['asin'],
    ['asinh'],
    ['atan'],
    ['atanh'],
    ['atan2'],
    ['cbrt'],
    ['ceil'],
    ['clz32'],
    ['cos'],
    ['cosh'],
    ['exp'],
    ['expm1'],
    ['floor'],
    ['fround'],
    ['hypot'],
    ['imul'],
    ['log'],
    ['log1p'],
    ['log10'],
    ['log2'],
    ['max'],
    ['min'],
    ['pow'],
    ['random'],
    ['round'],
    ['sign'],
    ['sin'],
    ['sinh'],
    ['sqrt'],
    ['tan'],
    ['tanh'],
    ['trunc'],
  ].forEach(([name, nativeMethod]) => {
    mathObj.DefineOwnProperty(NewValue(realmRec, name), {
      Value: nativeMethod ?
        CreateBuiltinFunction(nativeMethod, [], realmRec) :
        CreateBuiltinFunction((thisArg) => {
          thisArg.realm.exception.TypeError('unimplemented');
        }, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  return mathObj;
}
