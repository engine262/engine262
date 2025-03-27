/*!
 * engine262 0.0.1 247e26f3cb908b03836f8f83f8cd5515ce6ca2f0
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

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('./engine262.mjs')) :
  typeof define === 'function' && define.amd ? define(['exports', './engine262.mjs'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global["@engine262/engine262/inspector"] = {}, global["@engine262/engine262"]));
})(this, (function (exports, engine262_mjs) { 'use strict';

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
      description: engine262_mjs.SymbolDescriptiveString(value).stringValue(),
      objectId: getObjectId(value)
    }),
    toPropertyPreview: (name, value) => ({
      name,
      type: 'symbol',
      value: engine262_mjs.SymbolDescriptiveString(value).stringValue()
    }),
    toObjectPreview: value => ({
      type: 'symbol',
      description: engine262_mjs.SymbolDescriptiveString(value).stringValue(),
      overflow: false,
      properties: []
    }),
    toDescription: value => engine262_mjs.SymbolDescriptiveString(value).stringValue()
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
      const v = engine262_mjs.R(value);
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
      const r = engine262_mjs.R(value);
      return value instanceof engine262_mjs.BigIntValue ? `${r}n` : r.toString();
    }
  };
  const Function = {
    toRemoteObject(value, getObjectId) {
      const result = {
        type: 'function',
        objectId: getObjectId(value)
      };
      result.description = engine262_mjs.IntrinsicsFunctionToString(value);
      if (engine262_mjs.isECMAScriptFunctionObject(value) && value.ECMAScriptCode) {
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
        description: engine262_mjs.IntrinsicsFunctionToString(value),
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
    engine262_mjs.surroundingAgent.debugger_scopePreview(() => {
      engine262_mjs.evalQ(Q => {
        if (value instanceof engine262_mjs.ObjectValue) {
          const stack = Q(engine262_mjs.skipDebugger(engine262_mjs.Get(value, engine262_mjs.Value('stack'))));
          if (stack !== engine262_mjs.Value.undefined) {
            text += Q(engine262_mjs.skipDebugger(engine262_mjs.ToString(stack))).stringValue();
          }
        }
      });
    });
    return text;
  });
  const Map$1 = new ObjectInspector('Map', 'map', value => `Map(${value.MapData.filter(x => !!x.Key).length})`, {
    additionalProperties: value => [['size', engine262_mjs.Value(value.MapData.filter(x => !!x.Key).length)]],
    entries: value => value.MapData.filter(x => x.Key).map(({
      Key,
      Value
    }) => ({
      key: getInspector(Key).toObjectPreview(Key),
      value: getInspector(Value).toObjectPreview(Value)
    }))
  });
  const Set = new ObjectInspector('Set', 'set', value => `Set(${value.SetData.filter(globalThis.Boolean).length})`, {
    additionalProperties: value => [['size', engine262_mjs.Value(value.SetData.filter(globalThis.Boolean).length)]],
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
  const Date$1 = new ObjectInspector('Date', 'date', engine262_mjs.inspectDate);
  const Promise$1 = new ObjectInspector('Promise', 'promise', () => 'Promise', {
    additionalProperties: value => [['[[PromiseState]]', engine262_mjs.Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || engine262_mjs.Value.undefined]]
  });
  const Proxy$1 = new ObjectInspector('Proxy', 'proxy', value => {
    if (engine262_mjs.IsCallable(value.ProxyTarget) === engine262_mjs.Value.true) {
      return 'Proxy(Function)';
    }
    if (value.ProxyTarget instanceof engine262_mjs.ObjectValue) {
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
        if (engine262_mjs.isIntegerIndex(key)) {
          indexProp.push(propertyToPropertyPreview(key, desc));
        } else if (!(key instanceof engine262_mjs.JSStringValue && key.stringValue() === 'length')) {
          otherProp.push(propertyToPropertyPreview(key, desc));
        }
      }
      result.properties = indexProp.concat(otherProp).slice(0, 100);
      return result;
    },
    toDescription(value) {
      const length = [...value.properties.entries()].find(([key]) => key instanceof engine262_mjs.JSStringValue && key.stringValue() === 'length');
      if (!length || !(length[1].Value instanceof engine262_mjs.NumberValue)) {
        throw new TypeError('Bad ArrayExoticObject');
      }
      return `Array(${engine262_mjs.R(length[1].Value)})`;
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
    if (key instanceof engine262_mjs.JSStringValue) {
      name = key.stringValue();
    } else if (key instanceof engine262_mjs.PrivateName) {
      name = key.Description.stringValue();
    } else {
      name = engine262_mjs.SymbolDescriptiveString(key).stringValue();
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
      case value === engine262_mjs.Value.null:
        return Null;
      case value === engine262_mjs.Value.undefined:
        return Undefined;
      case value === engine262_mjs.Value.true || value === engine262_mjs.Value.false:
        return Boolean$1;
      case value instanceof engine262_mjs.SymbolValue:
        return Symbol;
      case value instanceof engine262_mjs.JSStringValue:
        return String$1;
      case value instanceof engine262_mjs.NumberValue:
      case value instanceof engine262_mjs.BigIntValue:
        return Number$1;
      case engine262_mjs.IsCallable(value) === engine262_mjs.Value.true:
        return Function;
      case engine262_mjs.isArrayExoticObject(value):
        return Array$1;
      case engine262_mjs.isRegExpObject(value):
        return RegExp;
      case engine262_mjs.isDateObject(value):
        return Date$1;
      case engine262_mjs.isMapObject(value):
        return Map$1;
      case engine262_mjs.isSetObject(value):
        return Set;
      case engine262_mjs.isWeakMapObject(value):
        return WeakMap;
      case engine262_mjs.isWeakSetObject(value):
        return WeakSet;
      // generator
      case engine262_mjs.isErrorObject(value):
        return Error;
      case engine262_mjs.isProxyExoticObject(value):
        return Proxy$1;
      case engine262_mjs.isPromiseObject(value):
        return Promise$1;
      case engine262_mjs.isTypedArrayObject(value):
        return TypedArray;
      case engine262_mjs.isArrayBufferObject(value):
        return ArrayBuffer;
      case engine262_mjs.isDataViewObject(value):
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
      const value = engine262_mjs.evalQ(Q => {
        let p = object;
        while (p instanceof engine262_mjs.ObjectValue) {
          for (const key of Q(engine262_mjs.skipDebugger(p.OwnPropertyKeys()))) {
            const desc = Q(engine262_mjs.skipDebugger(p.GetOwnProperty(key)));
            // if (options.accessorPropertiesOnly && !IsAccessorDescriptor(desc)) {
            //   continue;
            // }
            if (desc instanceof engine262_mjs.UndefinedValue) {
              return;
            }
            const descriptor = {
              name: key instanceof engine262_mjs.JSStringValue ? key.stringValue() : engine262_mjs.SymbolDescriptiveString(key).stringValue(),
              value: desc.Value && !('HostUninitializedBindingMarkerObject' in desc.Value) ? wrap(desc.Value) : undefined,
              writable: desc.Writable === engine262_mjs.Value.true,
              get: desc.Get ? wrap(desc.Get) : undefined,
              set: desc.Set ? wrap(desc.Set) : undefined,
              configurable: desc.Configurable === engine262_mjs.Value.true,
              enumerable: desc.Enumerable === engine262_mjs.Value.true,
              wasThrown: false,
              isOwn: p === object,
              symbol: key instanceof engine262_mjs.SymbolValue ? wrap(key) : undefined
            };
            properties.push(descriptor);
          }

          // if (options.ownProperties) {
          //   break;
          // }
          p = Q(engine262_mjs.skipDebugger(p.GetPrototypeOf()));
        }
      });
      if (value.Type === 'throw') {
        return {
          result: [],
          exceptionDetails: this.createExceptionDetails(value)
        };
      }
      if (engine262_mjs.IsPromise(object) === engine262_mjs.Value.true) {
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
      const value = completion instanceof engine262_mjs.ThrowCompletion ? completion.Value : completion;
      const stack = engine262_mjs.getHostDefinedErrorStack(value);
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
      completion = engine262_mjs.EnsureCompletion(completion);
      if (!(completion.Value instanceof engine262_mjs.Value)) {
        throw new RangeError('Invalid completion value');
      }
      return {
        exceptionDetails: completion instanceof engine262_mjs.ThrowCompletion ? this.createExceptionDetails(completion) : undefined,
        result: this.toRemoteObject(completion.Value, {})
      };
    }
    getDebuggerCallFrame() {
      const stacks = engine262_mjs.getCurrentStack(false);
      return stacks.map((stack, index) => {
        if (!stack.getScriptId()) {
          return undefined;
        }
        const scopeChain = [];
        let env = stack.context.LexicalEnvironment;
        while (env instanceof engine262_mjs.EnvironmentRecord) {
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
          functionLocation: engine262_mjs.isECMAScriptFunctionObject(stack.context.Function) ? {
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
    while (!(env instanceof engine262_mjs.NullValue)) {
      const exists = env.HasThisBinding();
      if (exists === engine262_mjs.Value.true) {
        const value = env.GetThisBinding();
        if (value instanceof engine262_mjs.ThrowCompletion) {
          return engine262_mjs.Value.undefined;
        }
        return value;
      }
      const outer = env.OuterEnv;
      env = outer;
    }
    throw new ReferenceError('No this environment found');
  }
  function getDisplayObjectFromEnvironmentRecord(record) {
    if (record instanceof engine262_mjs.DeclarativeEnvironmentRecord) {
      const object = engine262_mjs.OrdinaryObjectCreate(engine262_mjs.Value.null, ['HostInspectorScopePreview']);
      for (const [key, binding] of record.bindings) {
        const value = binding.initialized ? binding.value : engine262_mjs.OrdinaryObjectCreate(engine262_mjs.Value.null, ['HostUninitializedBindingMarkerObject']);
        if (engine262_mjs.isArgumentExoticObject(value)) {
          continue;
        }
        object.properties.set(key, engine262_mjs.Descriptor({
          Enumerable: engine262_mjs.isArgumentExoticObject(value) ? engine262_mjs.Value.false : engine262_mjs.Value.true,
          Value: value,
          Writable: binding.mutable ? engine262_mjs.Value.true : engine262_mjs.Value.false
        }));
      }
      let type = 'block';
      if (record instanceof engine262_mjs.FunctionEnvironmentRecord) {
        type = 'local';
      } else if (record instanceof engine262_mjs.ModuleEnvironmentRecord) {
        type = 'module';
      }
      if (type !== 'local' && !object.properties.size) {
        return undefined;
      }
      return {
        type,
        object
      };
    } else if (record instanceof engine262_mjs.ObjectEnvironmentRecord) {
      return {
        type: record.IsWithEnvironment === engine262_mjs.Value.true ? 'with' : 'global',
        object: record.BindingObject
      };
    } else if (record instanceof engine262_mjs.GlobalEnvironmentRecord) {
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
      engine262_mjs.surroundingAgent.resumeEvaluate({
        pauseAt: 'step-in'
      });
    },
    resume(_, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate();
    },
    stepOver(_req, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate({
        pauseAt: 'step-over'
      });
    },
    stepOut(_req, {
      sendEvent
    }) {
      sendEvent['Debugger.resumed']();
      engine262_mjs.surroundingAgent.resumeEvaluate({
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
        rec = engine262_mjs.ParseScript(options.expression, context.realm, {
          specifier: options.sourceURL,
          scriptId: options.persistScript ? String(scriptId) : undefined
        });
      });
      if (Array.isArray(rec)) {
        const e = context.createExceptionDetails(engine262_mjs.ThrowCompletion(rec[0]));
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
      const thisValue = options.objectId ? context.getObject(options.objectId) : engine262_mjs.Value.undefined;
      const args = options.arguments?.map(a => {
        if ('value' in a) {
          return engine262_mjs.Value(a.value);
        }
        if (a.objectId) {
          return context.getObject(a.objectId);
        }
        if ('unserializableValue' in a) {
          throw new RangeError();
        }
        return engine262_mjs.Value.undefined;
      });
      const r = engine262_mjs.skipDebugger(engine262_mjs.Call(F, thisValue, args || []));
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
      if (object instanceof engine262_mjs.ObjectValue) {
        return {
          // @ts-expect-error
          exceptionDetails: context.createExceptionDetails(engine262_mjs.ThrowCompletion(object), {})
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
      const frame = engine262_mjs.surroundingAgent.executionContextStack[options.callFrameId];
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
          engine262_mjs.runJobQueue();
        });
        engine262_mjs.surroundingAgent.resumeEvaluate();
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
      const console = engine262_mjs.OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
      engine262_mjs.skipDebugger(engine262_mjs.DefinePropertyOrThrow(realm.GlobalObject, engine262_mjs.Value('console'), engine262_mjs.Descriptor({
        Configurable: engine262_mjs.Value.true,
        Enumerable: engine262_mjs.Value.false,
        Writable: engine262_mjs.Value.true,
        Value: console
      })));
      consoleMethods.forEach(method => {
        const f = engine262_mjs.CreateBuiltinFunction(args => {
          if (engine262_mjs.surroundingAgent.debugger_isPreviewing) {
            return engine262_mjs.Value.undefined;
          }
          if (defaultBehaviour[method]) {
            const completion = defaultBehaviour[method](args);
            if (completion instanceof engine262_mjs.ThrowCompletion) {
              return completion;
            }
          }
          if (realm.HostDefined.attachingInspector instanceof Inspector) {
            realm.HostDefined.attachingInspector.console(realm, method, args);
          }
          return engine262_mjs.Value.undefined;
        }, 1, engine262_mjs.Value(method), []);
        engine262_mjs.skipDebugger(engine262_mjs.CreateDataProperty(console, engine262_mjs.Value(method), f));
      });
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
      const oldOnDebugger = engine262_mjs.surroundingAgent.hostDefinedOptions.onDebugger;
      engine262_mjs.surroundingAgent.hostDefinedOptions.onDebugger = () => {
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

  exports.Inspector = Inspector;
  exports.createConsole = createConsole;

}));
//# sourceMappingURL=inspector.js.map
