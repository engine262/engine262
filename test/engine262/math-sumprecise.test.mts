import { expect, test } from 'vitest';
import {
  Agent, JSStringValue, ManagedRealm, NormalCompletion, setSurroundingAgent,
} from '#self';

function evaluate(source: string) {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScriptSkipDebugger(source);
  if (!(result instanceof NormalCompletion) || !(result.Value instanceof JSStringValue)) {
    throw new Error(`Expected a string, got ${String(result)}`);
  }
  return JSON.parse(result.Value.stringValue());
}

function sumPrecise(items: number[]) {
  return evaluate(`JSON.stringify(String(Math.sumPrecise(${JSON.stringify(items)})))`);
}

// https://tc39.es/ecma262/#sec-math.sumprecise
// The result is the exact mathematical sum, rounded once to the nearest Number.
test('Math.sumPrecise keeps subnormal values', () => {
  expect(sumPrecise([-5e-324])).toBe('-5e-324');
  expect(sumPrecise([5e-324])).toBe('5e-324');
  expect(sumPrecise([5e-324, 5e-324])).toBe('1e-323');
  expect(sumPrecise([4.5, -4.5, 1e-323])).toBe('1e-323');
  expect(sumPrecise([1e-310, 5e-324])).toBe(String(1e-310 + 5e-324));
});

test('Math.sumPrecise rounds the exact sum once', () => {
  // 2**53 + 1 + 2**-50 is just above the halfway point between 2**53 and 2**53 + 2.
  expect(sumPrecise([2 ** 53, 1, 2 ** -50])).toBe('9007199254740994');
  // 1 - 2**-54 - 2**-90 is just below the halfway point between 1 - 2**-53 and 1.
  expect(sumPrecise([1, -(2 ** -54), -(2 ** -90)])).toBe('0.9999999999999999');
  // Exactly halfway: ties go to even.
  expect(sumPrecise([2 ** 53, 1])).toBe('9007199254740992');
  expect(sumPrecise([2 ** 53, 3])).toBe('9007199254740996');
});

test('Math.sumPrecise sums with no loss', () => {
  expect(sumPrecise([0.1, 0.2, 0.3])).toBe('0.6');
  expect(sumPrecise([1e20, 0.1, -1e20])).toBe('0.1');
  expect(sumPrecise([1e308, 1e308, -1e308])).toBe('1e+308');
  expect(sumPrecise([1.7976931348623157e308, 9.979201547673598e291])).toBe('1.7976931348623157e+308');
  expect(sumPrecise([1.7976931348623157e308, 9.979201547673599e291])).toBe('Infinity');
  expect(sumPrecise([-1.7976931348623157e308, -9.979201547673599e291])).toBe('-Infinity');
  expect(sumPrecise([5e-324, -5e-324])).toBe('0');
});
