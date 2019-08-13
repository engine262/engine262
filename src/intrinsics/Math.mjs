import {
  Descriptor,
  Value,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  SetFunctionLength,
  SetFunctionName,
  ToNumber,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

// 20.2.2.1 #sec-math.abs
function Math_abs([x = Value.undefined]) {
  x = Q(ToNumber(x));
  if (x.isNaN()) {
    return x;
  } else if (Object.is(x.numberValue(), -0)) {
    return new Value(0);
  } else if (x.isInfinity()) {
    return new Value(Infinity);
  }

  if (x.numberValue() < 0) {
    return new Value(-x.numberValue());
  }
  return x;
}

// 20.2.2.2 #sec-math.acos
function Math_acos([x = Value.undefined]) {
  x = Q(ToNumber(x));
  if (x.isNaN()) {
    return x;
  } else if (x.numberValue() > 1) {
    return new Value(NaN);
  } else if (x.numberValue() < -1) {
    return new Value(NaN);
  } else if (x.numberValue() === 1) {
    return new Value(+0);
  }

  return new Value(Math.acos(x.numberValue()));
}

// 20.2 #sec-math-object
export function CreateMath(realmRec) {
  // 20.2.1 #sec-value-properties-of-the-math-object
  const readonly = { Writable: Value.false, Configurable: Value.false };
  const valueProps = [
    ['E', 2.7182818284590452354],
    ['LN10', 2.302585092994046],
    ['LN2', 0.6931471805599453],
    ['LOG10E', 0.4342944819032518],
    ['LOG2E', 1.4426950408889634],
    ['PI', 3.1415926535897932],
    ['SQRT1_2', 0.7071067811865476],
    ['SQRT2', 1.4142135623730951],
  ].map(([name, value]) => [name, new Value(value), undefined, readonly]);
  // @@toStringTag is handled in the BootstrapPrototype() call.

  const mathObj = BootstrapPrototype(realmRec, [
    ...valueProps,
    ['abs', Math_abs, 1],
    ['acos', Math_acos, 1],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Math');

  // 20.2.2 #sec-function-properties-of-the-math-object

  [
    ['acosh', 1],
    ['asin', 1],
    ['asinh', 1],
    ['atan', 1],
    ['atanh', 1],
    ['atan2', 2],
    ['cbrt', 1],
    ['ceil', 1],
    ['clz32', 1],
    ['cos', 1],
    ['cosh', 1],
    ['exp', 1],
    ['expm1', 1],
    ['floor', 1],
    ['fround', 1],
    ['hypot', 2],
    ['imul', 2],
    ['log', 1],
    ['log1p', 1],
    ['log10', 1],
    ['log2', 1],
    ['max', 2],
    ['min', 2],
    ['pow', 2],
    ['random', 0],
    ['round', 1],
    ['sign', 1],
    ['sin', 1],
    ['sinh', 1],
    ['sqrt', 1],
    ['tan', 1],
    ['tanh', 1],
    ['trunc', 1],
  ].forEach(([name, length]) => {
    // TODO(18): Math
    const func = CreateBuiltinFunction(((args) => {
      for (let i = 0; i < args.length; i += 1) {
        args[i] = Q(ToNumber(args[i])).numberValue();
      }
      return new Value(Math[name](...args));
    }), [], realmRec);
    X(SetFunctionName(func, new Value(name)));
    X(SetFunctionLength(func, new Value(length)));
    mathObj.DefineOwnProperty(new Value(name), Descriptor({
      Value: func,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  });

  realmRec.Intrinsics['%Math%'] = mathObj;
}
