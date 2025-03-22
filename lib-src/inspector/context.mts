import type { Protocol } from 'devtools-protocol';
import { getInspector } from './inspect.mts';
import {
  evalQ,
  EnsureCompletion, IsPromise, JSStringValue, ManagedRealm, NullValue, ObjectValue, SymbolValue, ThrowCompletion, UndefinedValue, Value,
  type PromiseObject,
  getHostDefinedErrorStack,
  skipDebugger,
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
} from '#self';

export class InspectorContext {
  realm: ManagedRealm;

  #idToObject = new Map<string, ObjectValue | SymbolValue>();

  #objectToId = new Map<ObjectValue | SymbolValue, string>();

  #objectCounter = 0;

  constructor(realm: ManagedRealm) {
    this.realm = realm;
  }

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

  toRemoteObject(value: Value, options: { objectGroup?: string }): Protocol.Runtime.RemoteObject {
    return getInspector(value).toRemoteObject(value, (val) => this.#internObject(val, options.objectGroup));
  }

  getProperties(object: ObjectValue): Protocol.Runtime.GetPropertiesResponse {
    const wrap = (v: Value) => this.toRemoteObject(v, {});

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

    const value = evalQ((Q) => {
      let p: NullValue | ObjectValue = object;
      while (p instanceof ObjectValue) {
        for (const key of Q(skipDebugger(p.OwnPropertyKeys()))) {
          const desc = Q(skipDebugger(p.GetOwnProperty(key)));
          // if (options.accessorPropertiesOnly && !IsAccessorDescriptor(desc)) {
          //   continue;
          // }
          if (desc instanceof UndefinedValue) {
            return;
          }
          const descriptor: Protocol.Runtime.PropertyDescriptor = {
            name: key instanceof JSStringValue
              ? key.stringValue()
              : SymbolDescriptiveString(key).stringValue(),
            value: desc.Value && !('HostUninitializedBindingMarkerObject' in desc.Value) ? wrap(desc.Value!) : undefined,
            writable: desc.Writable === Value.true,
            get: desc.Get ? wrap(desc.Get!) : undefined,
            set: desc.Set ? wrap(desc.Set!) : undefined,
            configurable: desc.Configurable === Value.true,
            enumerable: desc.Enumerable === Value.true,
            wasThrown: false,
            isOwn: p === object,
            symbol: key instanceof SymbolValue ? wrap(key) : undefined,
          };
          properties.push(descriptor);
        }

        // if (options.ownProperties) {
        //   break;
        // }
        p = Q(skipDebugger(p.GetPrototypeOf()));
      }
    });
    if (value.Type === 'throw') {
      return {
        result: [],
        exceptionDetails: this.createExceptionDetails(value),
      };
    }

    if (IsPromise(object) === Value.true) {
      internalProperties.push({
        name: '[[PromiseState]]',
        value: {
          type: 'string',
          value: (object as PromiseObject).PromiseState,
        },
      });
      internalProperties.push({
        name: '[[PromiseResult]]',
        value: wrap((object as PromiseObject).PromiseResult!),
      });
    }
    if ('Prototype' in object) {
      internalProperties.push({
        name: '[[Prototype]]',
        value: wrap(object.Prototype as Value),
      });
    }

    return { result: properties, internalProperties, privateProperties };
  }

  createExceptionDetails(completion: ThrowCompletion | Value): Protocol.Runtime.ExceptionDetails {
    const value = completion instanceof ThrowCompletion ? completion.Value : completion;
    const stack = getHostDefinedErrorStack(value);
    const frames: Protocol.Runtime.CallFrame[] = stack?.map((call) => call.toCallFrame()!).filter(Boolean) || [];
    return {
      text: 'Uncaught',
      stackTrace: stack ? { callFrames: frames! } : undefined,
      exception: getInspector(value).toRemoteObject(value, (val) => this.#internObject(val)),
      lineNumber: frames[0]?.lineNumber || 0,
      columnNumber: frames[0]?.columnNumber || 0,
      exceptionId: 0,
      scriptId: frames[0]?.scriptId,
      url: frames[0]?.url,
    };
  }

  createEvaluationResult(completion: ValueCompletion): Protocol.Runtime.EvaluateResponse {
    completion = EnsureCompletion(completion);
    if (!(completion.Value instanceof Value)) {
      throw new RangeError('Invalid completion value');
    }
    return {
      exceptionDetails: completion instanceof ThrowCompletion ? this.createExceptionDetails(completion) : undefined,
      result: this.toRemoteObject(completion.Value, {}),
    };
  }

  getDebuggerCallFrame(): Protocol.Debugger.CallFrame[] {
    const stacks = getCurrentStack(false);
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
        callFrameId: String(index),
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
