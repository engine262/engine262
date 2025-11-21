import { assert, expect, test } from 'vitest';
import {
  AbstractModuleRecord, Agent, Call, JSStringValue, ManagedRealm, NewPromiseCapability, NormalCompletion, PromiseCapabilityRecord, setSurroundingAgent, skipDebugger, Value, type PromiseObject,
} from '#self';

test('Import attributes', () => {
  let attributes!: Map<string, string>;
  let calls = 0;

  const agent = new Agent({
    supportedImportAttributes: ['fruit', 'animal'],
    loadImportedModule: (_referrer, _specifier, attrs, _hostDefined, finish) => {
      calls += 1;
      attributes = attrs;
      finish(realm.compileModule(''));
    },
  });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();

  realm.evaluateModule('import "test" with {}', 'case 1');
  expect([...attributes]).lengthOf(0);

  realm.evaluateModule('import "test" with { fruit: "banana" }', 'case 2');
  expect([...attributes]).deep.equal([['fruit', 'banana']]);

  realm.evaluateModule('import "test" with { fruit: "banana", animal: "monkey" }', 'case 3');
  expect([...attributes]).deep.equal([['animal', 'monkey'], ['fruit', 'banana']]);

  realm.evaluateModule('import "test" with { animal: "monkey", fruit: "banana" }', 'case 4');
  expect([...attributes]).deep.equal([['animal', 'monkey'], ['fruit', 'banana']]);

  calls = 0;
  realm.evaluateModule('import "test" with { fruit: "banana" }; import "test" with { fruit: "banana" }', 'case 5');
  expect(calls).toBe(1);

  calls = 0;
  realm.evaluateModule('import "test" with { fruit: "banana" }; import "test" with { animal: "monkey" }', 'case 6');
  expect(calls).toBe(2);

  calls = 0;
  realm.evaluateModule('import "test" with { fruit: "banana", animal: "monkey" }; import "test" with { animal: "monkey", fruit: "banana" };', 'case 7');
  expect(calls).toBe(1);

  calls = 0;
  realm.evaluateModule('import "test" with { animal: "monkey" }; import "test" with { animal: "elephant" };', 'case 8');
  expect(calls).toBe(2);

  calls = 0;
  realm.evaluateModule('import "test"; import "test" with {};', 'case 9');
  expect(calls).toBe(1);
});

test('Custom module records', () => {
  let evaluationPromise: PromiseObject;

  class CustomModuleRecord extends AbstractModuleRecord {
    _pc(): PromiseCapabilityRecord {
      const it = NewPromiseCapability(this.Realm.Intrinsics['%Promise%']);
      const completion = skipDebugger(it) as NormalCompletion<PromiseCapabilityRecord>;
      if (completion.Type !== 'normal') {
        throw new Error('Expected normal completion');
      }
      return completion.Value;
    }

    override LoadRequestedModules(): PromiseObject {
      const pc = this._pc();
      Call(pc.Resolve, Value.undefined, []);
      return pc.Promise;
    }

    override Link() {}

    override* Evaluate() {
      const pc = this._pc();
      yield* Call(pc.Reject, Value.undefined, [Value('error!')]);
      evaluationPromise = pc.Promise;
      return evaluationPromise;
    }

    override GetExportedNames(): readonly JSStringValue[] {
      return [];
    }

    override ResolveExport(): never {
      throw new Error('Not implemented');
    }
  }

  const agent = new Agent({
    loadImportedModule(referrer, specifier, _attributes, _hostDefined, finish) {
      if (specifier !== 'dep') {
        throw new Error('Invalid specifier');
      }
      finish(new CustomModuleRecord({
        Realm: (referrer as AbstractModuleRecord).Realm,
        Environment: undefined,
        Namespace: undefined,
        HostDefined: {},
      }));
    },
  });
  setSurroundingAgent(agent);

  const calls: unknown[] = [];

  const realm = new ManagedRealm({
    promiseRejectionTracker(promise, operation) {
      calls.push([promise, operation]);
    },
  });

  realm.evaluateModule('import "dep"', 'entrypoint');

  assert(calls.length >= 2); // there is a third call, for the promise of the entrypoint
  assert.deepStrictEqual(calls[0], [evaluationPromise!, 'reject'], "first call should be 'reject'");
  assert.deepStrictEqual(calls[1], [evaluationPromise!, 'handle'], "second call should be 'handle'");
});
