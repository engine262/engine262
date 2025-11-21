import { expect, test } from 'vitest';
import {
  Agent, evalQ, Get, isPromiseObject, JSStringValue, ManagedRealm, NormalCompletion, setSurroundingAgent,
  skipDebugger,
  ThrowCompletion,
  unwrapCompletion,
  Value,
  type PromiseObject,
} from '#self';

test('WeakRef (script)', () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  const result = realm.evaluateScript(`
    const w = new WeakRef({});
    Promise.resolve()
      .then(() => {
        if (typeof w.deref() !== 'object') {
          throw new Error();
        }
      })
      .then(() => {
        if (typeof w.deref() !== 'undefined') {
          throw new Error();
        }
      })
      .then(() => 'pass');
  `) as NormalCompletion<PromiseObject>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(isPromiseObject(result.Value)).toBe(true);
  expect(result.Value.PromiseState).toBe('fulfilled');
  if (!(result.Value.PromiseResult instanceof JSStringValue)) {
    throw new Error('Expected JSStringValue');
  }
  expect(result.Value.PromiseResult.stringValue()).toBe('pass');
});

test('WeakRef (module)', () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  realm.scope(() => {
    const module = realm.compileModule(`
      const w = new WeakRef({});
      globalThis.result = Promise.resolve()
        .then(() => {
          if (typeof w.deref() !== 'object') {
            throw new Error('should be object');
          }
        })
        .then(() => {
          if (typeof w.deref() !== 'undefined') {
            throw new Error('should be undefined');
          }
        })
        .then(() => 'pass');
    `, { specifier: 'test.mjs' });
    if (module instanceof ThrowCompletion) {
      throw new Error('Module compilation failed');
    }
    const completion = evalQ((_Q, X) => {
      const m = X(module);
      m.LoadRequestedModules();
      X(m.Link());
      skipDebugger(m.Evaluate());
      const result = X(skipDebugger(Get(realm.GlobalObject, Value('result')))) as PromiseObject;
      expect(isPromiseObject(result)).toBe(true);
      expect(result.PromiseState).toBe('fulfilled');
      if (!(result.PromiseResult instanceof JSStringValue)) {
        throw new Error('Expected JSStringValue');
      }
      expect(result.PromiseResult.stringValue()).toBe('pass');
    });
    unwrapCompletion(completion);
  });
});
