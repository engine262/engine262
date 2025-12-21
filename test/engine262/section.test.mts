import { expect, test } from 'vitest';
import { createAgent, createRealm } from '../base.mts';
import {
  CreateArrayFromList, CreateBuiltinFunction, CreateDataProperty, EnsureCompletion, FEATURES, NormalCompletion, setSurroundingAgent, skipDebugger, ToString, UndefinedValue, Value, type Arguments,
} from '#self';

test('Every built-in function should have a section property', () => {
  const agent = createAgent({
    features: FEATURES.map((f) => f.name),
  });
  setSurroundingAgent(agent);
  const { realm } = createRealm();
  realm.scope(() => {
    skipDebugger(CreateDataProperty(
      realm.GlobalObject,
      Value('fail'),
      CreateBuiltinFunction(([path = Value.undefined]: Arguments) => {
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
  `) as NormalCompletion<UndefinedValue>;
  expect(result).toBeInstanceOf(NormalCompletion);
  expect(result.Value).toBe(Value.undefined);
});
