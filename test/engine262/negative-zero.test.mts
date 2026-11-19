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

// https://tc39.es/ecma262/#sec-set.prototype.add
// Set.prototype.add stores -0 as +0.
test('Set.prototype.add stores -0 as +0', () => {
  expect(evaluate(`
    const added = new Set();
    added.add(-0);
    const fromList = new Set([-0]);
    const difference = new Set([-0, 1]).difference(new Set([1]));
    JSON.stringify([
      Object.is([...added][0], -0),
      Object.is([...fromList][0], -0),
      Object.is([...difference][0], -0),
    ]);
  `)).toEqual([false, false, false]);
});

// https://tc39.es/ecma262/#array-index
// "-0" is not an array index: CanonicalNumericIndexString("-0") is -0𝔽, not +0𝔽.
test('"-0" is not an array index', () => {
  expect(evaluate(`
    const array = [];
    array['-0'] = 1;
    JSON.stringify([
      array.length,
      Reflect.ownKeys({ b: 1, '-0': 2, 1: 3, 0: 4 }),
    ]);
  `)).toEqual([0, ['0', '1', 'b', '-0']]);
});
