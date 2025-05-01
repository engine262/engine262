// @ts-check
import assert from 'assert';
import { createAgent, createRealm } from './test262/test262_realm.mts';
import {
  incr_total, pass, fail,
} from './base.mts';
import {
  Agent,
  setSurroundingAgent,
  ManagedRealm,
  Value,
  CreateBuiltinFunction,
  FEATURES,
  Get,
  CreateArrayFromList,
  CreateDataProperty,
  JSStringValue,
  NumberValue,
  type PromiseObject,
  SourceTextModuleRecord,
  NormalCompletion,
  type Arguments,
  ToString,
  EnsureCompletion,
  skipDebugger,
  type ValueCompletion,
  surroundingAgent,
  isPromiseObject,
  evalQ,
  unwrapCompletion,
  R,
} from '#self';

// Features that cannot be tested by test262 should go here.

[
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript('debugger;');
    assert.ok(result instanceof NormalCompletion);
    assert.strictEqual(result.Value, Value.undefined);
  },
  () => {
    const agent = new Agent({
      onDebugger() {
      },
    });
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    evalQ((_Q, X) => {
      const script = X(realm.compileScript('debugger;'));
      let completion!: ValueCompletion;
      realm.evaluate(script, (c) => {
        completion = c;
      });
      // start the evaluation
      X(surroundingAgent.resumeEvaluate({}));
      // paused at the debugger statement, resume with a value
      X(surroundingAgent.resumeEvaluate({
        debuggerStatementCompletion: NormalCompletion(Value(42)),
      }));
      if (!completion) {
        throw new Error('Completion should be set.');
      }
      const value = X(completion);
      assert.ok(value instanceof NumberValue);
      assert.strictEqual(R(value), 42);
    });
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript(`\
function x() { throw new Error('owo'); }
function y() { x(); }
try {
  y();
} catch (e) {
  e.stack;
}
`);
    assert.strictEqual((result as NormalCompletion<JSStringValue>).Value.stringValue(), `\
Error: owo
    at x (<anonymous>:1:32)
    at y (<anonymous>:2:16)
    at <anonymous>:4:3`);
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript(`\
async function x() { await 1; throw new Error('owo'); }
async function y() { await x(); }
y().catch((e) => e.stack);
`);
    assert.strictEqual(((result as NormalCompletion<PromiseObject>).Value.PromiseResult as JSStringValue).stringValue(), `\
Error: owo
    at async x (<anonymous>:1:47)
    at async y (<anonymous>:2:28)`);
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript(`\
function x() { Reflect.get(); }
try {
  x();
} catch (e) {
  e.stack;
}
`);
    assert.strictEqual((result as NormalCompletion<JSStringValue>).Value.stringValue(), `\
TypeError: undefined is not an object
    at get (native)
    at x (<anonymous>:1:16)
    at <anonymous>:3:3`);
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript(`\
function Y() { throw new Error('owo'); }
function x() { new Y(); }
try {
  x();
} catch (e) {
  e.stack;
}
`);
    assert.strictEqual((result as NormalCompletion<JSStringValue>).Value.stringValue(), `\
Error: owo
    at new Y (<anonymous>:1:32)
    at x (<anonymous>:2:20)
    at <anonymous>:4:3`);
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    const result = realm.evaluateScript(`\
let e;
new Promise(() => {
  e = new Error('owo');
});
e.stack;
`);
    assert.strictEqual((result as NormalCompletion<JSStringValue>).Value.stringValue(), `\
Error: owo
    at <anonymous> (<anonymous>:3:17)
    at new Promise (native)
    at <anonymous>:2:13`);
  },
  () => {
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
    `);
    assert.strictEqual(((result as NormalCompletion<PromiseObject>).Value.PromiseResult as JSStringValue).stringValue(), 'pass');
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    realm.scope(() => {
      const module = realm.createSourceTextModule('test.mjs', `
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
      `) as SourceTextModuleRecord;
      const completion = evalQ((_Q, X) => {
        module.LoadRequestedModules();
        X(module.Link());
        skipDebugger(module.Evaluate());
        const result = X(skipDebugger(Get(realm.GlobalObject, Value('result'))));
        assert.ok(isPromiseObject(result));
        assert.ok(result.PromiseResult instanceof JSStringValue);
        assert.strictEqual(result.PromiseResult.stringValue(), 'pass');
      });
      unwrapCompletion(completion);
    });
  },
  () => {
    const agent = createAgent({
      features: FEATURES.map((f) => f.name),
    });
    setSurroundingAgent(agent);
    const { realm } = createRealm();
    realm.scope(() => {
      skipDebugger(CreateDataProperty(
        realm.GlobalObject,
        Value('fail'),
        CreateBuiltinFunction(([path]: Arguments) => {
          const o = EnsureCompletion(skipDebugger(ToString(path)));
          if (o.Type === 'throw') {
            return o;
          }
          throw new Error(`${o.Value.stringValue()} did not have a section`);
        }, 1, Value(''), []),
      ));
      const targets: Value[] = [];
      Object.entries(realm.Intrinsics)
        .forEach(([k, v]) => {
          targets.push(CreateArrayFromList([Value(k), v]));
        });
      skipDebugger(CreateDataProperty(
        realm.GlobalObject,
        Value('targets'),
        CreateArrayFromList(targets),
      ));
    });
    const result = realm.evaluateScript(`
'use strict';

{
  const targets = globalThis.targets;
  delete globalThis.targets;
  const fail = globalThis.fail;
  delete globalThis.fail;

  const topQueue = new Set();
  const scanned = new Set();
  const scan = (ns, path) => {
    if (scanned.has(ns)) {
      return;
    }
    scanned.add(ns);
    if (typeof ns === 'function') {
      if ($262.spec(ns) === undefined) {
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
          if (!topQueue.has(desc.value)) {
            scan(desc.value, p);
          }
        } else {
          if (!topQueue.has(desc.get)) {
            scan(desc.get, p);
          }
          if (!topQueue.has(desc.set)) {
            scan(desc.set, p);
          }
        }
      });
  };

  targets.forEach((t) => {
    topQueue.add(t[1]);
  });
  targets.forEach((t) => {
    scan(t[1], t[0]);
  });
}
    `);
    assert.ok(result instanceof NormalCompletion);
    assert.strictEqual(result.Value, Value.undefined);
  },
  () => {
    const agent1 = new Agent();
    const agent2 = new Agent();

    assert.strictEqual(
      agent1.executionContextStack.pop,
      agent2.executionContextStack.pop,
      "The 'agent.executionContextStack.pop' method is identical for every execution context stack.",
    );
  },
  () => {
    const agent = new Agent();
    setSurroundingAgent(agent);
    const realm = new ManagedRealm();
    realm.evaluateScript(`
      var foo;
      eval(\`
        var foo;
        var bar;
        var deleteMe;
      \`);
      delete deleteMe;
    `);
    const varNames = new Set();
    for (const name of realm.GlobalEnv.VarNames) {
      assert(!varNames.has(name.stringValue()), 'Every member of `realm.[[GlobalEnv]].[[VarNames]]` should be unique.');
      varNames.add(name.stringValue());
    }
    assert(!varNames.has('deleteMe'), "`realm.[[GlobalEnv]].[[VarNames]]` shouldn't have 'deleteMe'.");
  },
].forEach((test, i) => {
  incr_total();
  try {
    test();
    pass(0);
  } catch (e) {
    fail(0, `Test ${i + 1}`, '', (e as Error).stack || String(e));
  }
});
