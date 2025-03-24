/*!
 * engine262 0.0.1 82ce9702778d690a60b4d6a97ccabfc08002f716
 *
 * Copyright (c) 2018 engine262 Contributors
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import { surroundingAgent, evalQ, ObjectValue, skipDebugger, Get, Value, ToString, inspectDate, IsCallable, isDataViewObject, isArrayBufferObject, isTypedArrayObject, isPromiseObject, isProxyExoticObject, isErrorObject, isWeakSetObject, isWeakMapObject, isSetObject, isMapObject, isDateObject, isRegExpObject, isArrayExoticObject, BigIntValue, NumberValue, JSStringValue, SymbolValue, SymbolDescriptiveString, R, isIntegerIndex, IntrinsicsFunctionToString, isECMAScriptFunctionObject, PrivateName, UndefinedValue, IsPromise, ThrowCompletion, getHostDefinedErrorStack, EnsureCompletion, getCurrentStack, EnvironmentRecord, DeclarativeEnvironmentRecord, OrdinaryObjectCreate, isArgumentExoticObject, Descriptor, ObjectEnvironmentRecord, GlobalEnvironmentRecord, NullValue, FunctionEnvironmentRecord, ModuleEnvironmentRecord, Call, ParseScript, runJobQueue, DefinePropertyOrThrow, CreateBuiltinFunction, CreateDataProperty, gc, isBuiltinFunctionObject, DetachArrayBuffer, CreateNonEnumerableDataPropertyOrThrow } from './engine262.mjs';

/*
Test code: copy this into the inspector console.
primitive: console.log('primitive:', null, undefined, true, false, 0, -0, NaN, Infinity, -Infinity, 1n, 'string', Symbol(), Symbol('text'), Symbol.for('global'), Symbol.iterator);
fn: console.log('builtin:', eval, '\nfunction:', function() { code }, '\ngenerator:', function*() { code }, '\nasync:', async function() { code }, '\nasync generator:', async function*() { code }, '\narrow:', () => { code }, '\narrow async:', async () => { code });

normal: console.log('normal:', {}, new (class T { #a }), globalThis);
arraybuffer: console.log('arraybuffer:', new ArrayBuffer(8));
dataview: console.log('dataview:', new DataView(new ArrayBuffer(8)));
map: console.log('map:', new Map(), new Map([[eval, globalThis], [1, 2]]));
set: console.log('set:', new Set(), new Set([1, globalThis]));
weakmap: console.log('weakmap:', new WeakMap(), new WeakMap([[{}, 1]]));
weakset: console.log('weakset:', new WeakSet(), new WeakSet([{}]));
date: console.log('date:', new Date());
promise: console.log('promise:', new Promise(() => {}), Promise.resolve(globalThis), Promise.reject(globalThis));
proxy: {  const x = Proxy.revocable({}, {}); x.revoke(); console.log('proxy:', new Proxy({}, {}), new Proxy(function() {}, {}), x.proxy); }
regexp: console.log('regexp:', /pattern/, new RegExp('pattern', 'g'));
array: console.log('array:', [], [1, 2], Object.assign([1, 2], { a: 1 }), [0, ,,, 3]);
typedarray: console.log('typedarray:', new Int8Array(8), new Int16Array(8), new Int32Array(8), new Uint8Array(8), new Uint16Array(8), new Uint32Array(8), new Uint8ClampedArray(8), new Float32Array(8), new Float64Array(8), new BigInt64Array(8), new BigUint64Array(8));
*/

const Null = {
  toRemoteObject: () => ({
    type: 'object',
    subtype: 'null',
    value: null
  }),
  toObjectPreview: () => ({
    type: 'object',
    subtype: 'null',
    properties: [],
    overflow: false
  }),
  toPropertyPreview: name => ({
    name,
    type: 'object',
    subtype: 'null',
    value: 'null'
  }),
  toDescription: () => ''
};
const Undefined = {
  toRemoteObject: () => ({
    type: 'undefined'
  }),
  toObjectPreview: () => ({
    type: 'undefined',
    properties: [],
    overflow: false
  }),
  toPropertyPreview: name => ({
    name,
    type: 'undefined',
    value: 'undefined'
  }),
  toDescription: () => 'undefined'
};
const Boolean$1 = {
  toRemoteObject: value => ({
    type: 'boolean',
    value: value.booleanValue()
  }),
  toPropertyPreview: (name, value) => ({
    name,
    type: 'boolean',
    value: value.booleanValue().toString()
  }),
  toObjectPreview(value) {
    return {
      type: 'boolean',
      value: value.booleanValue(),
      description: value.booleanValue().toString(),
      overflow: false,
      properties: []
    };
  },
  toDescription: value => value.booleanValue().toString()
};
const Symbol = {
  toRemoteObject: (value, getObjectId) => ({
    type: 'symbol',
    description: SymbolDescriptiveString(value).stringValue(),
    objectId: getObjectId(value)
  }),
  toPropertyPreview: (name, value) => ({
    name,
    type: 'symbol',
    value: SymbolDescriptiveString(value).stringValue()
  }),
  toObjectPreview: value => ({
    type: 'symbol',
    description: SymbolDescriptiveString(value).stringValue(),
    overflow: false,
    properties: []
  }),
  toDescription: value => SymbolDescriptiveString(value).stringValue()
};
const String$1 = {
  toRemoteObject: value => ({
    type: 'string',
    value: value.stringValue()
  }),
  toPropertyPreview(name, value) {
    return {
      name,
      type: 'string',
      value: value.stringValue()
    };
  },
  toObjectPreview(value) {
    return {
      type: 'string',
      description: value.stringValue(),
      overflow: false,
      properties: []
    };
  },
  toDescription: value => value.stringValue()
};
const Number$1 = {
  toRemoteObject(value) {
    const v = R(value);
    let description = v.toString();
    const isNeg0 = Object.is(v, -0);
    // Includes values `-0`, `NaN`, `Infinity`, `-Infinity`, and bigint literals.
    if (isNeg0 || !globalThis.Number.isFinite(v)) {
      if (typeof v === 'bigint') {
        description += 'n';
        return {
          type: 'bigint',
          unserializableValue: description,
          description
        };
      }
      return {
        type: 'number',
        unserializableValue: description,
        description: isNeg0 ? '-0' : description
      };
    }
    return {
      type: 'number',
      value: v,
      description
    };
  },
  toPropertyPreview(name, value) {
    return {
      name,
      type: 'number',
      value: this.toDescription(value)
    };
  },
  toObjectPreview(value) {
    return {
      type: 'number',
      description: this.toDescription(value),
      overflow: false,
      properties: []
    };
  },
  toDescription: value => {
    const r = R(value);
    return value instanceof BigIntValue ? `${r}n` : r.toString();
  }
};
const Function = {
  toRemoteObject(value, getObjectId) {
    const result = {
      type: 'function',
      objectId: getObjectId(value)
    };
    result.description = IntrinsicsFunctionToString(value);
    if (isECMAScriptFunctionObject(value) && value.ECMAScriptCode) {
      if (value.ECMAScriptCode.type === 'FunctionBody') {
        result.className = 'Function';
      } else if (value.ECMAScriptCode.type === 'GeneratorBody') {
        result.className = 'GeneratorFunction';
      } else if (value.ECMAScriptCode.type === 'AsyncBody') {
        result.className = 'AsyncFunction';
      } else if (value.ECMAScriptCode.type === 'AsyncGeneratorBody') {
        result.className = 'AsyncGeneratorFunction';
      }
    } else {
      result.className = 'Function';
    }
    return result;
  },
  toPropertyPreview: name => ({
    name,
    type: 'function',
    value: ''
  }),
  toObjectPreview(value) {
    return {
      type: 'function',
      description: IntrinsicsFunctionToString(value),
      overflow: false,
      properties: []
    };
  },
  toDescription: () => 'Function'
};
class ObjectInspector {
  subtype;
  className;
  toDescription;
  toEntries;
  additionalProperties;
  constructor(className, subtype, toDescription, additionalOptions) {
    this.className = className;
    this.subtype = subtype;
    this.toDescription = toDescription;
    this.toEntries = additionalOptions?.entries;
    this.additionalProperties = additionalOptions?.additionalProperties;
  }
  toRemoteObject(value, getObjectId) {
    return {
      type: 'object',
      subtype: this.subtype,
      objectId: getObjectId(value),
      className: typeof this.className === 'string' ? this.className : this.className(value),
      description: this.toDescription(value),
      preview: this.toObjectPreview(value)
    };
  }
  toPropertyPreview(name, value) {
    return {
      name,
      type: 'object',
      subtype: this.subtype,
      value: this.toDescription(value)
    };
  }
  toObjectPreview(value) {
    const e = this.toEntries?.(value);
    return {
      type: 'object',
      subtype: this.subtype,
      description: this.toDescription(value),
      entries: e?.length ? e : undefined,
      ...propertiesToPropertyPreview(value, this.additionalProperties?.(value))
    };
  }
}
const Default = new ObjectInspector('Object', undefined, () => 'Object');
const ArrayBuffer = new ObjectInspector('ArrayBuffer', 'arraybuffer', value => `ArrayBuffer(${value.ArrayBufferByteLength})`);
const DataView = new ObjectInspector('DataView', 'dataview', value => `DataView(${value.ByteLength})`);
const Error = new ObjectInspector('SyntaxError', 'error', value => {
  let text = '';
  surroundingAgent.debugger_scopePreview(() => {
    evalQ(Q => {
      if (value instanceof ObjectValue) {
        const stack = Q(skipDebugger(Get(value, Value('stack'))));
        if (stack !== Value.undefined) {
          text += Q(skipDebugger(ToString(stack))).stringValue();
        }
      }
    });
  });
  return text;
});
const Map$1 = new ObjectInspector('Map', 'map', value => `Map(${value.MapData.filter(x => !!x.Key).length})`, {
  additionalProperties: value => [['size', Value(value.MapData.filter(x => !!x.Key).length)]],
  entries: value => value.MapData.filter(x => x.Key).map(({
    Key,
    Value
  }) => ({
    key: getInspector(Key).toObjectPreview(Key),
    value: getInspector(Value).toObjectPreview(Value)
  }))
});
const Set = new ObjectInspector('Set', 'set', value => `Set(${value.SetData.filter(globalThis.Boolean).length})`, {
  additionalProperties: value => [['size', Value(value.SetData.filter(globalThis.Boolean).length)]],
  entries: value => value.SetData.filter(globalThis.Boolean).map(Value => ({
    value: getInspector(Value).toObjectPreview(Value)
  }))
});
const WeakMap = new ObjectInspector('WeakMap', 'weakmap', () => 'WeakMap', {
  entries: value => value.WeakMapData.filter(x => x.Key).map(({
    Key,
    Value
  }) => ({
    key: getInspector(Key).toObjectPreview(Key),
    value: getInspector(Value).toObjectPreview(Value)
  }))
});
const WeakSet = new ObjectInspector('WeakSet', 'weakset', () => 'WeakSet', {
  entries: value => value.WeakSetData.filter(globalThis.Boolean).map(Value => ({
    value: getInspector(Value).toObjectPreview(Value)
  }))
});
const Date$1 = new ObjectInspector('Date', 'date', inspectDate);
const Promise$1 = new ObjectInspector('Promise', 'promise', () => 'Promise', {
  additionalProperties: value => [['[[PromiseState]]', Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || Value.undefined]]
});
const Proxy$1 = new ObjectInspector('Proxy', 'proxy', value => {
  if (IsCallable(value.ProxyTarget) === Value.true) {
    return 'Proxy(Function)';
  }
  if (value.ProxyTarget instanceof ObjectValue) {
    return 'Proxy(Object)';
  }
  return 'Proxy';
});
const RegExp = new ObjectInspector('RegExp', 'regexp', value => `/${value.OriginalSource.stringValue()}/${value.OriginalFlags.stringValue()}`);
const Array$1 = {
  toRemoteObject(value, getObjectId) {
    return {
      type: 'object',
      className: 'Array',
      subtype: 'array',
      objectId: getObjectId(value),
      description: getInspector(value).toDescription(value),
      preview: this.toObjectPreview?.(value)
    };
  },
  toPropertyPreview(name, value) {
    return {
      name,
      type: 'object',
      subtype: 'array',
      value: this.toDescription(value)
    };
  },
  toObjectPreview(value) {
    const result = {
      type: 'object',
      subtype: 'array',
      overflow: false,
      properties: [],
      description: this.toDescription(value)
    };
    const indexProp = [];
    const otherProp = [];
    for (const [key, desc] of value.properties) {
      if (indexProp.length > 100) {
        result.overflow = true;
        break;
      }
      if (isIntegerIndex(key)) {
        indexProp.push(propertyToPropertyPreview(key, desc));
      } else if (!(key instanceof JSStringValue && key.stringValue() === 'length')) {
        otherProp.push(propertyToPropertyPreview(key, desc));
      }
    }
    result.properties = indexProp.concat(otherProp).slice(0, 100);
    return result;
  },
  toDescription(value) {
    const length = [...value.properties.entries()].find(([key]) => key instanceof JSStringValue && key.stringValue() === 'length');
    if (!length || !(length[1].Value instanceof NumberValue)) {
      throw new TypeError('Bad ArrayExoticObject');
    }
    return `Array(${R(length[1].Value)})`;
  }
};
const TypedArray = {
  toRemoteObject(value, getObjectId) {
    return {
      type: 'object',
      subtype: 'typedarray',
      objectId: getObjectId(value),
      className: value.TypedArrayName.stringValue(),
      description: this.toDescription(value),
      preview: this.toObjectPreview(value)
    };
  },
  toObjectPreview(value) {
    return {
      type: 'object',
      subtype: 'typedarray',
      description: this.toDescription(value),
      properties: [],
      overflow: false
    };
  },
  toPropertyPreview(name, value) {
    return {
      name,
      type: 'object',
      subtype: 'typedarray',
      value: this.toDescription(value)
    };
  },
  toDescription(value) {
    const name = value.TypedArrayName;
    return `${name.stringValue()}(${value.ArrayLength})`;
  }
};
function propertyToPropertyPreview(key, desc) {
  let name;
  if (key instanceof JSStringValue) {
    name = key.stringValue();
  } else if (key instanceof PrivateName) {
    name = key.Description.stringValue();
  } else {
    name = SymbolDescriptiveString(key).stringValue();
  }
  if (desc.Get || desc.Set) {
    return {
      name,
      type: 'accessor'
    };
  } else {
    return getInspector(desc.Value).toPropertyPreview(name, desc.Value);
  }
}
function propertiesToPropertyPreview(value, extra, max = 5) {
  let overflow = false;
  const properties = [];
  if (extra) {
    for (const [key, value] of extra) {
      properties.push(getInspector(value).toPropertyPreview(key, value));
    }
  }
  for (const [key, desc] of value.properties) {
    if (properties.length > max) {
      overflow = true;
      break;
    }
    properties.push(propertyToPropertyPreview(key, desc));
  }
  for (const desc of value.PrivateElements) {
    if (properties.length > max) {
      overflow = true;
      break;
    }
    properties.push(propertyToPropertyPreview(desc.Key, desc));
  }
  return {
    overflow,
    properties
  };
}
function getInspector(value) {
  switch (true) {
    case value === Value.null:
      return Null;
    case value === Value.undefined:
      return Undefined;
    case value === Value.true || value === Value.false:
      return Boolean$1;
    case value instanceof SymbolValue:
      return Symbol;
    case value instanceof JSStringValue:
      return String$1;
    case value instanceof NumberValue:
    case value instanceof BigIntValue:
      return Number$1;
    case IsCallable(value) === Value.true:
      return Function;
    case isArrayExoticObject(value):
      return Array$1;
    case isRegExpObject(value):
      return RegExp;
    case isDateObject(value):
      return Date$1;
    case isMapObject(value):
      return Map$1;
    case isSetObject(value):
      return Set;
    case isWeakMapObject(value):
      return WeakMap;
    case isWeakSetObject(value):
      return WeakSet;
    // generator
    case isErrorObject(value):
      return Error;
    case isProxyExoticObject(value):
      return Proxy$1;
    case isPromiseObject(value):
      return Promise$1;
    case isTypedArrayObject(value):
      return TypedArray;
    case isArrayBufferObject(value):
      return ArrayBuffer;
    case isDataViewObject(value):
      return DataView;
    default:
      return Default;
  }
}

class InspectorContext {
  realm;
  #idToObject = new Map();
  #objectToId = new Map();
  #objectCounter = 0;
  constructor(realm) {
    this.realm = realm;
  }
  #internObject(object, group = 'default') {
    if (this.#objectToId.has(object)) {
      return this.#objectToId.get(object);
    }
    const id = `${group}:${this.#objectCounter}`;
    this.#objectCounter += 1;
    this.#idToObject.set(id, object);
    this.#objectToId.set(object, id);
    return id;
  }
  releaseObject(id) {
    const object = this.#idToObject.get(id);
    if (object) {
      this.#idToObject.delete(id);
      this.#objectToId.delete(object);
    }
  }
  releaseObjectGroup(group) {
    for (const [id, object] of this.#idToObject.entries()) {
      if (id.startsWith(group)) {
        this.#idToObject.delete(id);
        this.#objectToId.delete(object);
      }
    }
  }
  getObject(objectId) {
    return this.#idToObject.get(objectId);
  }
  toRemoteObject(value, options) {
    return getInspector(value).toRemoteObject(value, val => this.#internObject(val, options.objectGroup));
  }
  getProperties(object) {
    const wrap = v => this.toRemoteObject(v, {});
    const properties = [];
    const internalProperties = [];
    const privateProperties = [];
    object.PrivateElements.forEach(value => {
      privateProperties.push({
        name: value.Key.Description.stringValue(),
        value: value.Value ? wrap(value.Value) : undefined,
        get: value.Get ? wrap(value.Get) : undefined,
        set: value.Set ? wrap(value.Set) : undefined
      });
    });
    const value = evalQ(Q => {
      let p = object;
      while (p instanceof ObjectValue) {
        for (const key of Q(skipDebugger(p.OwnPropertyKeys()))) {
          const desc = Q(skipDebugger(p.GetOwnProperty(key)));
          // if (options.accessorPropertiesOnly && !IsAccessorDescriptor(desc)) {
          //   continue;
          // }
          if (desc instanceof UndefinedValue) {
            return;
          }
          const descriptor = {
            name: key instanceof JSStringValue ? key.stringValue() : SymbolDescriptiveString(key).stringValue(),
            value: desc.Value && !('HostUninitializedBindingMarkerObject' in desc.Value) ? wrap(desc.Value) : undefined,
            writable: desc.Writable === Value.true,
            get: desc.Get ? wrap(desc.Get) : undefined,
            set: desc.Set ? wrap(desc.Set) : undefined,
            configurable: desc.Configurable === Value.true,
            enumerable: desc.Enumerable === Value.true,
            wasThrown: false,
            isOwn: p === object,
            symbol: key instanceof SymbolValue ? wrap(key) : undefined
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
        exceptionDetails: this.createExceptionDetails(value)
      };
    }
    if (IsPromise(object) === Value.true) {
      internalProperties.push({
        name: '[[PromiseState]]',
        value: {
          type: 'string',
          value: object.PromiseState
        }
      });
      internalProperties.push({
        name: '[[PromiseResult]]',
        value: wrap(object.PromiseResult)
      });
    }
    if ('Prototype' in object) {
      internalProperties.push({
        name: '[[Prototype]]',
        value: wrap(object.Prototype)
      });
    }
    return {
      result: properties,
      internalProperties,
      privateProperties
    };
  }
  createExceptionDetails(completion) {
    const value = completion instanceof ThrowCompletion ? completion.Value : completion;
    const stack = getHostDefinedErrorStack(value);
    const frames = stack?.map(call => call.toCallFrame()).filter(Boolean) || [];
    return {
      text: 'Uncaught',
      stackTrace: stack ? {
        callFrames: frames
      } : undefined,
      exception: getInspector(value).toRemoteObject(value, val => this.#internObject(val)),
      lineNumber: frames[0]?.lineNumber || 0,
      columnNumber: frames[0]?.columnNumber || 0,
      exceptionId: 0,
      scriptId: frames[0]?.scriptId,
      url: frames[0]?.url
    };
  }
  createEvaluationResult(completion) {
    completion = EnsureCompletion(completion);
    if (!(completion.Value instanceof Value)) {
      throw new RangeError('Invalid completion value');
    }
    return {
      exceptionDetails: completion instanceof ThrowCompletion ? this.createExceptionDetails(completion) : undefined,
      result: this.toRemoteObject(completion.Value, {})
    };
  }
  getDebuggerCallFrame() {
    const stacks = getCurrentStack(false);
    return stacks.map((stack, index) => {
      if (!stack.getScriptId()) {
        return undefined;
      }
      const scopeChain = [];
      let env = stack.context.LexicalEnvironment;
      while (env instanceof EnvironmentRecord) {
        const result = getDisplayObjectFromEnvironmentRecord(env);
        if (result) {
          scopeChain.push({
            type: result.type,
            object: this.toRemoteObject(result.object, {})
          });
        }
        env = env.OuterEnv;
      }
      return {
        callFrameId: String(index),
        functionName: stack.getFunctionName() || '<anonymous>',
        location: {
          scriptId: stack.getScriptId(),
          lineNumber: (stack.lineNumber || 1) - 1,
          columnNumber: (stack.columnNumber || 1) - 1
        },
        this: this.toRemoteObject(HostGetThisEnvironment(stack.context.LexicalEnvironment), {}),
        url: stack.getSpecifier() || '',
        canBeRestarted: false,
        functionLocation: isECMAScriptFunctionObject(stack.context.Function) ? {
          lineNumber: (stack.context.Function.ECMAScriptCode?.location.start.line || 1) - 1,
          columnNumber: (stack.context.Function.ECMAScriptCode?.location.start.column || 1) - 1,
          scriptId: stack.getScriptId() || ''
        } : undefined,
        scopeChain
      };
    }).filter(Boolean);
  }
}
function HostGetThisEnvironment(env) {
  while (!(env instanceof NullValue)) {
    const exists = env.HasThisBinding();
    if (exists === Value.true) {
      const value = env.GetThisBinding();
      if (value instanceof ThrowCompletion) {
        return Value.undefined;
      }
      return value;
    }
    const outer = env.OuterEnv;
    env = outer;
  }
  throw new ReferenceError('No this environment found');
}
function getDisplayObjectFromEnvironmentRecord(record) {
  if (record instanceof DeclarativeEnvironmentRecord) {
    const object = OrdinaryObjectCreate(Value.null, ['HostInspectorScopePreview']);
    for (const [key, binding] of record.bindings) {
      const value = binding.initialized ? binding.value : OrdinaryObjectCreate(Value.null, ['HostUninitializedBindingMarkerObject']);
      if (isArgumentExoticObject(value)) {
        continue;
      }
      object.properties.set(key, Descriptor({
        Enumerable: isArgumentExoticObject(value) ? Value.false : Value.true,
        Value: value,
        Writable: binding.mutable ? Value.true : Value.false
      }));
    }
    let type = 'block';
    if (record instanceof FunctionEnvironmentRecord) {
      type = 'local';
    } else if (record instanceof ModuleEnvironmentRecord) {
      type = 'module';
    }
    if (type !== 'local' && !object.properties.size) {
      return undefined;
    }
    return {
      type,
      object
    };
  } else if (record instanceof ObjectEnvironmentRecord) {
    return {
      type: record.IsWithEnvironment === Value.true ? 'with' : 'global',
      object: record.BindingObject
    };
  } else if (record instanceof GlobalEnvironmentRecord) {
    return {
      type: 'global',
      object: record.GlobalThisValue
    };
  }
  throw new TypeError('Unknown environment record');
}

function getParsedEvent(script, id, executionContextId) {
  const lines = script.ECMAScriptCode.sourceText().split('\n');
  return {
    scriptId: `${id}`,
    url: script.HostDefined.specifier || `vm:///${id}`,
    startLine: 0,
    startColumn: 0,
    endLine: lines.length,
    endColumn: lines.pop().length,
    executionContextId,
    hash: '',
    buildId: ''
  };
}
const ParsedScripts = [];

const Debugger = {
  enable(_req, {
    onDebuggerAttached
  }) {
    onDebuggerAttached();
    return {
      debuggerId: 'debugger.0'
    };
  },
  getScriptSource({
    scriptId
  }) {
    const id = parseInt(scriptId, 10);
    if (Number.isNaN(id)) {
      return {
        scriptSource: '// Invalid script id'
      };
    }
    const record = ParsedScripts[id];
    if (!record) {
      return {
        scriptSource: '// Not found'
      };
    }
    return {
      scriptSource: record.ECMAScriptCode.sourceText()
    };
  },
  setAsyncCallStackDepth() {},
  setBlackboxPatterns() {},
  setPauseOnExceptions() {},
  setBlackboxExecutionContexts() {},
  setBreakpointByUrl() {
    return {
      breakpointId: '0',
      locations: []
    };
  },
  stepInto(_, {
    sendEvent
  }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate({
      pauseAt: 'step-in'
    });
  },
  resume(_, {
    sendEvent
  }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate();
  },
  stepOver(_req, {
    sendEvent
  }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate({
      pauseAt: 'step-over'
    });
  },
  stepOut(_req, {
    sendEvent
  }) {
    sendEvent['Debugger.resumed']();
    surroundingAgent.resumeEvaluate({
      pauseAt: 'step-out'
    });
  },
  evaluateOnCallFrame(req, context) {
    return evaluate(req, context);
  }
};
const Profiler = {
  enable() {}
};
const Runtime = {
  discardConsoleEntries() {},
  enable() {},
  compileScript(options, {
    getContext,
    sendEvent
  }) {
    const context = getContext(options.executionContextId);
    const scriptId = ParsedScripts.length;
    let rec;
    context.realm.scope(() => {
      rec = ParseScript(options.expression, context.realm, {
        specifier: options.sourceURL,
        scriptId: options.persistScript ? String(scriptId) : undefined
      });
    });
    if (Array.isArray(rec)) {
      const e = context.createExceptionDetails(ThrowCompletion(rec[0]));
      // Note: it has to be this message to trigger devtools' line wrap.
      e.exception.description = 'SyntaxError: Unexpected end of input';
      return {
        exceptionDetails: e
      };
    }
    if (options.persistScript) {
      ParsedScripts.push(rec);
      const event = getParsedEvent(rec, scriptId, options.executionContextId || 0);
      sendEvent['Debugger.scriptParsed'](event);
      return {
        scriptId: event.scriptId
      };
    }
    return {};
  },
  callFunctionOn(options, {
    getContext
  }) {
    const context = getContext(options.executionContextId);
    const {
      Value: F
    } = context.realm.evaluateScript(`(${options.functionDeclaration})`);
    const thisValue = options.objectId ? context.getObject(options.objectId) : Value.undefined;
    const args = options.arguments?.map(a => {
      if ('value' in a) {
        return Value(a.value);
      }
      if (a.objectId) {
        return context.getObject(a.objectId);
      }
      if ('unserializableValue' in a) {
        throw new RangeError();
      }
      return Value.undefined;
    });
    const r = skipDebugger(Call(F, thisValue, args || []));
    return context.createEvaluationResult(r);
  },
  evaluate(options, _context) {
    return evaluate(options, _context);
  },
  getExceptionDetails(req, {
    getContext
  }) {
    const context = getContext();
    const object = context.getObject(req.errorObjectId);
    if (object instanceof ObjectValue) {
      return {
        // @ts-expect-error
        exceptionDetails: context.createExceptionDetails(ThrowCompletion(object), {})
      };
    }
    return {
      exceptionDetails: {
        text: 'unsupported',
        lineNumber: 0,
        columnNumber: 0,
        exceptionId: 0
      }
    };
  },
  getHeapUsage() {
    return {
      usedSize: 0,
      totalSize: 0,
      backingStorageSize: 0,
      embedderHeapUsedSize: 0
    };
  },
  getIsolateId() {
    return {
      id: 'isolate.0'
    };
  },
  getProperties(options, {
    getContext
  }) {
    const context = getContext();
    const object = context.getObject(options.objectId);
    // @ts-expect-error
    return context.getProperties(object, options);
  },
  globalLexicalScopeNames({
    executionContextId
  }, {
    getContext
  }) {
    const context = getContext(executionContextId);
    const envRec = context.realm.GlobalEnv;
    const names = Array.from(envRec.DeclarativeRecord.bindings.keys(), v => v.stringValue());
    return {
      names
    };
  },
  releaseObject(req, {
    getContext
  }) {
    getContext().releaseObject(req.objectId);
  },
  releaseObjectGroup({
    objectGroup
  }, {
    getContext
  }) {
    getContext().releaseObjectGroup(objectGroup);
  },
  runIfWaitingForDebugger() {}
};
const HeapProfiler = {
  enable() {},
  collectGarbage() {}
};
const unsupportedError = {
  result: {
    type: 'undefined'
  },
  exceptionDetails: {
    text: 'unsupported',
    lineNumber: 0,
    columnNumber: 0,
    exceptionId: 0
  }
};
function evaluate(options, _context) {
  const {
    getContext,
    preference
  } = _context;
  const isPreview = options.throwOnSideEffect;
  if (options.awaitPromise || !preference.preview && isPreview) {
    return unsupportedError;
  }
  const context = getContext(options.contextId);
  if (options.callFrameId) {
    const frame = surroundingAgent.executionContextStack[options.callFrameId];
    if (!frame) {
      // eslint-disable-next-line no-console
      console.error('Execution context not found: ', options.callFrameId);
      return unsupportedError;
    }
    // const old = surroundingAgent.executionContextStack;
  }
  // TODO: introduce devtool scoping
  if (isPreview) {
    const completion = context.realm.evaluateScript(options.expression, {
      inspectorPreview: true
    });
    return context.createEvaluationResult(completion);
  } else {
    const compileResult = Runtime.compileScript({
      expression: options.expression,
      executionContextId: options.contextId,
      persistScript: true,
      sourceURL: ''
    }, _context);
    if (compileResult.exceptionDetails) {
      return {
        exceptionDetails: compileResult.exceptionDetails,
        result: {
          type: 'undefined'
        }
      };
    }
    const parsedScript = ParsedScripts[compileResult.scriptId];
    return new Promise(resolve => {
      context.realm.evaluate(parsedScript, completion => {
        resolve(context.createEvaluationResult(completion));
        runJobQueue();
      });
      surroundingAgent.resumeEvaluate();
    });
  }
}

var impl = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Debugger: Debugger,
  HeapProfiler: HeapProfiler,
  Profiler: Profiler,
  Runtime: Runtime
});

const consoleMethods = ['log', 'debug', 'info', 'error', 'warning', 'dir', 'dirxml', 'table', 'trace', 'clear', 'startGroup', 'startGroupCollapsed', 'endGroup', 'assert', 'profile', 'profileEnd', 'count', 'timeEnd'];
function createConsole(realm, defaultBehaviour) {
  realm.scope(() => {
    const console = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
    skipDebugger(DefinePropertyOrThrow(realm.GlobalObject, Value('console'), Descriptor({
      Configurable: Value.true,
      Enumerable: Value.false,
      Writable: Value.true,
      Value: console
    })));
    consoleMethods.forEach(method => {
      const f = CreateBuiltinFunction(args => {
        if (surroundingAgent.debugger_isPreviewing) {
          return Value.undefined;
        }
        if (defaultBehaviour[method]) {
          const completion = defaultBehaviour[method](args);
          if (completion instanceof ThrowCompletion) {
            return completion;
          }
        }
        if (realm.HostDefined.attachingInspector instanceof Inspector) {
          realm.HostDefined.attachingInspector.console(realm, method, args);
        }
        return Value.undefined;
      }, 1, Value(method), []);
      skipDebugger(CreateDataProperty(console, Value(method), f));
    });
  });
}
function createInternals(realm) {
  realm.scope(() => {
    const $ = OrdinaryObjectCreate.from({
      debugger: () => {
        if (surroundingAgent.debugger_isPreviewing) {
          return;
        }
        // eslint-disable-next-line no-debugger
        debugger;
      },
      *detachArrayBuffer(object) {
        if (!isArrayBufferObject(object)) {
          return surroundingAgent.Throw('TypeError', 'Raw', 'Argument must be an ArrayBuffer');
        }
        const completion = DetachArrayBuffer(object);
        if (completion instanceof ThrowCompletion) {
          return completion;
        }
        return Value.undefined;
      },
      gc,
      *spec(v) {
        if (isBuiltinFunctionObject(v) && v.nativeFunction.section) {
          return Value(v.nativeFunction.section);
        }
        return Value.undefined;
      }
    });
    CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('$'), $);
    CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('$262'), $);
  });
}

const ignoreNamespaces = ['Network'];
const ignoreMethods = [];
class Inspector {
  preference = {
    preview: false,
    previewDebug: false
  };
  #contexts = [];
  attachRealm(realm, name = 'engine262') {
    const id = this.#contexts.length;
    const desc = {
      id,
      origin: 'vm://realm',
      name,
      uniqueId: ''
    };
    this.#contexts.push([new InspectorContext(realm), desc]);
    realm.HostDefined.attachingInspector = this;
    const oldOnDebugger = surroundingAgent.hostDefinedOptions.onDebugger;
    surroundingAgent.hostDefinedOptions.onDebugger = () => {
      this.sendEvent['Debugger.paused']({
        reason: 'debugCommand',
        callFrames: this.#context.getContext().getDebuggerCallFrame()
      });
      oldOnDebugger?.();
    };
    this.#context.sendEvent['Runtime.executionContextCreated']({
      context: desc
    });
  }
  #onDebuggerAttached() {
    for (const [, context] of this.#contexts) {
      this.sendEvent['Runtime.executionContextCreated']({
        context
      });
    }
  }
  onMessage(id, methodArg, params) {
    if (ignoreMethods.includes(methodArg)) {
      return;
    }
    const [namespace, method] = methodArg.split('.');
    if (ignoreNamespaces.includes(namespace)) {
      return;
    }
    if (!(namespace in impl)) {
      // eslint-disable-next-line no-console
      console.error(`Unknown namespace requested: ${namespace}`);
      return;
    }
    const ns = impl[namespace];
    if (!(method in ns)) {
      // eslint-disable-next-line no-console
      console.error(`Unknown method requested: ${namespace}.${method}`);
      return;
    }
    const f = ns[method];
    new Promise(resolve => {
      resolve(f(params, this.#context));
    }).then((result = {}) => {
      this.send({
        id,
        result
      });
    });
  }
  sendEvent = Object.create(new Proxy({}, {
    get: (_, key) => {
      const f = params => {
        this.send({
          method: key,
          params
        });
      };
      Object.defineProperty(this.sendEvent, key, {
        value: f
      });
      return f;
    }
  }));
  console(realm, type, args) {
    const context = this.#contexts.findIndex(c => c[0].realm === realm);
    this.sendEvent['Runtime.consoleAPICalled']({
      type,
      args: args.map(x => this.#contexts[context][0].toRemoteObject(x, {})),
      executionContextId: context,
      timestamp: Date.now()
    });
  }
  #context = {
    sendEvent: this.sendEvent,
    preference: this.preference,
    getContext: (id = 0) => this.#contexts.at(id)[0],
    onDebuggerAttached: this.#onDebuggerAttached.bind(this)
  };
}

export { Inspector, createConsole, createInternals };
//# sourceMappingURL=inspector.mjs.map
