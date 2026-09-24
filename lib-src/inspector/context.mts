import type { Protocol } from 'devtools-protocol';
import { getInspector } from './objects/index.mts';
import type { Inspector } from './index.mts';
import {
  EnsureCompletion, JSStringValue, ManagedRealm, ObjectValue, SymbolValue, ThrowCompletion, Value,
  getHostDefinedErrorDetails,
  type Agent,
  type CallFrame,
  type CallSite,
  type NullValue,
  type ValueCompletion,
  getCurrentStack,
  isECMAScriptFunctionObject,
  SymbolDescriptiveString,
  type EnvironmentRecordWithThisBinding,
  EnvironmentRecord,
  DeclarativeEnvironmentRecord,
  ObjectEnvironmentRecord,
  FunctionEnvironmentRecord,
  GlobalEnvironmentRecord,
  ModuleEnvironmentRecord,
  OrdinaryObjectCreate,
  Descriptor,
  isArgumentExoticObject,
  surroundingAgent,
  IsAccessorDescriptor,
  isIntegerIndex,
  type OrdinaryObject,
  type GCRootHandle,
  type ObjectReferenceGraphSnapshot,
  type ReferenceNodeId,
} from '#self';

interface InspectedRealmDescriptor {
  readonly realm: ManagedRealm;
  readonly descriptor: Protocol.Runtime.ExecutionContextDescription;
  readonly agent: Agent;
  readonly rootHandle: GCRootHandle;
  detach(): void;
}

export interface RemoteObjectEntry {
  readonly value: ObjectValue | SymbolValue;
  readonly agent: Agent;
  readonly group: string;
  readonly rootHandle: GCRootHandle;
}

export class InspectorContext {
  #io: Inspector;

  constructor(io: Inspector) {
    this.#io = io;
  }

  realms: (InspectedRealmDescriptor | undefined)[] = [];

  attachRealm(realm: ManagedRealm, agent: Agent) {
    const id = this.realms.length;
    const descriptor: Protocol.Runtime.ExecutionContextDescription = {
      id,
      origin: realm.HostDefined.specifier || 'vm://repl',
      name: realm.HostDefined.name || 'engine262',
      uniqueId: id.toString(),
    };
    this.realms.push({
      realm,
      descriptor,
      agent,
      rootHandle: agent.gc.addRoot(`inspector:realm:${id}`, realm),
      detach: () => {
        realm.HostDefined.attachingInspector = oldInspector;
        realm.HostDefined.attachingInspectorReportError = function attachingInspectorReportError(realm, error) {
          if (this.attachingInspector && realm instanceof ManagedRealm) {
            (this.attachingInspector as Inspector).console(realm, 'error' as Protocol.Runtime.ConsoleAPICalledEventType, [error]);
          }
        };
      },
    });
    const oldInspector = realm.HostDefined.attachingInspector;
    realm.HostDefined.attachingInspector = this.#io;
    this.#io.sendEvent['Runtime.executionContextCreated']({ context: descriptor });
  }

  detachAgent(agent: Agent) {
    for (const realm of this.realms) {
      if (realm?.agent === agent) {
        this.detachRealm(realm.realm);
      }
    }
    for (const [id, entry] of this.#remoteObjects) {
      if (entry.agent === agent) this.releaseObject(id);
    }
    this.resetHeapProfiler();
  }

  detachRealm(realm: ManagedRealm) {
    const index = this.realms.findIndex((c) => c?.realm === realm);
    if (index === -1) {
      return;
    }
    const { descriptor, rootHandle } = this.realms[index]!;
    realm.HostDefined.attachingInspector = undefined;
    realm.HostDefined.attachingInspectorReportError = undefined;
    rootHandle[Symbol.dispose]();
    this.realms[index] = undefined;
    this.#io.sendEvent['Runtime.executionContextDestroyed']({ executionContextId: descriptor.id, executionContextUniqueId: descriptor.uniqueId });
  }

  getRealm(realm: ManagedRealm | string | number | undefined) {
    if (realm === undefined) {
      if (surroundingAgent.runningExecutionContext && surroundingAgent.currentRealmRecord instanceof ManagedRealm) {
        realm = surroundingAgent.currentRealmRecord;
      } else {
        return undefined;
      }
    }
    if (typeof realm === 'string') {
      return this.realms.find((c) => c?.descriptor.uniqueId === realm);
    } else if (typeof realm === 'number') {
      return this.realms[realm];
    }
    return this.realms.find((c) => c?.realm === realm);
  }

  /** @deprecated in this case we are guessing the realm should be using, which may create bad result */
  getAnyRealm() {
    return this.realms.find(Boolean);
  }

  get agents(): readonly Agent[] {
    return [...new Set(this.realms.flatMap((realm) => (realm ? [realm.agent] : [])))];
  }

  #remoteObjects = new Map<string, RemoteObjectEntry>();

  #objectToIds = new WeakMap<ObjectValue | SymbolValue, Map<string, string>>();

  #objectCounter = 1;

  #internObject(object: ObjectValue | SymbolValue, group = 'default', agent = surroundingAgent) {
    const ids = this.#objectToIds.get(object);
    const existing = ids?.get(group);
    if (existing) return existing;
    const id = `${group}:${this.#objectCounter}`;
    this.#objectCounter += 1;
    const rootHandle = agent.gc.addRoot(`inspector:remote:${id}`, object);
    this.#remoteObjects.set(id, {
      value: object,
      agent,
      group,
      rootHandle,
    });
    if (ids) ids.set(group, id);
    else this.#objectToIds.set(object, new Map([[group, id]]));
    return id;
  }

  releaseObject(id: string) {
    const entry = this.#remoteObjects.get(id);
    if (!entry) return;
    entry.rootHandle[Symbol.dispose]();
    this.#remoteObjects.delete(id);
    const ids = this.#objectToIds.get(entry.value);
    ids?.delete(entry.group);
    if (ids?.size === 0) this.#objectToIds.delete(entry.value);
  }

  releaseObjectGroup(group: string) {
    for (const [id, entry] of this.#remoteObjects) {
      if (entry.group === group) this.releaseObject(id);
    }
  }

  getObject(objectId: string) {
    return this.#remoteObjects.get(objectId)?.value;
  }

  getObjectEntry(objectId: string): RemoteObjectEntry | undefined {
    return this.#remoteObjects.get(objectId);
  }

  #heapObjects = new Map<string, { readonly agent: Agent; readonly id: ReferenceNodeId }>();

  #heapObjectIds = new Map<string, string>();

  #nextHeapObjectId = 1;

  #inspectedHeapObjects: { readonly heapObjectId: string; readonly rootHandle: GCRootHandle }[] = [];

  registerHeapSnapshot(agent: Agent, graph: ObjectReferenceGraphSnapshot): void {
    for (const node of graph.nodes) {
      this.#heapObjects.set(this.heapObjectId(agent, node.id), { agent, id: node.id });
    }
  }

  getHeapObjectId(objectId: string): string | undefined {
    const entry = this.getObjectEntry(objectId);
    if (!entry) return undefined;
    const graph = entry.agent.gc.captureReferenceGraph();
    const node = graph.getNodeFor(entry.value);
    if (!node) return undefined;
    const heapObjectId = this.heapObjectId(entry.agent, node.id);
    this.#heapObjects.set(heapObjectId, { agent: entry.agent, id: node.id });
    return heapObjectId;
  }

  getHeapObject(heapObjectId: string): { readonly agent: Agent; readonly id: ReferenceNodeId; readonly value: Value } | undefined {
    const entry = this.#heapObjects.get(heapObjectId);
    if (!entry) return undefined;
    const value = entry.agent.gc.getValue(entry.id);
    return value ? { ...entry, value } : undefined;
  }

  addInspectedHeapObject(heapObjectId: string): boolean {
    const entry = this.getHeapObject(heapObjectId);
    if (!entry) return false;
    const existing = this.#inspectedHeapObjects.findIndex((item) => item.heapObjectId === heapObjectId);
    if (existing !== -1) {
      const [item] = this.#inspectedHeapObjects.splice(existing, 1);
      this.#inspectedHeapObjects.push(item!);
      return true;
    }
    const rootHandle = entry.agent.gc.addRoot(`inspector:heap:${heapObjectId}`, entry.value);
    this.#inspectedHeapObjects.push({ heapObjectId, rootHandle });
    if (this.#inspectedHeapObjects.length > 5) {
      this.#inspectedHeapObjects.shift()!.rootHandle[Symbol.dispose]();
    }
    return true;
  }

  resetHeapProfiler(): void {
    for (const entry of this.#inspectedHeapObjects) entry.rootHandle[Symbol.dispose]();
    this.#inspectedHeapObjects.length = 0;
    this.#heapObjects.clear();
    this.#heapObjectIds.clear();
    this.#nextHeapObjectId = 1;
  }

  getHeapSnapshotObjectId(agent: Agent, id: ReferenceNodeId): string {
    return this.heapObjectId(agent, id);
  }

  private heapObjectId(agent: Agent, id: ReferenceNodeId): string {
    const key = `${agent.AgentRecord.Signifier}:${id}`;
    const existing = this.#heapObjectIds.get(key);
    if (existing) return existing;
    const heapObjectId = String(this.#nextHeapObjectId);
    this.#nextHeapObjectId += 2;
    this.#heapObjectIds.set(key, heapObjectId);
    return heapObjectId;
  }

  toRemoteObject(value: Value, options: { objectGroup?: string, generatePreview?: boolean, agent?: Agent }): Protocol.Runtime.RemoteObject {
    return getInspector(value).toRemoteObject(
      value,
      (val) => this.#internObject(val, options.objectGroup, options.agent),
      this,
      options.generatePreview,
    );
  }

  getProperties({
    objectId, accessorPropertiesOnly, generatePreview, nonIndexedPropertiesOnly, ownProperties,
  }: Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.GetPropertiesResponse {
    const entry = this.getObjectEntry(objectId);
    if (!entry || !(entry.value instanceof ObjectValue)) {
      return { result: [] };
    }
    const object = entry.value;
    const wrap = (v: Value) => this.toRemoteObject(v, { generatePreview, agent: entry.agent });

    const properties: Protocol.Runtime.PropertyDescriptor[] = [];
    const internalProperties: Protocol.Runtime.InternalPropertyDescriptor[] = [];
    const privateProperties: Protocol.Runtime.PrivatePropertyDescriptor[] = [];

    if (!accessorPropertiesOnly) {
      object.PrivateElements.forEach((value) => {
        const desc: Protocol.Runtime.PrivatePropertyDescriptor = {
          name: value.Key.Description,
        };
        if (value.Value) desc.value = wrap(value.Value);
        if (value.Get) desc.get = wrap(value.Get);
        if (value.Set) desc.set = wrap(value.Set);
        privateProperties.push(desc);
      });

      const exoticProperties = getInspector(object).exoticProperties?.(
        object,
        (val) => this.#internObject(val, 'default', entry.agent),
        this,
        generatePreview,
      );
      if (exoticProperties) {
        properties.push(...exoticProperties);
      }
    }

    (() => {
      let p: NullValue | ObjectValue = object;
      while (p instanceof ObjectValue) {
        for (const key of p.properties.keys()) {
          if (nonIndexedPropertiesOnly && isIntegerIndex(key)) {
            continue;
          }
          const desc = p.properties.get(key);
          if (!desc) {
            return;
          }
          if (accessorPropertiesOnly && !IsAccessorDescriptor(desc)) {
            continue;
          }
          const descriptor: Protocol.Runtime.PropertyDescriptor = {
            name: key instanceof JSStringValue
              ? key.stringValue()
              : SymbolDescriptiveString(key),
            writable: desc.Writable ?? false,
            configurable: desc.Configurable,
            enumerable: desc.Enumerable,
            isOwn: p === object,
          };
          if (desc.Value && !('HostUninitializedBindingMarkerObject' in desc.Value)) descriptor.value = wrap(desc.Value);
          if (desc.Get) descriptor.get = wrap(desc.Get);
          if (desc.Set) descriptor.set = wrap(desc.Set);
          if (key instanceof SymbolValue) descriptor.symbol = wrap(key);
          properties.push(descriptor);
        }

        if (ownProperties) {
          break;
        }
        if ('Prototype' in p) {
          p = (p as OrdinaryObject).Prototype;
        } else {
          p = Value.null;
        }
      }
    })();

    const additionalInternalFields = getInspector(object).toInternalProperties?.(
      object,
      (val) => this.#internObject(val, 'default', entry.agent),
      this,
      generatePreview,
    );
    if (additionalInternalFields) {
      internalProperties.push(...additionalInternalFields);
    }

    if ('Prototype' in object) {
      internalProperties.push({
        name: '[[Prototype]]',
        value: wrap(object.Prototype as Value),
      });
    }

    return { result: properties, internalProperties, privateProperties };
  }

  createExceptionDetails(completion: ThrowCompletion | Value, isPromise: boolean): Protocol.Runtime.ExceptionDetails {
    const value = completion instanceof ThrowCompletion ? completion.Value : completion;
    const { callStack } = getHostDefinedErrorDetails(value);
    const frames = InspectorContext.callSiteToCallFrame(callStack);
    const exceptionId = this.#objectCounter;
    this.#objectCounter += 1;
    return {
      text: isPromise ? 'Uncaught (in promise)' : 'Uncaught',
      stackTrace: callStack ? { callFrames: frames } : undefined,
      exception: getInspector(value).toRemoteObject(value, (val) => this.#internObject(val), this, false),
      lineNumber: frames[0]?.lineNumber || 0,
      columnNumber: frames[0]?.columnNumber || 0,
      exceptionId,
      scriptId: frames[0]?.scriptId,
      url: frames[0]?.url,
    };
  }

  static callSiteToCallFrame(callSite: readonly (CallSite | CallFrame)[] | undefined): Protocol.Runtime.CallFrame[] {
    return callSite?.map((call) => call.toCallFrame()!).filter(Boolean) || [];
  }

  createEvaluationResult(
    completion: ValueCompletion,
    options: { readonly objectGroup?: string; readonly agent?: Agent } = {},
  ): Protocol.Runtime.EvaluateResponse {
    completion = EnsureCompletion(completion);
    if (!(completion.Value instanceof Value)) {
      throw new RangeError('Invalid completion value');
    }
    return {
      exceptionDetails: completion instanceof ThrowCompletion ? this.createExceptionDetails(completion, false) : undefined,
      result: this.toRemoteObject(completion.Value, options),
    };
  }

  getDebuggerCallFrame(): Protocol.Debugger.CallFrame[] {
    const stacks = getCurrentStack(false);
    const length = surroundingAgent.executionContextStack.length;
    return stacks.map((stack, index): Protocol.Debugger.CallFrame => {
      if (!stack.getScriptId()) {
        return undefined!;
      }
      const scopeChain: Protocol.Debugger.Scope[] = [];
      let env: EnvironmentRecord | null = stack.context.LexicalEnvironment;
      while (env instanceof EnvironmentRecord) {
        const result = getDisplayObjectFromEnvironmentRecord(env);
        if (result) {
          scopeChain.push({ type: result.type, object: this.toRemoteObject(result.object, {}) });
        }
        env = env.OuterEnv;
      }
      return {
        callFrameId: String(length - index - 1),
        functionName: stack.getFunctionName() || '<anonymous>',
        location: {
          scriptId: stack.getScriptId()!,
          lineNumber: (stack.lineNumber || 1) - 1,
          columnNumber: (stack.columnNumber || 1) - 1,
        },
        this: this.toRemoteObject(HostGetThisEnvironment(stack.context.LexicalEnvironment), {}),
        url: stack.getSpecifier() || '',
        canBeRestarted: false,
        functionLocation: isECMAScriptFunctionObject(stack.context.Function) ? {
          lineNumber: (stack.context.Function.ECMAScriptCode?.location.start.line || 1) - 1,
          columnNumber: (stack.context.Function.ECMAScriptCode?.location.start.column || 1) - 1,
          scriptId: stack.getScriptId() || '',
        } : undefined,
        scopeChain,
      };
    }).filter(Boolean);
  }

  evaluateMode: 'script' | 'module' | 'console' = 'script';
}

function HostGetThisEnvironment(env: EnvironmentRecord | null): Value {
  while (env !== null) {
    const exists = env.HasThisBinding();
    if (exists) {
      const value = (env as EnvironmentRecordWithThisBinding).GetThisBinding();
      if (value instanceof ThrowCompletion) {
        return Value.undefined;
      }
      return value as Value;
    }
    const outer = env.OuterEnv;
    env = outer;
  }
  throw new ReferenceError('No this environment found');
}

export function getDisplayObjectFromEnvironmentRecord(record: EnvironmentRecord): undefined | { type: Protocol.Debugger.Scope['type'], object: ObjectValue } {
  if (record instanceof DeclarativeEnvironmentRecord) {
    const object = OrdinaryObjectCreate(Value.null, ['HostInspectorScopePreview']);
    for (const [key, binding] of record.bindings) {
      const value = binding.initialized ? binding.value! : OrdinaryObjectCreate(Value.null, ['HostUninitializedBindingMarkerObject']);
      if (isArgumentExoticObject(value)) {
        continue;
      }
      object.properties.set(key, Descriptor({
        Enumerable: isArgumentExoticObject(value) ? false : true,
        Value: value,
        Writable: binding.mutable || false,
        Configurable: true,
      }));
    }
    let type: Protocol.Debugger.Scope['type'] = 'block';
    if (record instanceof FunctionEnvironmentRecord) {
      type = 'local';
    } else if (record instanceof ModuleEnvironmentRecord) {
      type = 'module';
    }
    if (type !== 'local' && !object.properties.size) {
      return undefined;
    }
    return { type, object };
  } else if (record instanceof ObjectEnvironmentRecord) {
    return { type: record.IsWithEnvironment ? 'with' : 'global', object: record.BindingObject };
  } else if (record instanceof GlobalEnvironmentRecord) {
    return { type: 'global', object: record.GlobalThisValue };
  }
  throw new TypeError('Unknown environment record');
}
