import { expect, test } from 'vitest';
import {
  Agent, isPromiseObject, JSStringValue, ManagedRealm, NormalCompletion, setSurroundingAgent,
  type PromiseObject,
} from '#self';

test('stack', () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScript(`
    function x() { throw new Error('owo'); }
    function y() { x(); }
    try {
      y();
    } catch (e) {
      e.stack;
    }
  `) as NormalCompletion<JSStringValue>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(result.Value).toBeInstanceOf(JSStringValue);
  expect(result.Value.stringValue()).toMatchInlineSnapshot(`
    "Error: owo
        at x (<anonymous>:2:36)
        at y (<anonymous>:3:20)
        at <anonymous>:5:7"
  `);
});

test('async stack', () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScript(`
    async function x() { await 1; throw new Error('owo'); }
    async function y() { await x(); }
    y().catch((e) => e.stack);
  `) as NormalCompletion<PromiseObject>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(isPromiseObject(result.Value)).toBe(true);
  expect(result.Value.PromiseState).toBe('fulfilled');
  if (!(result.Value.PromiseResult instanceof JSStringValue)) {
    throw new Error('Expected JSStringValue');
  }
  expect(result.Value.PromiseResult.stringValue()).toMatchInlineSnapshot(`
    "Error: owo
        at async x (<anonymous>:2:51)
        at async y (<anonymous>:3:32)"
  `);
});

test('native stack', () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScript(`
    function x() { Reflect.get(); }
    try {
      x();
    } catch (e) {
      e.stack;
    }
  `) as NormalCompletion<JSStringValue>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(result.Value).toBeInstanceOf(JSStringValue);
  expect(result.Value.stringValue()).toMatchInlineSnapshot(`
    "TypeError: undefined is not an object
        at get (native)
        at x (<anonymous>:2:20)
        at <anonymous>:4:7"
  `);
});
