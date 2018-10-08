import {
  Value,
  wellKnownSymbols,
  Descriptor,
} from '../value.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
  ToNumber,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

// 20.2 The Math Object
export function CreateMath(realmRec) {
  const mathObj = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

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
    mathObj.DefineOwnProperty(new Value(name), Descriptor({
      Value: new Value(value),
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
    }));
  });

  mathObj.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
    Value: new Value('Math'),
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));

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
    mathObj.DefineOwnProperty(new Value(name), Descriptor({
      // TODO(Math)
      Value: CreateBuiltinFunction(nativeMethod || (([...args]) => {
        for (let i = 0; i < args.length; i += 1) {
          args[i] = Q(ToNumber(args[i])).numberValue();
        }
        return new Value(Math[name](...args));
      }), [], realmRec),
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  });

  realmRec.Intrinsics['%Math%'] = mathObj;
}
