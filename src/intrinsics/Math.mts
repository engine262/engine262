// @ts-nocheck
import { surroundingAgent } from '../engine.mts';
import {
  Descriptor,
  Value,
  NumberValue,
} from '../value.mts';
import {
  CreateBuiltinFunction,
  ToNumber,
  F, R,
} from '../abstract-ops/all.mts';
import { Q, X } from '../completion.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-math.abs */
function Math_abs([x = Value.undefined]) {
  const n = Q(ToNumber(x));
  if (n.isNaN()) {
    return n;
  } else if (Object.is(R(n), -0)) {
    return F(+0);
  } else if (n.isInfinity()) {
    return F(Infinity);
  }

  if (R(n) < 0) {
    return F(-R(n));
  }
  return n;
}

/** https://tc39.es/ecma262/#sec-math.acos */
function Math_acos([x = Value.undefined]) {
  const n = Q(ToNumber(x));
  if (n.isNaN()) {
    return n;
  } else if (R(n) > 1) {
    return F(NaN);
  } else if (R(n) < -1) {
    return F(NaN);
  } else if (R(n) === 1) {
    return F(+0);
  }

  return F(Math.acos(R(n)));
}

/** https://tc39.es/ecma262/#sec-math.pow */
function Math_pow([base = Value.undefined, exponent = Value.undefined]) {
  // 1. Set base to ? ToNumber(base).
  base = Q(ToNumber(base));
  // 2. Set exponent to ? ToNumber(exponent).
  exponent = Q(ToNumber(exponent));
  // 3. Return ! Number::exponentiate(base, exponent).
  return X(NumberValue.exponentiate(base, exponent));
}

/** @param {bigint} h */
function fmix64(h) {
  h ^= h >> 33n;
  h *= 0xFF51AFD7ED558CCDn;
  h ^= h >> 33n;
  h *= 0xC4CEB9FE1A85EC53n;
  h ^= h >> 33n;
  return h;
}

const floatView = new Float64Array(1);
const big64View = new BigUint64Array(floatView.buffer);
/** https://tc39.es/ecma262/#sec-math.random */
function Math_random() {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.randomState === undefined) {
    const seed = realm.HostDefined.randomSeed
      ? BigInt(X(realm.HostDefined.randomSeed()))
      : BigInt(Math.round(Math.random() * (2 ** 32)));
    realm.randomState = new BigUint64Array([
      fmix64(BigInt.asUintN(64, seed)),
      fmix64(BigInt.asUintN(64, ~seed)),
    ]);
  }
  const s = realm.randomState;

  // XorShift128+
  let s1 = s[0];
  const s0 = s[1];
  s[0] = s0;
  s1 ^= s1 << 23n;
  s1 ^= s1 >> 17n;
  s1 ^= s0;
  s1 ^= s0 >> 26n;
  s[1] = s1;

  // Convert to double in [0, 1) range
  big64View[0] = (s0 >> 12n) | 0x3FF0000000000000n;
  const result = floatView[0] - 1;
  return F(result);
}

/** https://tc39.es/ecma262/#sec-math-object */
export function bootstrapMath(realmRec) {
  /** https://tc39.es/ecma262/#sec-value-properties-of-the-math-object */
  const readonly = { Writable: Value.false, Configurable: Value.false };
  const valueProps = [
    ['E', 2.718281828459045],
    ['LN10', 2.302585092994046],
    ['LN2', 0.6931471805599453],
    ['LOG10E', 0.4342944819032518],
    ['LOG2E', 1.4426950408889634],
    ['PI', 3.141592653589793],
    ['SQRT1_2', 0.7071067811865476],
    ['SQRT2', 1.4142135623730951],
  ].map(([name, value]) => [name, F(value), undefined, readonly]);
  // @@toStringTag is handled in the bootstrapPrototype() call.

  const mathObj = bootstrapPrototype(realmRec, [
    ...valueProps,
    ['abs', Math_abs, 1],
    ['acos', Math_acos, 1],
    ['pow', Math_pow, 2],
    ['random', Math_random, 0],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Math');

  /** https://tc39.es/ecma262/#sec-function-properties-of-the-math-object */

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
    /** https://tc39.es/ecma262/#sec-function-properties-of-the-math-object */
    const method = (args) => {
      for (let i = 0; i < args.length; i += 1) {
        args[i] = R(Q(ToNumber(args[i])));
      }
      return F(Math[name](...args));
    };
    const func = CreateBuiltinFunction(method, length, Value(name), [], realmRec);
    mathObj.DefineOwnProperty(Value(name), Descriptor({
      Value: func,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.true,
    }));
  });

  realmRec.Intrinsics['%Math%'] = mathObj;
}
