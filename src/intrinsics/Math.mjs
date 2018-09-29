import {
  Value,
  wellKnownSymbols,
  Descriptor,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  CreateBuiltinFunction,
  ObjectCreate,
} from '../abstract-ops/all.mjs';

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
      Writable: new Value(false),
      Enumerable: new Value(false),
      Configurable: new Value(false),
    }));
  });

  mathObj.DefineOwnProperty(wellKnownSymbols.toStringTag, Descriptor({
    Value: new Value('Math'),
    Writable: new Value(false),
    Enumerable: new Value(false),
    Configurable: new Value(false),
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
      Value: CreateBuiltinFunction(nativeMethod || (() => surroundingAgent.Throw('TypeError')), [], realmRec),
      Writable: new Value(true),
      Enumerable: new Value(false),
      Configurable: new Value(true),
    }));
  });

  realmRec.Intrinsics['%Math%'] = mathObj;
}
