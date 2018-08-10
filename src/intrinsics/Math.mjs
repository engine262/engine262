import {
  ObjectValue,
  wellKnownSymbols,
  New as NewValue,
} from '../value';
import {
  surroundingAgent,
} from '../engine';
import {
  CreateBuiltinFunction,
} from '../abstract-ops/all';

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
    mathObj.DefineOwnProperty(NewValue(name), {
      Value: NewValue(value),
      Writable: false,
      Enumerable: false,
      Configurable: false,
    });
  });

  mathObj.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: NewValue('Math'),
    Enumerable: false,
    Configurable: false,
  });

  // 20.2.2 Function Properties of the Math Object

  [
    ['abs'],
    ['acos'],
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
    mathObj.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(nativeMethod || (() => surroundingAgent.Throw('TypeError')), [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%Math%'] = mathObj;
}
