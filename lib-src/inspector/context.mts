import type { Protocol } from 'devtools-protocol';
import { getInspector } from './inspect.mts';
import type { Inspector } from './index.mts';
import {
  EnsureCompletion, JSStringValue, ManagedRealm, NullValue, ObjectValue, SymbolValue, ThrowCompletion, Value,
  getHostDefinedErrorStack,
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
  Agent,
  surroundingAgent,
  IsAccessorDescriptor,
  isIntegerIndex,
  isBuiltinFunctionObject,
  isArrayBufferObject,
  DataBlock,
  CallSite,
  CallFrame,
  type OrdinaryObject,
} from '#self';

interface InspectedRealmDescriptor {
  readonly realm: ManagedRealm;
  readonly descriptor: Protocol.Runtime.ExecutionContextDescription;
  readonly agent: Agent;
  detach(): void;
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
    const oldPromiseRejectionTracker = realm.HostDefined.promiseRejectionTracker;
    realm.HostDefined.promiseRejectionTracker = (promise, operation) => {
      oldPromiseRejectionTracker?.(promise, operation);
      if (operation === 'reject') {
        this.#io.sendEvent['Runtime.exceptionThrown']({
          timestamp: Date.now(),
          exceptionDetails: this.createExceptionDetails(promise, true),
        });
      } else {
        const id = this.#exceptionMap.get(promise);
        if (id) {
          this.#io.sendEvent['Runtime.exceptionRevoked']({
            reason: 'Handler added to rejected promise',
            exceptionId: id,
          });
        }
      }
    };
    this.#io.sendEvent['Runtime.executionContextCreated']({ context: descriptor });
  }

  detachAgent(agent: Agent) {
    for (const realm of this.realms) {
      if (realm?.agent === agent) {
        this.detachRealm(realm.realm);
      }
    }
  }

  detachRealm(realm: ManagedRealm) {
    const index = this.realms.findIndex((c) => c?.realm === realm);
    if (index === -1) {
      return;
    }
    const { descriptor } = this.realms[index]!;
    realm.HostDefined.attachingInspector = undefined;
    realm.HostDefined.attachingInspectorReportError = undefined;
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

  #idToObject = new Map<string, ObjectValue | SymbolValue>();

  // id 0 is falsy, skip it
  #idToArrayBufferBlock: (undefined | ArrayBuffer)[] = [undefined];

  #objectToId = new Map<ObjectValue | SymbolValue, string>();

  #objectCounter = 1;

  #internObject(object: ObjectValue | SymbolValue, group = 'default') {
    if (this.#objectToId.has(object)) {
      return this.#objectToId.get(object)!;
    }
    const id = `${group}:${this.#objectCounter}`;
    this.#objectCounter += 1;
    this.#idToObject.set(id, object);
    this.#objectToId.set(object, id);
    return id;
  }

  releaseObject(id: string) {
    const object = this.#idToObject.get(id);
    if (object) {
      this.#idToObject.delete(id);
      this.#objectToId.delete(object);
    }
  }

  releaseObjectGroup(group: string) {
    for (const [id, object] of this.#idToObject.entries()) {
      if (id.startsWith(group)) {
        this.#idToObject.delete(id);
        this.#objectToId.delete(object);
      }
    }
  }

  getObject(objectId: string) {
    return this.#idToObject.get(objectId);
  }

  toRemoteObject(value: Value, options: { objectGroup?: string, generatePreview?: boolean }): Protocol.Runtime.RemoteObject {
    return getInspector(value).toRemoteObject(value, (val) => this.#internObject(val, options.objectGroup), options.generatePreview);
  }

  getProperties({
    objectId, accessorPropertiesOnly, generatePreview, nonIndexedPropertiesOnly, ownProperties,
  }: Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.GetPropertiesResponse {
    const object = this.getObject(objectId);
    if (!(object instanceof ObjectValue)) {
      return { result: [] };
    }
    const wrap = (v: Value) => this.toRemoteObject(v, { generatePreview });

    const properties: Protocol.Runtime.PropertyDescriptor[] = [];
    const internalProperties: Protocol.Runtime.InternalPropertyDescriptor[] = [];
    const privateProperties: Protocol.Runtime.PrivatePropertyDescriptor[] = [];

    object.PrivateElements.forEach((value) => {
      privateProperties.push({
        name: value.Key.Description.stringValue(),
        value: value.Value ? wrap(value.Value) : undefined,
        get: value.Get ? wrap(value.Get) : undefined,
        set: value.Set ? wrap(value.Set) : undefined,
      });
    });

    (() => {
      let p: NullValue | ObjectValue = object;
      while (p instanceof ObjectValue) {
        for (const key of p.properties.keys()) {
          if (nonIndexedPropertiesOnly && isIntegerIndex(key)) {
            continue;
          }
          const desc = (p.properties.get(key));
          if (!desc) {
            return;
          }
          if (accessorPropertiesOnly && !IsAccessorDescriptor(desc)) {
            continue;
          }
          const descriptor: Protocol.Runtime.PropertyDescriptor = {
            name: key instanceof JSStringValue
              ? key.stringValue()
              : SymbolDescriptiveString(key).stringValue(),
            value: desc.Value && !('HostUninitializedBindingMarkerObject' in desc.Value) ? wrap(desc.Value) : undefined,
            writable: desc.Writable === Value.true,
            get: desc.Get ? wrap(desc.Get) : undefined,
            set: desc.Set ? wrap(desc.Set) : undefined,
            configurable: desc.Configurable === Value.true,
            enumerable: desc.Enumerable === Value.true,
            wasThrown: false,
            isOwn: p === object,
            symbol: key instanceof SymbolValue ? wrap(key) : undefined,
          };
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

    const additionalInternalFields = getInspector(object).toInternalProperties?.(object, (val) => this.#internObject(val, 'default'), generatePreview);
    if (additionalInternalFields) {
      internalProperties.push(...additionalInternalFields);
    }

    if ('Prototype' in object) {
      internalProperties.push({
        name: '[[Prototype]]',
        value: wrap(object.Prototype as Value),
      });
    }
    if (isBuiltinFunctionObject(object) && object.nativeFunction.section) {
      internalProperties.push({
        name: '[[Section]]',
        value: {
          type: 'string',
          value: object.nativeFunction.section,
        },
      });
    }
    if (isArrayBufferObject(object) && object.ArrayBufferData instanceof DataBlock) {
      internalProperties.push({
        name: '[[ArrayBufferByteLength]]',
        value: {
          type: 'number',
          value: object.ArrayBufferByteLength,
        },
      });
      this.#idToArrayBufferBlock.push(object.ArrayBufferData.buffer);
      internalProperties.push({
        name: '[[ArrayBufferData]]',
        value: {
          type: 'number',
          value: this.#idToArrayBufferBlock.length - 1,
        },
      });
    }

    return { result: properties, internalProperties, privateProperties };
  }

  #exceptionMap = new WeakMap<Value, number>();

  createExceptionDetails(completion: ThrowCompletion | Value, isPromise: boolean): Protocol.Runtime.ExceptionDetails {
    const value = completion instanceof ThrowCompletion ? completion.Value : completion;
    const stack = getHostDefinedErrorStack(value);
    const frames = InspectorContext.callSiteToCallFrame(stack);
    const exceptionId = this.#objectCounter;
    this.#objectCounter += 1;
    this.#exceptionMap.set(value, exceptionId);
    return {
      text: isPromise ? 'Uncaught (in promise)' : 'Uncaught',
      stackTrace: stack ? { callFrames: frames } : undefined,
      exception: getInspector(value).toRemoteObject(value, (val) => this.#internObject(val), false),
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

  createEvaluationResult(completion: ValueCompletion): Protocol.Runtime.EvaluateResponse {
    completion = EnsureCompletion(completion);
    if (!(completion.Value instanceof Value)) {
      throw new RangeError('Invalid completion value');
    }
    return {
      exceptionDetails: completion instanceof ThrowCompletion ? this.createExceptionDetails(completion, false) : undefined,
      result: this.toRemoteObject(completion.Value, {}),
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
      let env: EnvironmentRecord | NullValue = stack.context.LexicalEnvironment;
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

function HostGetThisEnvironment(env: EnvironmentRecord | NullValue): Value {
  while (!(env instanceof NullValue)) {
    const exists = env.HasThisBinding();
    if (exists === Value.true) {
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

function getDisplayObjectFromEnvironmentRecord(record: EnvironmentRecord): undefined | { type: Protocol.Debugger.Scope['type'], object: ObjectValue } {
  if (record instanceof DeclarativeEnvironmentRecord) {
    const object = OrdinaryObjectCreate(Value.null, ['HostInspectorScopePreview']);
    for (const [key, binding] of record.bindings) {
      const value = binding.initialized ? binding.value! : OrdinaryObjectCreate(Value.null, ['HostUninitializedBindingMarkerObject']);
      if (isArgumentExoticObject(value)) {
        continue;
      }
      object.properties.set(key, Descriptor({
        Enumerable: isArgumentExoticObject(value) ? Value.false : Value.true,
        Value: value,
        Writable: binding.mutable ? Value.true : Value.false,
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
    return { type: record.IsWithEnvironment === Value.true ? 'with' : 'global', object: record.BindingObject };
  } else if (record instanceof GlobalEnvironmentRecord) {
    return { type: 'global', object: record.GlobalThisValue };
  }
  throw new TypeError('Unknown environment record');
}
