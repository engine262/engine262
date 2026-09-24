import { expect, test } from 'vitest';
import type { Protocol } from 'devtools-protocol';
import { TestInspector } from './utils.mts';
import {
  Agent,
  ClearKeptObjects,
  ManagedRealm,
  Value,
  X,
  Job,
  setSurroundingAgent,
  type WeakRefObject,
} from '#self';

interface InspectorMessage {
  readonly method?: string;
  readonly params?: Record<string, unknown>;
}

interface ParsedSnapshot {
  readonly snapshot: {
    readonly meta: {
      readonly node_fields: string[];
      readonly edge_fields: string[];
    };
    readonly node_count: number;
    readonly edge_count: number;
  };
  readonly nodes: number[];
  readonly edges: number[];
  readonly strings: string[];
}

interface ErrorResponse {
  readonly error: {
    readonly code: number;
    readonly message: string;
  };
}

async function setup() {
  const agent = new Agent({ startEventLoop: false });
  setSurroundingAgent(agent);
  const inspector = new TestInspector();
  const realm = new ManagedRealm();
  inspector.attachAgent(agent, [realm]);
  await inspector.heapProfiler.enable();
  inspector.flush();
  return { agent, inspector, realm };
}

function events(messages: object[]): InspectorMessage[] {
  return messages.filter((message): message is InspectorMessage => 'method' in message && !('id' in message));
}

test('collectGarbage invokes every attached agent collector', async () => {
  const { agent, inspector, realm } = await setup();
  await inspector.eval('globalThis.weakRef = new WeakRef({ collected: true })');
  const weakRef = X(realm.evaluateScriptSkipDebugger('weakRef')) as WeakRefObject;
  ClearKeptObjects();

  const secondAgent = new Agent({ startEventLoop: false });
  setSurroundingAgent(secondAgent);
  const secondRealm = new ManagedRealm();
  inspector.attachAgent(secondAgent, [secondRealm]);
  const secondWeakRef = X(secondRealm.evaluateScriptSkipDebugger(
    'globalThis.weakRef = new WeakRef({ collected: true }); weakRef',
  )) as WeakRefObject;
  ClearKeptObjects();
  setSurroundingAgent(agent);

  await inspector.heapProfiler.collectGarbage();
  expect(weakRef.WeakRefTarget).toBeUndefined();
  expect(secondWeakRef.WeakRefTarget).toBeUndefined();
});

test('takeHeapSnapshot emits bounded chunks after final progress and preserves flat-array invariants', async () => {
  const { agent, inspector, realm } = await setup();
  const captured = X(realm.evaluateScriptSkipDebugger('({ captured: true })'));
  agent.jobQueue.enqueueGenericJob(new Job({
    name: 'snapshotProbeJob',
    queueName: 'snapshot-probe',
    evaluate: function* snapshotProbeJob() {
      return Value.undefined;
    },
    callerRealm: realm,
    callerScriptOrModule: Value.null,
    captures: () => ({ captured }),
  }));
  await inspector.debugger.disable();
  inspector.flush();

  await inspector.heapProfiler.takeHeapSnapshot({ reportProgress: true });
  const heapEvents = events(inspector.flush())
    .filter((event) => event.method?.startsWith('HeapProfiler.'));
  const progressIndex = heapEvents.findIndex((event) => event.method === 'HeapProfiler.reportHeapSnapshotProgress');
  const firstChunkIndex = heapEvents.findIndex((event) => event.method === 'HeapProfiler.addHeapSnapshotChunk');
  expect(progressIndex).toBeGreaterThanOrEqual(0);
  expect(firstChunkIndex).toBeGreaterThan(progressIndex);
  expect(heapEvents[progressIndex]!.params).toMatchObject({ finished: true });

  const chunks = heapEvents
    .filter((event) => event.method === 'HeapProfiler.addHeapSnapshotChunk')
    .map((event) => event.params!.chunk as string);
  expect(chunks.length).toBeGreaterThan(1);
  expect(chunks.every((chunk) => new TextEncoder().encode(chunk).byteLength <= 64 * 1024)).toBe(true);
  const snapshot = JSON.parse(chunks.join('')) as ParsedSnapshot;
  expect(snapshot.strings).toContain('(GC roots)');
  expect(snapshot.strings).toContain('snapshotProbeJob');
  expect(snapshot.strings.some((value) => value.includes('snapshotProbeJob.captured'))).toBe(true);

  const nodeWidth = snapshot.snapshot.meta.node_fields.length;
  const edgeWidth = snapshot.snapshot.meta.edge_fields.length;
  expect(snapshot.nodes).toHaveLength(nodeWidth * snapshot.snapshot.node_count);
  expect(snapshot.edges).toHaveLength(edgeWidth * snapshot.snapshot.edge_count);
  // Unknown shallow sizes are exported as one byte so Chrome DevTools does not hide the snapshot as empty.
  const edgeCountOffset = snapshot.snapshot.meta.node_fields.indexOf('edge_count');
  let edgeCount = 0;
  for (let index = edgeCountOffset; index < snapshot.nodes.length; index += nodeWidth) {
    edgeCount += snapshot.nodes[index]!;
  }
  expect(edgeCount).toBe(snapshot.snapshot.edge_count);
  const toNodeOffset = snapshot.snapshot.meta.edge_fields.indexOf('to_node');
  for (let index = toNodeOffset; index < snapshot.edges.length; index += edgeWidth) {
    expect(snapshot.edges[index]! % nodeWidth).toBe(0);
    expect(snapshot.edges[index]!).toBeGreaterThanOrEqual(0);
    expect(snapshot.edges[index]!).toBeLessThan(snapshot.nodes.length);
  }
});

test('reportProgress false emits chunks without progress events', async () => {
  const { inspector } = await setup();
  await inspector.heapProfiler.takeHeapSnapshot({ reportProgress: false });
  const heapEvents = events(inspector.flush())
    .filter((event) => event.method?.startsWith('HeapProfiler.'));
  expect(heapEvents.some((event) => event.method === 'HeapProfiler.reportHeapSnapshotProgress')).toBe(false);
  expect(heapEvents.some((event) => event.method === 'HeapProfiler.addHeapSnapshotChunk')).toBe(true);
});

test('paused evaluator nodes and capture edges appear in heap snapshots', async () => {
  const { agent, inspector } = await setup();
  const evaluation = inspector.eval(`
    (() => {
      const heapEvaluatorCapture = { retained: true };
      debugger;
      return heapEvaluatorCapture;
    })()
  `);
  expect(agent.isPaused()).toBe(true);
  inspector.flush();

  await inspector.heapProfiler.takeHeapSnapshot({ reportProgress: false });
  const chunks = events(inspector.flush())
    .filter((event) => event.method === 'HeapProfiler.addHeapSnapshotChunk')
    .map((event) => event.params!.chunk as string);
  const snapshot = JSON.parse(chunks.join('')) as ParsedSnapshot;
  expect(snapshot.strings.some((value) => value.startsWith('Evaluator / '))).toBe(true);
  expect(snapshot.strings.some((value) => value.includes('heapEvaluatorCapture'))).toBe(true);

  await inspector.debugger.resume();
  await evaluation;
});

test('snapshot node ids round trip through getObjectByHeapObjectId', async () => {
  const { inspector } = await setup();
  const remote = await inspector.eval('({ roundTrip: true })') as Protocol.Runtime.RemoteObject;
  await inspector.heapProfiler.takeHeapSnapshot({ reportProgress: false });
  const chunks = events(inspector.flush())
    .filter((event) => event.method === 'HeapProfiler.addHeapSnapshotChunk')
    .map((event) => event.params!.chunk as string);
  const snapshot = JSON.parse(chunks.join('')) as ParsedSnapshot;
  const heapId = await inspector.heapProfiler.getHeapObjectId({ objectId: remote.objectId! }) as Protocol.HeapProfiler.GetHeapObjectIdResponse;
  const nodeWidth = snapshot.snapshot.meta.node_fields.length;
  const idOffset = snapshot.snapshot.meta.node_fields.indexOf('id');
  const snapshotIds = snapshot.nodes.filter((_, index) => index % nodeWidth === idOffset);
  expect(Number(heapId.heapSnapshotObjectId)).toBeLessThanOrEqual(0xFFFF_FFFF);
  expect(snapshotIds).toContain(Number(heapId.heapSnapshotObjectId));

  const roundTrip = await inspector.heapProfiler.getObjectByHeapObjectId({
    objectId: heapId.heapSnapshotObjectId,
    objectGroup: 'round-trip',
  }) as Protocol.Runtime.RemoteObject;

  expect(roundTrip.objectId).toBeDefined();
  expect(roundTrip.description).toBe('Object');
});

test('released objects and unknown heap ids return formal CDP errors', async () => {
  const { inspector } = await setup();
  const remote = await inspector.eval('({ released: true })') as Protocol.Runtime.RemoteObject;
  const heapId = await inspector.heapProfiler.getHeapObjectId({ objectId: remote.objectId! }) as Protocol.HeapProfiler.GetHeapObjectIdResponse;
  await inspector.runtime.releaseObject({ objectId: remote.objectId! });
  await inspector.heapProfiler.collectGarbage();

  const released = await inspector.heapProfiler.getObjectByHeapObjectId({
    objectId: heapId.heapSnapshotObjectId,
  }) as ErrorResponse;
  const unknown = await inspector.heapProfiler.getObjectByHeapObjectId({ objectId: 'unknown' }) as ErrorResponse;
  expect(released.error.code).toBe(-32000);
  expect(unknown.error.code).toBe(-32000);
});

test('inspected heap object roots are capped at five and released by disable', async () => {
  const { inspector } = await setup();
  const heapIds = await Promise.all(Array.from({ length: 6 }, async (_, index) => {
    const remote = await inspector.eval(`({ index: ${index} })`) as Protocol.Runtime.RemoteObject;
    const response = await inspector.heapProfiler.getHeapObjectId({ objectId: remote.objectId! }) as Protocol.HeapProfiler.GetHeapObjectIdResponse;
    await inspector.heapProfiler.addInspectedHeapObject({ heapObjectId: response.heapSnapshotObjectId });
    await inspector.runtime.releaseObject({ objectId: remote.objectId! });
    return response.heapSnapshotObjectId;
  }));
  await inspector.heapProfiler.collectGarbage();

  const evicted = await inspector.heapProfiler.getObjectByHeapObjectId({ objectId: heapIds[0]! }) as ErrorResponse;
  const retained = await inspector.heapProfiler.getObjectByHeapObjectId({ objectId: heapIds[5]! }) as Protocol.Runtime.RemoteObject;
  expect(evicted.error.code).toBe(-32000);
  expect(retained.objectId).toBeDefined();

  await inspector.heapProfiler.disable();
  const disabled = await inspector.heapProfiler.getObjectByHeapObjectId({ objectId: heapIds[5]! }) as ErrorResponse;
  expect(disabled.error.code).toBe(-32000);
});

test('object groups and agent detach release every inspector root', async () => {
  const { agent, inspector } = await setup();
  const grouped = await inspector.runtime.evaluate({
    expression: '({ grouped: true })',
    uniqueContextId: '0',
    objectGroup: 'gc-group',
  }) as Protocol.Runtime.RemoteObject;
  expect(grouped.objectId).toBeDefined();
  expect(agent.gc.captureReferenceGraph().roots.some((root) => (
    root.kind === 'inspector' && root.name.includes(grouped.objectId!)
  ))).toBe(true);

  await inspector.runtime.releaseObjectGroup({ objectGroup: 'gc-group' });
  expect(agent.gc.captureReferenceGraph().roots.some((root) => root.name.includes(grouped.objectId!))).toBe(false);

  await inspector.eval('({ detached: true })');
  expect(agent.gc.captureReferenceGraph().roots.some((root) => root.kind === 'inspector')).toBe(true);
  inspector.detachAgent(agent);
  expect(agent.gc.captureReferenceGraph().roots.some((root) => root.kind === 'inspector')).toBe(false);
});

test('unsupported sampling and tracking requests immediately return MethodNotFound', async () => {
  const { inspector } = await setup();
  const responses = await Promise.all([
    inspector.heapProfiler.startSampling({}),
    inspector.heapProfiler.getSamplingProfile(),
    inspector.heapProfiler.stopSampling(),
    inspector.heapProfiler.startTrackingHeapObjects({}),
    inspector.heapProfiler.stopTrackingHeapObjects({}),
  ]) as ErrorResponse[];
  expect(responses.every((response) => response.error.code === -32601)).toBe(true);
});
