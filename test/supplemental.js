'use strict';

require('@snek/source-map-support/register');
const assert = require('assert');
const {
  Agent,
  setSurroundingAgent,
  ManagedRealm,
  Value,
  FEATURES,
  Get,
  CreateDataProperty,
} = require('..');
const { total, pass, fail } = require('./base');

// Features that cannot be tested by test262 should go here.

[
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript('debugger;');
    assert.strictEqual(result.Value, Value.undefined);
  },
  () => {
    const agent = new Agent({
      onDebugger() {
        return new Value(42);
      },
    });
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript('debugger;');
    assert.strictEqual(result.Value.numberValue(), 42);
  },
  () => {
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
    `);
    assert.strictEqual(result.Value.stringValue(), `
Error: owo
    at x (<anonymous>:2:37)
    at y (<anonymous>:3:21)
    at <anonymous>:5:8`.trim());
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
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
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
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
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
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
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript(`
      let e;
      new Promise(() => {
        e = new Error('owo');
      });
      e.stack;
    `);
    assert.strictEqual(result.Value.stringValue(), `
Error: owo
    at <anonymous> (<anonymous>:4:22)
    at new Promise (native)
    at <anonymous>:3:18`.trim());
  },
  () => {
    const agent = new Agent({
      features: ['WeakRefs'],
    });
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
    `);
    assert.strictEqual(result.Value.PromiseResult.stringValue(), 'pass');
  },
  () => {
    const agent = new Agent({
      features: ['WeakRefs'],
    });
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const module = realm.createSourceTextModule('test.js', `
      const w = new WeakRef({});
      globalThis.result = Promise.resolve()
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
    `);
    module.Link();
    module.Evaluate();
    const result = Get(realm.GlobalObject, new Value('result'));
    assert.strictEqual(result.Value.PromiseResult.stringValue(), 'pass');
  },
  () => {
    const agent = new Agent({
      features: FEATURES.map((f) => f.name),
    });
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    realm.scope(() => {
      CreateDataProperty(
        realm.GlobalObject,
        new Value('spec'),
        new Value(([v]) => {
          if (v && v.nativeFunction && v.nativeFunction.section) {
            return new Value(v.nativeFunction.section);
          }
          return Value.undefined;
        }),
      );
      CreateDataProperty(
        realm.GlobalObject,
        new Value('fail'),
        new Value(([path]) => {
          throw new Error(`${path.stringValue()} did not have a section`);
        }),
      );
    });
    const result = realm.evaluateScript(`
'use strict';

{
  const spec = globalThis.spec;
  delete globalThis.spec;
  const fail = globalThis.fail;
  delete globalThis.fail;

  const scanned = new Set();
  const scan = (ns, path) => {
    if (scanned.has(ns)) {
      return;
    }
    scanned.add(ns);
    if (typeof ns === 'function') {
      if (spec(ns) === undefined) {
        fail(path);
      }
    }
    if (typeof ns !== 'function' && (typeof ns !== 'object' || ns === null)) {
      return;
    }

    const descriptors = Object.getOwnPropertyDescriptors(ns);
    Reflect.ownKeys(descriptors)
      .forEach((name) => {
        const desc = descriptors[name];
        const p = typeof name === 'symbol'
          ? path + '[Symbol(' + name.description + ')]'
          : path + '.' + name;
        if ('value' in desc) {
          scan(desc.value, p);
        } else {
          scan(desc.get, p);
          scan(desc.set, p);
        }
      });
  };

  scan(globalThis, 'globalThis');
}
    `);
    assert.strictEqual(result.Value, Value.undefined);
  },
].forEach((test) => {
  total();
  try {
    test();
    pass();
  } catch (e) {
    fail('', e.stack || e);
  }
});
