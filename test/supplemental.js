'use strict';

const assert = require('assert');
const { total, pass, fail } = require('./base');
const {
  Agent,
  Realm,
  Value,
} = require('..');

// Features that cannot be tested by test262 should go here.

[
  () => {
    const agent = new Agent();
    agent.enter();
    const realm = new Realm();
    const result = realm.evaluateScript('debugger;');
    assert.strictEqual(result.Value, Value.undefined);
  },
  () => {
    const agent = new Agent({
      onDebugger() {
        return new Value(realm, 42);
      },
    });
    agent.enter();
    const realm = new Realm();
    const result = realm.evaluateScript('debugger;');
    assert.strictEqual(result.Value.numberValue(), 42);
  },
  () => {
    const agent = new Agent();
    agent.enter();
    const realm = new Realm();
    const result = realm.evaluateScript(`
      function x() { throw new Error('owo'); }
      function y() { x(); }
      try {
        y();
      } catch (e) {
        e.stack;
      }
    `);
    assert.strictEqual(result.Value.stringValue(), `
Error: owo
    at x (<anonymous>:2:37)
    at y (<anonymous>:3:21)
    at <anonymous>:5:8`.trim());
  },
  () => {
    const agent = new Agent();
    agent.enter();
    const realm = new Realm();
    const result = realm.evaluateScript(`
      async function x() { await 1; throw new Error('owo'); }
      async function y() { await x(); }
      y().catch((e) => e.stack);
    `);
    assert.strictEqual(result.Value.PromiseResult.stringValue(), `
Error: owo
    at async x (<anonymous>:2:52)
    at async y (<anonymous>:3:33)`.trim());
  },
  () => {
    const agent = new Agent();
    agent.enter();
    const realm = new Realm();
    const result = realm.evaluateScript(`
      function x() { Reflect.get(); }
      try {
        x();
      } catch (e) {
        e.stack;
      }
    `);
    assert.strictEqual(result.Value.stringValue(), `
TypeError: undefined is not an object
    at get (native)
    at x (<anonymous>:2:21)
    at <anonymous>:4:8`.trim());
  },
  () => {
    const agent = new Agent();
    agent.enter();
    const realm = new Realm();
    const result = realm.evaluateScript(`
      function Y() { throw new Error('owo'); }
      function x() { new Y(); }
      try {
        x();
      } catch (e) {
        e.stack;
      }
    `);
    assert.strictEqual(result.Value.stringValue(), `
Error: owo
    at new Y (<anonymous>:2:37)
    at x (<anonymous>:3:25)
    at <anonymous>:5:8`.trim());
  },
].forEach((test) => {
  total();
  try {
    test();
    pass();
  } catch (e) {
    fail('', e);
  }
});
