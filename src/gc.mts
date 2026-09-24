import type { Evaluator, EvaluatorNextType, EvaluatorYieldType } from './evaluator.mts';
import { surroundingAgent, type Agent } from './execution-context/Agent.mts';
import { HostEnqueueFinalizationRegistryCleanupJob } from './execution-context/WeakReference.mts';
import { isFinalizationRegistryObject, type FinalizationRegistryObject } from './intrinsics/FinalizationRegistry.mts';
import { isWeakMapObject, type WeakMapObject } from './intrinsics/WeakMap.mts';
import { isWeakRef, type WeakRefObject } from './intrinsics/WeakRef.mts';
import { isWeakSetObject, type WeakSetObject } from './intrinsics/WeakSet.mts';
import {
  ObjectValue,
  PrivateName,
  SymbolValue,
  Value,
} from './value.mts';

declare const referenceNodeIdBrand: unique symbol;

export type ReferenceNodeId = number & { readonly [referenceNodeIdBrand]: true };

export type ReferenceNodeKind =
  | 'object'
  | 'function'
  | 'symbol'
  | 'value'
  | 'agent'
  | 'realm'
  | 'execution-context'
  | 'environment'
  | 'module'
  | 'job'
  | 'callback'
  | 'evaluator'
  | 'record'
  | 'collection'
  | 'host';

export type ReferenceRootKind =
  | 'agent'
  | 'execution-context'
  | 'kept-object'
  | 'queued-job'
  | 'event-loop'
  | 'inspector'
  | 'host';

export type ReferenceReasonKind =
  | 'property'
  | 'element'
  | 'internal-slot'
  | 'binding'
  | 'private-element'
  | 'capture'
  | 'job'
  | 'host';

export interface ReferenceNode {
  readonly id: ReferenceNodeId;
  readonly kind: ReferenceNodeKind;
  readonly name: string;
  readonly shallowSize: number | null;
  readonly reachable: boolean;
}

export interface ReferenceReason {
  readonly kind: ReferenceReasonKind;
  readonly name: string;
}

interface ReferenceEdgeBase {
  readonly from: ReferenceNodeId;
  readonly to: ReferenceNodeId;
  readonly reason: ReferenceReason;
}

export type ReferenceEdge =
  | ReferenceEdgeBase & {
    readonly strength: 'strong' | 'weak';
  }
  | ReferenceEdgeBase & {
    readonly strength: 'ephemeron';
    readonly condition: ReferenceNodeId;
    readonly active: boolean;
  };

export interface ReferenceRoot {
  readonly kind: ReferenceRootKind;
  readonly name: string;
  readonly to: ReferenceNodeId;
}

export interface SerializedObjectReferenceGraph {
  readonly agentId: number;
  readonly nodes: readonly ReferenceNode[];
  readonly edges: readonly ReferenceEdge[];
  readonly roots: readonly ReferenceRoot[];
}

export interface ObjectReferenceGraphSnapshot extends SerializedObjectReferenceGraph {
  getNode(id: ReferenceNodeId): ReferenceNode | undefined;
  getNodeFor(value: object): ReferenceNode | undefined;
  referencing(id: ReferenceNodeId): readonly ReferenceEdge[];
  referencedBy(id: ReferenceNodeId): readonly ReferenceEdge[];
  isReachable(id: ReferenceNodeId): boolean;
  toJSON(): SerializedObjectReferenceGraph;
}

export type GCTraceTarget = unknown;

export interface GCMarkable {
  mark(trace: GCTrace): void;
}

export interface GCTrace {
  strong(name: string, target: GCTraceTarget, reason: ReferenceReasonKind): void;
  weak(name: string, target: GCTraceTarget, reason: ReferenceReasonKind): void;
  ephemeron(
    name: string,
    key: GCTraceTarget,
    value: GCTraceTarget,
    reason: ReferenceReasonKind,
  ): void;
}

export type GCCaptureProvider = () => Readonly<Record<string, GCTraceTarget>>;

export interface CaptureReferenceGraphOptions {
  readonly additionalRoots?: Iterable<{
    readonly name: string;
    readonly value: GCTraceTarget;
  }>;
}

export interface GarbageCollectionReport {
  readonly graph: ObjectReferenceGraphSnapshot;
  readonly cleared: {
    readonly weakRefs: number;
    readonly weakMapEntries: number;
    readonly weakSetEntries: number;
    readonly finalizationTargets: number;
  };
  readonly cleanupJobsScheduled: number;
}

export type GCRootHandle = Disposable;

export interface GarbageCollector {
  captureReferenceGraph(options?: CaptureReferenceGraphOptions): ObjectReferenceGraphSnapshot;
  collect(options?: CaptureReferenceGraphOptions): GarbageCollectionReport;
  addRoot(name: string, value: GCTraceTarget): GCRootHandle;
  addRootProvider(name: string, references: GCCaptureProvider): GCRootHandle;
  getValue(id: ReferenceNodeId): Value | undefined;
}

interface CaptureMetadata {
  readonly name: string;
  readonly kind: 'job' | 'callback' | 'evaluator' | 'host';
  readonly captures: GCCaptureProvider;
}

const capturedReferences = new WeakMap<object, CaptureMetadata[]>();

interface EvaluatorCaptureScope {
  readonly name: string;
  readonly captures: GCCaptureProvider;
}

const evaluatorCaptureScopes = new WeakMap<Evaluator<unknown>, EvaluatorCaptureScope[]>();
const activeEvaluatorStacks = new WeakMap<Agent, Evaluator<unknown>[]>();

export function withCapturedReferences<T extends object>(
  owner: T,
  options: CaptureMetadata,
): T {
  const metadata = capturedReferences.get(owner);
  if (metadata) {
    metadata.push(options);
  } else {
    capturedReferences.set(owner, [options]);
  }
  return owner;
}

interface RootRegistration {
  readonly name: string;
  readonly value?: GCTraceTarget;
  readonly provider?: GCCaptureProvider;
}

interface EphemeronEntry {
  readonly edgeIndex: number;
  readonly key: object;
  readonly value: object;
}

interface CleanupState {
  readonly weakRefs: Set<WeakRefObject>;
  readonly weakMaps: Set<WeakMapObject>;
  readonly weakSets: Set<WeakSetObject>;
  readonly finalizationRegistries: Set<FinalizationRegistryObject>;
}

class ObjectReferenceGraphSnapshotImpl implements ObjectReferenceGraphSnapshot {
  readonly agentId: number;

  readonly nodes: readonly ReferenceNode[];

  readonly edges: readonly ReferenceEdge[];

  readonly roots: readonly ReferenceRoot[];

  readonly #nodesById: ReadonlyMap<ReferenceNodeId, ReferenceNode>;

  readonly #nodesByValue: WeakMap<object, ReferenceNode>;

  readonly #referencing: ReadonlyMap<ReferenceNodeId, readonly ReferenceEdge[]>;

  readonly #referencedBy: ReadonlyMap<ReferenceNodeId, readonly ReferenceEdge[]>;

  constructor(
    agentId: number,
    nodes: ReferenceNode[],
    edges: ReferenceEdge[],
    roots: ReferenceRoot[],
    nodesByValue: WeakMap<object, ReferenceNode>,
  ) {
    this.agentId = agentId;
    this.nodes = Object.freeze(nodes.map((node) => Object.freeze(node)));
    this.edges = Object.freeze(edges.map((edge) => Object.freeze({
      ...edge,
      reason: Object.freeze(edge.reason),
    })));
    this.roots = Object.freeze(roots.map((root) => Object.freeze(root)));
    this.#nodesById = new Map(this.nodes.map((node) => [node.id, node]));
    this.#nodesByValue = nodesByValue;

    const referencing = new Map<ReferenceNodeId, ReferenceEdge[]>();
    const referencedBy = new Map<ReferenceNodeId, ReferenceEdge[]>();
    for (const edge of this.edges) {
      appendToMap(referencing, edge.from, edge);
      appendToMap(referencedBy, edge.to, edge);
    }
    this.#referencing = freezeEdgeMap(referencing);
    this.#referencedBy = freezeEdgeMap(referencedBy);
    Object.freeze(this);
  }

  getNode(id: ReferenceNodeId): ReferenceNode | undefined {
    return this.#nodesById.get(id);
  }

  getNodeFor(value: object): ReferenceNode | undefined {
    return this.#nodesByValue.get(value);
  }

  referencing(id: ReferenceNodeId): readonly ReferenceEdge[] {
    return this.#referencing.get(id) ?? emptyEdges;
  }

  referencedBy(id: ReferenceNodeId): readonly ReferenceEdge[] {
    return this.#referencedBy.get(id) ?? emptyEdges;
  }

  isReachable(id: ReferenceNodeId): boolean {
    return this.#nodesById.get(id)?.reachable === true;
  }

  toJSON(): SerializedObjectReferenceGraph {
    return Object.freeze({
      agentId: this.agentId,
      nodes: this.nodes,
      edges: this.edges,
      roots: this.roots,
    });
  }
}

const emptyEdges = Object.freeze([]) as readonly ReferenceEdge[];

class ReferenceGraphBuilder {
  readonly #nodes: ReferenceNode[] = [];

  readonly #edges: ReferenceEdge[] = [];

  readonly #roots: ReferenceRoot[] = [];

  readonly #nodesByValue = new WeakMap<object, ReferenceNode>();

  readonly #valuesById = new Map<ReferenceNodeId, object>();

  readonly #reachable = new Set<object>();

  readonly #worklist: object[] = [];

  readonly #ephemerons: EphemeronEntry[] = [];

  readonly cleanup: CleanupState = {
    weakRefs: new Set(),
    weakMaps: new Set(),
    weakSets: new Set(),
    finalizationRegistries: new Set(),
  };

  #current!: object;

  readonly agent: Agent;

  readonly allocateId: (value: object) => ReferenceNodeId;

  constructor(agent: Agent, allocateId: (value: object) => ReferenceNodeId) {
    this.agent = agent;
    this.allocateId = allocateId;
  }

  build(
    registrations: Iterable<RootRegistration>,
    options: CaptureReferenceGraphOptions,
  ): ObjectReferenceGraphSnapshotImpl {
    this.addRoot('agent', `Agent ${this.agent.AgentRecord.Signifier}`, this.agent);
    for (const [index, context] of this.agent.executionContextStack.entries()) {
      this.addRoot('execution-context', `Execution context ${index}`, context);
    }
    for (const value of this.agent.AgentRecord.KeptAlive) {
      this.addRoot('kept-object', 'AgentRecord.KeptAlive', value);
    }
    const queuedJobs = new Set([
      ...(this.agent.jobQueue.getQueuedJobsForGC?.() ?? []),
      ...(this.agent.eventLoop.getQueuedJobsForGC?.() ?? []),
    ]);
    for (const job of queuedJobs) {
      this.addRoot('queued-job', job.name, job);
    }
    this.addRoot('event-loop', 'Event loop', this.agent.eventLoop);
    for (const registration of registrations) {
      const kind = registration.name.startsWith('inspector:') ? 'inspector' : 'host';
      if (registration.provider) {
        for (const [name, target] of Object.entries(registration.provider())) {
          this.addRoot(kind, `${registration.name}.${name}`, target);
        }
      } else {
        this.addRoot(kind, registration.name, registration.value);
      }
    }
    for (const root of options.additionalRoots ?? []) {
      this.addRoot('host', root.name, root.value);
    }

    this.drainWorklist();
    this.activateEphemerons();

    const finalNodes = this.#nodes.map((node) => ({
      ...node,
      reachable: this.#reachable.has(this.#valuesById.get(node.id)!),
    }));
    const finalNodesByValue = new WeakMap<object, ReferenceNode>();
    for (const node of finalNodes) {
      finalNodesByValue.set(this.#valuesById.get(node.id)!, node);
    }

    return new ObjectReferenceGraphSnapshotImpl(
      this.agent.AgentRecord.Signifier,
      finalNodes,
      this.#edges,
      this.#roots,
      finalNodesByValue,
    );
  }

  isReachable(value: GCTraceTarget): value is object {
    return isObject(value) && this.#reachable.has(value);
  }

  private addRoot(kind: ReferenceRootKind, name: string, target: GCTraceTarget): void {
    if (!isObject(target)) return;
    const node = this.nodeFor(target);
    this.#roots.push({ kind, name, to: node.id });
    this.markReachable(target);
  }

  private drainWorklist(): void {
    let value = this.#worklist.pop();
    while (value) {
      this.visit(value);
      value = this.#worklist.pop();
    }
  }

  private activateEphemerons(): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const ephemeron of this.#ephemerons) {
        if (!this.#reachable.has(ephemeron.key)) continue;
        const edge = this.#edges[ephemeron.edgeIndex] as Extract<ReferenceEdge, { strength: 'ephemeron' }>;
        if (!edge.active) this.#edges[ephemeron.edgeIndex] = { ...edge, active: true };
        if (!this.#reachable.has(ephemeron.value)) {
          this.markReachable(ephemeron.value);
          this.drainWorklist();
          changed = true;
        }
      }
    }
  }

  private visit(value: object): void {
    this.#current = value;
    this.visitCaptures(value);
    this.registerCleanupTarget(value);

    if (isGCMarkable(value)) {
      value.mark(this.trace);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((target, index) => this.strong(`${index}`, target, 'element'));
      return;
    }
    if (value instanceof Map) {
      let index = 0;
      for (const [key, target] of value) {
        this.strong(`${index}:key`, key, 'element');
        this.strong(`${index}:value`, target, 'element');
        index += 1;
      }
      return;
    }
    if (value instanceof Set) {
      let index = 0;
      for (const target of value) {
        this.strong(`${index}`, target, 'element');
        index += 1;
      }
      return;
    }
    if (isEvaluator(value)) {
      // Evaluator references are declared through captureEvaluatorFrame().
    }
  }

  private visitCaptures(owner: object): void {
    for (const metadata of capturedReferences.get(owner) ?? []) {
      for (const [name, target] of Object.entries(metadata.captures())) {
        this.strong(`${metadata.name}.${name}`, target, metadata.kind === 'job' ? 'job' : 'capture');
      }
    }
    if (isEvaluator(owner)) {
      for (const scope of evaluatorCaptureScopes.get(owner) ?? []) {
        for (const [name, target] of Object.entries(scope.captures())) {
          this.strong(`${scope.name}.${name}`, target, 'capture');
        }
      }
    }
  }

  private registerCleanupTarget(value: object): void {
    if (!(value instanceof ObjectValue)) return;
    if (isWeakRef(value)) this.cleanup.weakRefs.add(value);
    if (isWeakMapObject(value)) this.cleanup.weakMaps.add(value);
    if (isWeakSetObject(value)) this.cleanup.weakSets.add(value);
    if (isFinalizationRegistryObject(value)) this.cleanup.finalizationRegistries.add(value);
  }

  private readonly trace: GCTrace = {
    strong: (name, target, reason) => this.strong(name, target, reason),
    weak: (name, target, reason) => this.weak(name, target, reason),
    ephemeron: (name, key, value, reason) => this.ephemeron(name, key, value, reason),
  };

  private strong(name: string, target: GCTraceTarget, reason: ReferenceReasonKind): void {
    if (!isObject(target)) return;
    this.#edges.push({
      from: this.nodeFor(this.#current).id,
      to: this.nodeFor(target).id,
      reason: { kind: reason, name },
      strength: 'strong',
    });
    this.markReachable(target);
  }

  private weak(name: string, target: GCTraceTarget, reason: ReferenceReasonKind): void {
    if (!isObject(target)) return;
    this.#edges.push({
      from: this.nodeFor(this.#current).id,
      to: this.nodeFor(target).id,
      reason: { kind: reason, name },
      strength: 'weak',
    });
  }

  private ephemeron(
    name: string,
    key: GCTraceTarget,
    value: GCTraceTarget,
    reason: ReferenceReasonKind,
  ): void {
    if (!isObject(key) || !isObject(value)) return;
    const edgeIndex = this.#edges.length;
    this.#edges.push({
      from: this.nodeFor(this.#current).id,
      to: this.nodeFor(value).id,
      reason: { kind: reason, name },
      strength: 'ephemeron',
      condition: this.nodeFor(key).id,
      active: false,
    });
    this.#ephemerons.push({ edgeIndex, key, value });
  }

  private markReachable(value: object): void {
    if (this.#reachable.has(value)) return;
    this.#reachable.add(value);
    this.#worklist.push(value);
  }

  private nodeFor(value: object): ReferenceNode {
    let node = this.#nodesByValue.get(value);
    if (node) return node;
    const id = this.allocateId(value);
    node = {
      id,
      kind: nodeKind(value, this.agent),
      name: nodeName(value, this.agent),
      shallowSize: nodeShallowSize(value),
      reachable: false,
    };
    this.#nodes.push(node);
    this.#nodesByValue.set(value, node);
    this.#valuesById.set(id, value);
    return node;
  }
}

class GarbageCollectorImpl implements GarbageCollector {
  readonly #ids = new WeakMap<object, ReferenceNodeId>();

  readonly #values = new Map<ReferenceNodeId, WeakRef<object>>();

  readonly #registrations = new Set<RootRegistration>();

  readonly #finalizedIds = new globalThis.FinalizationRegistry<ReferenceNodeId>((id) => {
    this.#values.delete(id);
  });

  #nextId = 1;

  readonly agent: Agent;

  constructor(agent: Agent) {
    this.agent = agent;
  }

  captureReferenceGraph(options: CaptureReferenceGraphOptions = {}): ObjectReferenceGraphSnapshot {
    return this.createBuilder().build(this.#registrations, options);
  }

  collect(options: CaptureReferenceGraphOptions = {}): GarbageCollectionReport {
    const builder = this.createBuilder();
    const graph = builder.build(this.#registrations, options);
    let weakRefs = 0;
    let weakMapEntries = 0;
    let weakSetEntries = 0;
    let finalizationTargets = 0;
    let cleanupJobsScheduled = 0;

    for (const weakRef of builder.cleanup.weakRefs) {
      if (weakRef.WeakRefTarget !== undefined && !builder.isReachable(weakRef.WeakRefTarget)) {
        weakRef.WeakRefTarget = undefined;
        weakRefs += 1;
      }
    }
    for (const weakMap of builder.cleanup.weakMaps) {
      for (const entry of weakMap.WeakMapData) {
        if (entry.Key !== undefined && !builder.isReachable(entry.Key)) {
          entry.Key = undefined;
          entry.Value = undefined;
          weakMapEntries += 1;
        }
      }
    }
    for (const weakSet of builder.cleanup.weakSets) {
      for (let index = 0; index < weakSet.WeakSetData.length; index += 1) {
        const entry = weakSet.WeakSetData[index];
        if (entry !== undefined && !builder.isReachable(entry)) {
          weakSet.WeakSetData[index] = undefined;
          weakSetEntries += 1;
        }
      }
    }
    for (const registry of builder.cleanup.finalizationRegistries) {
      let clearedRegistryTarget = false;
      for (const cell of registry.Cells) {
        if (cell.WeakRefTarget !== undefined && !builder.isReachable(cell.WeakRefTarget)) {
          cell.WeakRefTarget = undefined;
          finalizationTargets += 1;
          clearedRegistryTarget = true;
        }
      }
      if (clearedRegistryTarget && !this.agent.finalizationRegistryScheduledForCleanup.has(registry)) {
        HostEnqueueFinalizationRegistryCleanupJob(this.agent, registry);
        cleanupJobsScheduled += 1;
      }
    }

    for (const id of this.#values.keys()) {
      if (!graph.isReachable(id)) this.#values.delete(id);
    }

    return Object.freeze({
      graph,
      cleared: Object.freeze({
        weakRefs,
        weakMapEntries,
        weakSetEntries,
        finalizationTargets,
      }),
      cleanupJobsScheduled,
    });
  }

  addRoot(name: string, value: GCTraceTarget): GCRootHandle {
    return this.register({ name, value });
  }

  addRootProvider(name: string, provider: GCCaptureProvider): GCRootHandle {
    return this.register({ name, provider });
  }

  getValue(id: ReferenceNodeId): Value | undefined {
    const value = this.#values.get(id)?.deref();
    return value instanceof Value ? value : undefined;
  }

  private createBuilder(): ReferenceGraphBuilder {
    return new ReferenceGraphBuilder(this.agent, (value) => this.allocateId(value));
  }

  private allocateId(value: object): ReferenceNodeId {
    const existing = this.#ids.get(value);
    if (existing !== undefined) {
      if (!this.#values.has(existing)) {
        this.#values.set(existing, new WeakRef(value));
        this.#finalizedIds.register(value, existing);
      }
      return existing;
    }
    const id = this.#nextId as ReferenceNodeId;
    this.#nextId += 1;
    this.#ids.set(value, id);
    this.#values.set(id, new WeakRef(value));
    this.#finalizedIds.register(value, id);
    return id;
  }

  private register(registration: RootRegistration): GCRootHandle {
    this.#registrations.add(registration);
    let disposed = false;
    return Object.freeze({
      [Symbol.dispose]: () => {
        if (disposed) return;
        disposed = true;
        this.#registrations.delete(registration);
      },
    });
  }
}

export function createGarbageCollector(agent: Agent): GarbageCollector {
  return new GarbageCollectorImpl(agent);
}

export function stepEvaluator<Result>(
  evaluator: Evaluator<Result>,
  input: EvaluatorNextType,
): IteratorResult<EvaluatorYieldType, Result> {
  const stack = activeEvaluatorStacks.get(surroundingAgent);
  if (stack) stack.push(evaluator);
  else activeEvaluatorStacks.set(surroundingAgent, [evaluator]);
  try {
    return evaluator.next(input);
  } finally {
    const activeStack = activeEvaluatorStacks.get(surroundingAgent)!;
    activeStack.pop();
    if (activeStack.length === 0) activeEvaluatorStacks.delete(surroundingAgent);
  }
}

export function captureEvaluatorFrame(captures: GCCaptureProvider, name: string): Disposable {
  const evaluator = activeEvaluatorStacks.get(surroundingAgent)?.at(-1);
  if (!evaluator) throw new Error('No active evaluator');
  const scope: EvaluatorCaptureScope = { name, captures };
  const scopes = evaluatorCaptureScopes.get(evaluator);
  if (scopes) scopes.push(scope);
  else evaluatorCaptureScopes.set(evaluator, [scope]);
  let disposed = false;
  return Object.freeze({
    [Symbol.dispose]() {
      if (disposed) return;
      disposed = true;
      const currentScopes = evaluatorCaptureScopes.get(evaluator);
      if (!currentScopes) return;
      const index = currentScopes.indexOf(scope);
      if (index !== -1) currentScopes.splice(index, 1);
      if (currentScopes.length === 0) evaluatorCaptureScopes.delete(evaluator);
    },
  });
}

export function markActiveEvaluators(agent: Agent, trace: GCTrace): void {
  for (const evaluator of activeEvaluatorStacks.get(agent) ?? []) {
    trace.strong('activeEvaluator', evaluator, 'capture');
  }
}

function isEvaluator(value: object): value is Evaluator<unknown> {
  return 'next' in value && typeof value.next === 'function';
}

function isGCMarkable(value: object): value is GCMarkable {
  return 'mark' in value && typeof value.mark === 'function';
}

function isObject(value: GCTraceTarget): value is object {
  return (typeof value === 'object' || typeof value === 'function') && value !== null;
}

function nodeKind(value: object, agent: Agent): ReferenceNodeKind {
  if (value === agent) return 'agent';
  if (isEvaluator(value)) return 'evaluator';
  if (value instanceof SymbolValue || value instanceof PrivateName) return 'symbol';
  if (value instanceof ObjectValue) return 'Call' in value ? 'function' : 'object';
  if (value instanceof Value) return 'value';
  if (Array.isArray(value) || value instanceof Map || value instanceof Set) return 'collection';
  const name = knownConstructorName(value);
  if (name.includes('Realm')) return 'realm';
  if (name.includes('ExecutionContext')) return 'execution-context';
  if (name.includes('Environment')) return 'environment';
  if (name.includes('Module') || name.includes('ScriptRecord')) return 'module';
  if (name.includes('Job')) return 'job';
  return 'record';
}

function nodeName(value: object, agent: Agent): string {
  if (value === agent) return `Agent ${agent.AgentRecord.Signifier}`;
  if (isEvaluator(value)) {
    const name = evaluatorCaptureScopes.get(value)?.at(-1)?.name
      ?? capturedReferences.get(value)?.[0]?.name
      ?? 'anonymous';
    return `Evaluator / ${name}`;
  }
  if (value instanceof SymbolValue) return 'Symbol';
  if (value instanceof PrivateName) return `PrivateName(${value.Description})`;
  if (value instanceof ObjectValue) {
    if ('Call' in value) return 'Function';
    const typedArrayName = internalSlot(value, 'TypedArrayName');
    if (typeof typedArrayName === 'string') return typedArrayName;
    const prototype = internalSlot(value, 'Prototype');
    if (prototype instanceof ObjectValue) {
      const constructor = prototype.properties.get('constructor')?.Value;
      if (constructor instanceof ObjectValue) {
        const initialName = internalSlot(constructor, 'InitialName');
        if (typeof initialName === 'string' && initialName) {
          return initialName;
        }
      }
    }
    return 'Object';
  }
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  const captureName = capturedReferences.get(value)?.[0]?.name;
  if (captureName) return captureName;
  return knownConstructorName(value);
}

function nodeShallowSize(value: object): number | null {
  if (globalThis.ArrayBuffer.isView(value)) return value.byteLength;
  if (value instanceof globalThis.ArrayBuffer) return value.byteLength;
  return null;
}

function internalSlot(value: ObjectValue, name: string): unknown {
  if (!value.internalSlotsList.includes(name)) return undefined;
  return Object.getOwnPropertyDescriptor(value, name)?.value;
}

function knownConstructorName(value: object): string {
  const prototype = Object.getPrototypeOf(value) as { constructor?: unknown } | null;
  const constructor = prototype?.constructor;
  return typeof constructor === 'function' && constructor.name ? constructor.name : 'Record';
}

function appendToMap<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const values = map.get(key);
  if (values) values.push(value);
  else map.set(key, [value]);
}

function freezeEdgeMap(
  source: Map<ReferenceNodeId, ReferenceEdge[]>,
): ReadonlyMap<ReferenceNodeId, readonly ReferenceEdge[]> {
  return new Map([...source].map(([id, edges]) => [id, Object.freeze(edges)]));
}
