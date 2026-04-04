import { expect, test } from 'vitest';
import {
  Agent, CallSite, CreateBuiltinFunction, CreateDataPropertyOrThrow, isFunctionObject, isPromiseObject, JSStringValue, ManagedRealm, NormalCompletion, setSurroundingAgent,
  unwrapCompletion,
  Value,
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
  // built-in functions
  {
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
          at Reflect.get (native)
          at x (<anonymous>:2:22)
          at <anonymous>:4:9"
    `);
  }

  // derived class constructors
  {
    const result = realm.evaluateScript(`
      class T {}
      try { T() } catch (e) { e.stack; }
    `) as NormalCompletion<JSStringValue>;
    expect(result).toBeInstanceOf(NormalCompletion);
    expect(result.Value).toBeInstanceOf(JSStringValue);
    expect(result.Value.stringValue()).toMatchInlineSnapshot(`
      "TypeError: [Function T] cannot be invoked without new
          at T (native)
          at <anonymous>:3:13"
    `);
  }
});

test('native function names', () => {
  const agent = new Agent();
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  realm.scope(() => {
    const f = CreateBuiltinFunction.from((f = Value.null) => {
      if (isFunctionObject(f)) {
        return Value(CallSite.getFunctionName(f) || '<CallSite.getFunctionName returned null>');
      }
      return Value('<not a function object>');
    });
    unwrapCompletion(CreateDataPropertyOrThrow(realm.GlobalObject, Value('getName'), f));
  });
  const result = realm.evaluateScript(`
  (${() => {
    // @ts-expect-error
    declare const getName: (f: object) => string;
    const seen = new WeakSet();
    const names: Record<string, string> = {};
    function collect(object: unknown, tree: Record<string, string>, key: string) {
      if (!object || (typeof object !== 'object' && typeof object !== 'function')) return;
      if (seen.has(object)) return;
      seen.add(object);

      if (typeof object === 'function') {
        tree[`${key}()`] = getName(object);
      }

      const proto = Object.getPrototypeOf(object);
      if (proto) {
        collect(proto, tree, `${key}.[[Prototype]]`);
      }

      Object.entries(Object.getOwnPropertyDescriptors(object)).forEach(([subKey, desc]) => {
        if ('value' in desc) collect(desc.value, tree, `${key}.${String(subKey)}`);
        if (desc.get) collect(desc.get, tree, `${key}.get ${String(subKey)}`);
        if (desc.set) collect(desc.set, tree, `${key}.set ${String(subKey)}`);
      });
    }
    collect(Object, names, 'Object');
    collect(globalThis, names, '');
    return JSON.stringify(names);
  }})()
  `) as NormalCompletion<JSStringValue>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(result.Value).toBeInstanceOf(JSStringValue);
  expect(JSON.parse(result.Value.stringValue())).matchSnapshot();
});
