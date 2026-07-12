import { expect, test } from 'vitest';
import {
  Agent,
  ClearKeptObjects,
  Job,
  createTest262Intrinsics,
  FinishLoadingImportedModule,
  ManagedRealm,
  NormalCompletion,
  ObjectValue,
  Value,
  X,
  setSurroundingAgent,
  type Value as EngineValue,
  type WeakMapObject,
  type WeakRefObject,
  type WeakSetObject,
  type FinalizationRegistryObject,
} from '#self';

function setup() {
  const agent = new Agent({ startEventLoop: false });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  return { agent, realm };
}

function evalValue<T extends EngineValue = EngineValue>(realm: ManagedRealm, source: string): T {
  const completion = realm.evaluateScriptSkipDebugger(source);
  expect(completion).toBeInstanceOf(NormalCompletion);
  return X(completion) as T;
}

test('reference graph snapshots are immutable, serializable, and preserve node identity', () => {
  const { agent, realm } = setup();
  const object = evalValue<ObjectValue>(realm, 'globalThis.object = { child: {} }; object');

  const first = agent.gc.captureReferenceGraph();
  const second = agent.gc.captureReferenceGraph();
  const firstNode = first.getNodeFor(object)!;
  const secondNode = second.getNodeFor(object)!;

  expect(firstNode.id).toBe(secondNode.id);
  expect(Object.isFrozen(first)).toBe(true);
  expect(Object.isFrozen(first.nodes)).toBe(true);
  expect(Object.isFrozen(first.edges)).toBe(true);
  expect(Object.isFrozen(first.roots)).toBe(true);
  expect(Object.isFrozen(first.referencing(firstNode.id))).toBe(true);
  expect(first.nodes.every((node) => Object.keys(node).sort().join(',') === 'id,kind,name,reachable,shallowSize')).toBe(true);
  expect(first.toJSON()).toEqual({
    agentId: agent.AgentRecord.Signifier,
    nodes: first.nodes,
    edges: first.edges,
    roots: first.roots,
  });
});

test('reference graph classifies properties, elements, internal slots, bindings, and private elements', () => {
  const { agent, realm } = setup();
  const object = evalValue<ObjectValue>(realm, `
    let binding = { binding: true };
    class Box { #secret = { secret: true }; }
    globalThis.object = new Box();
    object[0] = {};
    object['01'] = {};
    object.named = {};
    object;
  `);

  const graph = agent.gc.captureReferenceGraph();
  const node = graph.getNodeFor(object)!;
  const reasons = graph.referencing(node.id).map((edge) => edge.reason);

  expect(reasons).toEqual(expect.arrayContaining([
    { kind: 'element', name: '0' },
    { kind: 'property', name: '01' },
    { kind: 'property', name: 'named' },
  ]));
  expect(graph.edges.some((edge) => edge.reason.kind === 'internal-slot')).toBe(true);
  expect(graph.edges.some((edge) => edge.reason.kind === 'binding')).toBe(true);
  expect(graph.edges.some((edge) => edge.reason.kind === 'private-element')).toBe(true);
  for (const edge of graph.edges) {
    expect(graph.referencing(edge.from)).toContain(edge);
    expect(graph.referencedBy(edge.to)).toContain(edge);
  }
});

test('typed arrays expose their type and backing store size', () => {
  const { agent, realm } = setup();
  const typedArray = evalValue<ObjectValue>(realm, `
    globalThis.x = { y: new Uint8Array(2 ** 20) };
    x.y;
  `);

  const graph = agent.gc.captureReferenceGraph();
  const typedArrayNode = graph.getNodeFor(typedArray)!;
  expect(typedArrayNode.name).toBe('Uint8Array');

  const bufferEdge = graph.referencing(typedArrayNode.id)
    .find((edge) => edge.reason.name === '[[ViewedArrayBuffer]]')!;
  const bufferNode = graph.getNode(bufferEdge.to)!;
  expect(bufferNode.name).toBe('ArrayBuffer');

  const dataEdge = graph.referencing(bufferNode.id)
    .find((edge) => edge.reason.name === '[[ArrayBufferData]]')!;
  expect(graph.getNode(dataEdge.to)).toMatchObject({
    name: 'DataBlock',
    shallowSize: 2 ** 20,
  });
});

test('object nodes use their JavaScript constructor names', () => {
  const { agent, realm } = setup();
  const values = evalValue<ObjectValue>(realm, `
    class Box {}
    globalThis.values = {
      array: [],
      map: new Map(),
      set: new Set(),
      weakMap: new WeakMap(),
      weakSet: new WeakSet(),
      date: new Date(),
      regexp: /gc/,
      promise: Promise.resolve(),
      error: new TypeError(),
      dataView: new DataView(new ArrayBuffer(8)),
      custom: new Box(),
    };
    values;
  `);

  const graph = agent.gc.captureReferenceGraph();
  const valuesNode = graph.getNodeFor(values)!;
  const names = Object.fromEntries(graph.referencing(valuesNode.id)
    .filter((edge) => edge.reason.kind === 'property')
    .map((edge) => [edge.reason.name, graph.getNode(edge.to)?.name]));
  expect(names).toMatchObject({
    array: 'Array',
    map: 'Map',
    set: 'Set',
    weakMap: 'WeakMap',
    weakSet: 'WeakSet',
    date: 'Date',
    regexp: 'RegExp',
    promise: 'Promise',
    error: 'TypeError',
    dataView: 'DataView',
    custom: 'Box',
  });
});

test('root handles, providers, and idempotent disposal control host reachability', () => {
  const { agent, realm } = setup();
  const first = evalValue<ObjectValue>(realm, '({ first: true })');
  const second = evalValue<ObjectValue>(realm, '({ second: true })');
  let current: ObjectValue | undefined = first;
  const root = agent.gc.addRootProvider('host:request', () => ({ current }));

  expect(agent.gc.captureReferenceGraph().getNodeFor(first)?.reachable).toBe(true);
  current = second;
  const updated = agent.gc.captureReferenceGraph();
  expect(updated.getNodeFor(first)?.reachable).not.toBe(true);
  expect(updated.getNodeFor(second)?.reachable).toBe(true);

  root[Symbol.dispose]();
  root[Symbol.dispose]();
  expect(agent.gc.captureReferenceGraph().getNodeFor(second)?.reachable).not.toBe(true);
});

test('collect clears weak references and weak collection entries once', () => {
  const { agent, realm } = setup();
  const weakRef = evalValue<WeakRefObject>(realm, 'globalThis.weakRef = new WeakRef({}); weakRef');
  const weakMap = evalValue<WeakMapObject>(realm, 'globalThis.weakMap = new WeakMap([[{}, {}]]); weakMap');
  const weakSet = evalValue<WeakSetObject>(realm, 'globalThis.weakSet = new WeakSet([{}]); weakSet');
  ClearKeptObjects();

  const first = agent.gc.collect();
  expect(first.cleared).toEqual({
    weakRefs: 1,
    weakMapEntries: 1,
    weakSetEntries: 1,
    finalizationTargets: 0,
  });
  expect(weakRef.WeakRefTarget).toBeUndefined();
  expect(weakMap.WeakMapData[0]).toEqual({ Key: undefined, Value: undefined });
  expect(weakSet.WeakSetData[0]).toBeUndefined();
  expect(agent.gc.collect().cleared).toEqual({
    weakRefs: 0,
    weakMapEntries: 0,
    weakSetEntries: 0,
    finalizationTargets: 0,
  });
});

test('ephemerons reach a fixed point independent of entry discovery order', () => {
  const { agent, realm } = setup();
  const value = evalValue<ObjectValue>(realm, `
    globalThis.keyA = {};
    const keyB = {};
    globalThis.value = {};
    globalThis.map2 = new WeakMap([[keyB, value]]);
    globalThis.map1 = new WeakMap([[keyA, keyB]]);
    value;
  `);

  const report = agent.gc.collect();
  expect(report.cleared.weakMapEntries).toBe(0);
  expect(report.graph.getNodeFor(value)?.reachable).toBe(true);
  const active = report.graph.edges.filter((edge) => edge.strength === 'ephemeron');
  expect(active).toHaveLength(2);
  expect(active.every((edge) => edge.active)).toBe(true);
});

test('an ephemeron cycle without an externally live key does not retain itself', () => {
  const { agent, realm } = setup();
  const firstMap = evalValue<WeakMapObject>(realm, `
    globalThis.firstMap = new WeakMap();
    globalThis.secondMap = new WeakMap();
    (() => {
      const keyA = {};
      const keyB = {};
      firstMap.set(keyA, keyB);
      secondMap.set(keyB, keyA);
    })();
    firstMap;
  `);
  const secondMap = evalValue<WeakMapObject>(realm, 'secondMap');

  const report = agent.gc.collect();
  expect(report.cleared.weakMapEntries).toBe(2);
  expect(firstMap.WeakMapData[0]!.Key).toBeUndefined();
  expect(secondMap.WeakMapData[0]!.Key).toBeUndefined();
  expect(report.graph.edges
    .filter((edge) => edge.strength === 'ephemeron')
    .every((edge) => !edge.active)).toBe(true);
});

test('using disposes a host root during abrupt completion', () => {
  const { agent, realm } = setup();
  const value = evalValue<ObjectValue>(realm, '({ rooted: true })');
  expect(() => {
    using _ = agent.gc.addRoot('host:using', value);
    expect(agent.gc.captureReferenceGraph().getNodeFor(value)?.reachable).toBe(true);
    expect(_).toBeDefined();
    throw new Error('abrupt');
  }).toThrow('abrupt');
  expect(agent.gc.captureReferenceGraph().getNodeFor(value)?.reachable).not.toBe(true);
});

test('snapshots expose execution, kept, queued, event-loop, inspector, and host root categories', () => {
  const { agent, realm } = setup();
  const kept = evalValue<ObjectValue>(realm, 'const kept = {}; new WeakRef(kept); kept');
  const job = new Job({
    name: 'root-category-job',
    queueName: 'root-category',
    evaluate: function* rootCategoryJob() {
      return Value.undefined;
    },
    callerRealm: realm,
    callerScriptOrModule: Value.null,
    captures: null,
  });
  agent.jobQueue.enqueueGenericJob(job);
  using _ = agent.gc.addRoot('inspector:probe', kept);
  using _2 = agent.gc.addRoot('host:probe', kept);
  expect(_).toBeDefined();
  expect(_2).toBeDefined();
  const pop = realm.pushTopContext();
  const graph = agent.gc.captureReferenceGraph();
  pop?.();

  expect(new Set(graph.roots.map((root) => root.kind))).toEqual(new Set([
    'agent',
    'execution-context',
    'kept-object',
    'queued-job',
    'event-loop',
    'inspector',
    'host',
  ]));
  expect(graph.roots.some((root) => root.kind === 'queued-job' && root.to === graph.getNodeFor(job)?.id)).toBe(true);
});

test('current and debugger-paused evaluators keep live locals reachable', () => {
  const { agent, realm } = setup();
  createTest262Intrinsics(realm, false);
  expect(evalValue(realm, `
    globalThis.live = new WeakMap();
    (function () {
      const target = {};
      live.set(target, true);
      $262.gc();
      return live.has(target);
    })();
  `)).toBe(Value.true);

  evalValue(realm, 'globalThis.live = new WeakMap()');
  let pauses = 0;
  agent.hostDefinedOptions.onDebugger = () => {
    pauses += 1;
  };
  let completion: EngineValue | undefined;
  realm.evaluateScript(`
    (function () {
      const pausedTarget = {};
      live.set(pausedTarget, true);
      debugger;
      return live.has(pausedTarget);
    })();
  `, {}, (result) => {
    completion = X(result);
  });
  expect(pauses).toBe(1);
  expect(agent.isPaused()).toBe(true);
  expect(agent.gc.collect().cleared.weakMapEntries).toBe(0);
  agent.resumeEvaluate({ noBreakpoint: true });
  expect(completion).toBe(Value.true);
});

test('suspended generators and iterator factory captures retain their state', () => {
  const { realm } = setup();
  createTest262Intrinsics(realm, false);
  expect(evalValue(realm, `
    globalThis.generatorKeys = new WeakMap();
    globalThis.suspended = (function* () {
      const key = {};
      generatorKeys.set(key, true);
      yield 0;
      return generatorKeys.has(key);
    })();
    suspended.next();
    $262.gc();
    suspended.next().value;
  `)).toBe(Value.true);

  expect(evalValue(realm, `
    globalThis.iteratorKeys = new WeakMap();
    globalThis.mapIterator = (() => {
      const key = {};
      iteratorKeys.set(key, true);
      return new Map([[key, 1]]).keys();
    })();
    $262.gc();
    iteratorKeys.has(mapIterator.next().value);
  `)).toBe(Value.true);
});

test('promise reaction jobs retain abstract and ECMAScript closure captures', () => {
  const { agent, realm } = setup();
  createTest262Intrinsics(realm, false);
  evalValue(realm, `
    globalThis.promiseKeys = new WeakMap();
    globalThis.promiseResult = false;
    (() => {
      const key = {};
      promiseKeys.set(key, true);
      Promise.resolve().then(() => {
        $262.gc();
        promiseResult = promiseKeys.has(key);
      });
    })();
    $262.gc();
  `);
  expect(agent.gc.collect().cleared.weakMapEntries).toBe(0);
  agent.eventLoop.runOnce();
  expect(evalValue(realm, 'promiseResult')).toBe(Value.true);
});

test('FinalizationRegistry keeps held values, weakly traces tokens, and schedules cleanup once', () => {
  const { agent, realm } = setup();
  const registry = evalValue<FinalizationRegistryObject>(realm, `
    globalThis.cleaned = [];
    globalThis.registry = new FinalizationRegistry((held) => cleaned.push(held));
    (() => {
      const target = {};
      const token = {};
      registry.register(target, { held: true }, token);
    })();
    registry;
  `);

  const graph = agent.gc.captureReferenceGraph();
  const registryNode = graph.getNodeFor(registry)!;
  expect(graph.referencing(registryNode.id)).toEqual(expect.arrayContaining([
    expect.objectContaining({ strength: 'weak', reason: { kind: 'element', name: '[[Cells]][0].target' } }),
    expect.objectContaining({ strength: 'weak', reason: { kind: 'element', name: '[[Cells]][0].token' } }),
    expect.objectContaining({ strength: 'strong', reason: { kind: 'element', name: '[[Cells]][0].heldValue' } }),
  ]));

  const first = agent.gc.collect();
  expect(first.cleared.finalizationTargets).toBe(1);
  expect(first.cleanupJobsScheduled).toBe(1);
  expect(agent.gc.collect().cleanupJobsScheduled).toBe(0);
  expect(agent.finalizationRegistryScheduledForCleanup.has(registry)).toBe(true);
  agent.eventLoop.runOnce();
  expect(evalValue(realm, 'cleaned.length')).toEqual(Value(1));
  expect(registry.Cells).toHaveLength(0);
  expect(agent.finalizationRegistryScheduledForCleanup.has(registry)).toBe(false);
  expect(agent.gc.collect().cleanupJobsScheduled).toBe(0);
});

test('pending module loads are host-rooted until FinishLoadingImportedModule', () => {
  let finishLoading: (() => void) | undefined;
  const agent = new Agent({
    startEventLoop: false,
    hostHooks: {
      HostLoadImportedModule(referrer, moduleRequest, _hostDefined, payload) {
        finishLoading = () => {
          FinishLoadingImportedModule(referrer, moduleRequest, payload, realm.compileModule(''));
        };
      },
    },
  });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  realm.evaluateModule('import "pending";', 'entry', () => {});

  expect(finishLoading).toBeDefined();
  expect(agent.gc.captureReferenceGraph().roots.some((root) => root.name.startsWith('host:module-load'))).toBe(true);
  if (!finishLoading) throw new Error('HostLoadImportedModule was not called');
  finishLoading();
  expect(agent.gc.captureReferenceGraph().roots.some((root) => root.name.startsWith('host:module-load'))).toBe(false);
});

test('top-level await state remains reachable across Promise jobs', () => {
  const { agent, realm } = setup();
  let finished = false;
  realm.evaluateModule(`
    globalThis.tlaKeys = new WeakMap();
    const key = {};
    tlaKeys.set(key, true);
    await Promise.resolve();
    globalThis.tlaResult = tlaKeys.has(key);
  `, 'tla', () => {
    finished = true;
  });

  expect(agent.gc.collect().cleared.weakMapEntries).toBe(0);
  while (agent.jobQueue.length > 0 || agent.eventLoop.hasPendingJobs) {
    agent.eventLoop.runOnce();
  }
  expect(finished).toBe(true);
  expect(evalValue(realm, 'tlaResult')).toBe(Value.true);
});

test('class field decorator initializer records retain ECMAScript closures', () => {
  const agent = new Agent({ startEventLoop: false, features: ['decorators'] });
  setSurroundingAgent(agent);
  const realm = new ManagedRealm();
  createTest262Intrinsics(realm, false);

  expect(evalValue(realm, `
    globalThis.decoratorKeys = new WeakMap();
    globalThis.Decorated = (() => {
      const key = {};
      decoratorKeys.set(key, true);
      function retain(_value, context) {
        context.addInitializer(function () { this.decoratorKey = key; });
      }
      return class {
        @retain field;
      };
    })();
    $262.gc();
    const decorated = new Decorated();
    decoratorKeys.has(decorated.decoratorKey);
  `)).toBe(Value.true);
});
