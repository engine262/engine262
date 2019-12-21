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
].forEach((test) => {
  total();
  try {
    test();
    pass();
  } catch (e) {
    fail('', e);
  }
});
