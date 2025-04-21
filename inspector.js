/*!
 * engine262 0.0.1 787089acf5d96b9dcc291845965a02a86102ca08
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
  const Number = {
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
  const ArrayBuffer = new ObjectInspector('ArrayBuffer', 'arraybuffer', value => `ArrayBuffer(${value.ArrayBufferByteLength})`, {});
  const DataView = new ObjectInspector('DataView', 'dataview', value => `DataView(${value.ByteLength})`);
  const Error$1 = new ObjectInspector('SyntaxError', 'error', value => {
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
  const WeakMap$1 = new ObjectInspector('WeakMap', 'weakmap', () => 'WeakMap', {
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
  const Date$1 = new ObjectInspector('Date', 'date', value => {
    if (!globalThis.Number.isFinite(engine262_mjs.R(value.DateValue))) {
      return 'Invalid Date';
    }
    const val = engine262_mjs.DateProto_toISOString([], {
      thisValue: value,
      NewTarget: engine262_mjs.Value.undefined
    });
    return engine262_mjs.ValueOfNormalCompletion(val).stringValue();
  });
  const Promise$1 = new ObjectInspector('Promise', 'promise', () => 'Promise', {
    additionalProperties: value => [['[[PromiseState]]', engine262_mjs.Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || engine262_mjs.Value.undefined]]
  });
  const Proxy$1 = new ObjectInspector('Proxy', 'proxy', value => {
    if (engine262_mjs.IsCallable(value.ProxyTarget)) {
      return 'Proxy(Function)';
    }
    if (value.ProxyTarget instanceof engine262_mjs.ObjectValue) {
      return 'Proxy(Object)';
    }
    return 'Proxy';
  });
  const RegExp = new ObjectInspector('RegExp', 'regexp', value => `/${value.OriginalSource.stringValue()}/${value.OriginalFlags.stringValue()}`);
  const Module = new ObjectInspector('Module', undefined, () => 'Module', {});
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
  const TypedArray = new ObjectInspector('TypedArray', 'typedarray', value => `${value.TypedArrayName.stringValue()}(${value.ArrayLength})`);
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
    if (engine262_mjs.isTypedArrayObject(value) && value.ViewedArrayBuffer instanceof engine262_mjs.ObjectValue && value.ViewedArrayBuffer.ArrayBufferData instanceof engine262_mjs.DataBlock) {
      const record = engine262_mjs.MakeTypedArrayWithBufferWitnessRecord(value, 'seq-cst');
      const length = engine262_mjs.TypedArrayLength(record);
      for (let index = 0; index < length; index += 1) {
        const index_value = engine262_mjs.TypedArrayGetElement(value, engine262_mjs.Value(index));
        if (index_value instanceof engine262_mjs.UndefinedValue) {
          break;
        }
        if (properties.length > 100) {
          overflow = true;
          break;
        }
        properties.push(getInspector(index_value).toPropertyPreview(index.toString(), index_value));
      }
      properties.push({
        name: 'buffer',
        type: 'object',
        subtype: 'arraybuffer',
        value: `ArrayBuffer(${value.ViewedArrayBuffer.ArrayBufferData.byteLength})`
      }, {
        name: 'byteLength',
        type: 'number',
        value: globalThis.String(value.ArrayLength)
      }, {
        name: 'byteOffset',
        type: 'number',
        value: globalThis.String(value.ByteOffset)
      }, {
        name: 'length',
        type: 'number',
        value: globalThis.String(length)
      });
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
        return Number;
      case engine262_mjs.isProxyExoticObject(value):
        return Proxy$1;
      case engine262_mjs.IsCallable(value):
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
        return WeakMap$1;
      case engine262_mjs.isWeakSetObject(value):
        return WeakSet;
      // generator
      case engine262_mjs.isErrorObject(value):
        return Error$1;
      case engine262_mjs.isPromiseObject(value):
        return Promise$1;
      case engine262_mjs.isTypedArrayObject(value):
        return TypedArray;
      case engine262_mjs.isArrayBufferObject(value):
        return ArrayBuffer;
      case engine262_mjs.isDataViewObject(value):
        return DataView;
      case engine262_mjs.isModuleNamespaceObject(value):
        return Module;
      default:
        return Default;
    }
  }

  class InspectorContext {
    #io;
    constructor(io) {
      this.#io = io;
    }
    realms = [];
    attachRealm(realm, agent) {
      const id = this.realms.length;
      const descriptor = {
        id,
        origin: 'vm://realm',
        name: 'engine262',
        uniqueId: id.toString()
      };
      this.realms.push({
        realm,
        descriptor,
        agent,
        detach: () => {
          realm.HostDefined.attachingInspector = oldInspector;
        }
      });
      const oldInspector = realm.HostDefined.attachingInspector;
      realm.HostDefined.attachingInspector = this.#io;
      const oldPromiseRejectionTracker = realm.HostDefined.promiseRejectionTracker;
      realm.HostDefined.promiseRejectionTracker = (promise, operation) => {
        oldPromiseRejectionTracker?.(promise, operation);
        if (operation === 'reject') {
          this.#io.sendEvent['Runtime.exceptionThrown']({
            timestamp: Date.now(),
            exceptionDetails: this.createExceptionDetails(promise, true)
          });
        } else {
          const id = this.#exceptionMap.get(promise);
          if (id) {
            this.#io.sendEvent['Runtime.exceptionRevoked']({
              reason: 'Handler added to rejected promise',
              exceptionId: id
            });
          }
        }
      };
      this.#io.sendEvent['Runtime.executionContextCreated']({
        context: descriptor
      });
    }
    detachAgent(agent) {
      for (const realm of this.realms) {
        if (realm?.agent === agent) {
          this.detachRealm(realm.realm);
        }
      }
    }
    detachRealm(realm) {
      const index = this.realms.findIndex(c => c?.realm === realm);
      if (index === -1) {
        return;
      }
      const {
        descriptor
      } = this.realms[index];
      realm.HostDefined.attachingInspector = undefined;
      this.realms[index] = undefined;
      this.#io.sendEvent['Runtime.executionContextDestroyed']({
        executionContextId: descriptor.id,
        executionContextUniqueId: descriptor.uniqueId
      });
    }
    getRealm(realm) {
      if (realm === undefined) {
        if (engine262_mjs.surroundingAgent.runningExecutionContext && engine262_mjs.surroundingAgent.currentRealmRecord instanceof engine262_mjs.ManagedRealm) {
          realm = engine262_mjs.surroundingAgent.currentRealmRecord;
        } else {
          return undefined;
        }
      }
      if (typeof realm === 'string') {
        return this.realms.find(c => c?.descriptor.uniqueId === realm);
      } else if (typeof realm === 'number') {
        return this.realms[realm];
      }
      return this.realms.find(c => c?.realm === realm);
    }

    /** @deprecated in this case we are guessing the realm should be using, which may create bad result */
    getAnyRealm() {
      return this.realms.find(Boolean);
    }
    #idToObject = new Map();

    // id 0 is falsy, skip it
    #idToArrayBufferBlock = [undefined];
    #objectToId = new Map();
    #objectCounter = 1;
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
      return getInspector(value).toRemoteObject(value, val => this.#internObject(val, options.objectGroup), options.generatePreview);
    }
    getProperties({
      objectId,
      accessorPropertiesOnly,
      generatePreview,
      nonIndexedPropertiesOnly,
      ownProperties
    }) {
      const object = this.getObject(objectId);
      if (!(object instanceof engine262_mjs.ObjectValue)) {
        return {
          result: []
        };
      }
      const wrap = v => this.toRemoteObject(v, {
        generatePreview
      });
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
            if (nonIndexedPropertiesOnly && engine262_mjs.isIntegerIndex(key)) {
              continue;
            }
            const desc = Q(engine262_mjs.skipDebugger(p.GetOwnProperty(key)));
            if (accessorPropertiesOnly && !engine262_mjs.IsAccessorDescriptor(desc)) {
              continue;
            }
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
          if (ownProperties) {
            break;
          }
          p = Q(engine262_mjs.skipDebugger(p.GetPrototypeOf()));
        }
      });
      if (value.Type === 'throw') {
        return {
          result: [],
          exceptionDetails: this.createExceptionDetails(value, false)
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
      if (engine262_mjs.isBuiltinFunctionObject(object) && object.nativeFunction.section) {
        internalProperties.push({
          name: '[[Section]]',
          value: {
            type: 'string',
            value: object.nativeFunction.section
          }
        });
      }
      if (engine262_mjs.isArrayBufferObject(object) && object.ArrayBufferData instanceof engine262_mjs.DataBlock) {
        internalProperties.push({
          name: '[[ArrayBufferByteLength]]',
          value: {
            type: 'number',
            value: object.ArrayBufferByteLength
          }
        });
        this.#idToArrayBufferBlock.push(object.ArrayBufferData.buffer);
        internalProperties.push({
          name: '[[ArrayBufferData]]',
          value: {
            type: 'number',
            value: this.#idToArrayBufferBlock.length - 1
          }
        });
      }
      return {
        result: properties,
        internalProperties,
        privateProperties
      };
    }
    #exceptionMap = new WeakMap();
    createExceptionDetails(completion, isPromise) {
      const value = completion instanceof engine262_mjs.ThrowCompletion ? completion.Value : completion;
      const stack = engine262_mjs.getHostDefinedErrorStack(value);
      const frames = stack?.map(call => call.toCallFrame()).filter(Boolean) || [];
      const exceptionId = this.#objectCounter;
      this.#objectCounter += 1;
      this.#exceptionMap.set(value, exceptionId);
      return {
        text: isPromise ? 'Uncaught (in promise)' : 'Uncaught',
        stackTrace: stack ? {
          callFrames: frames
        } : undefined,
        exception: getInspector(value).toRemoteObject(value, val => this.#internObject(val), false),
        lineNumber: frames[0]?.lineNumber || 0,
        columnNumber: frames[0]?.columnNumber || 0,
        exceptionId,
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
        exceptionDetails: completion instanceof engine262_mjs.ThrowCompletion ? this.createExceptionDetails(completion, false) : undefined,
        result: this.toRemoteObject(completion.Value, {})
      };
    }
    getDebuggerCallFrame() {
      const stacks = engine262_mjs.getCurrentStack(false);
      const length = engine262_mjs.surroundingAgent.executionContextStack.length;
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
          callFrameId: String(length - index - 1),
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
    evaluateMode = 'script';
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

  function getParsedEvent(source, id, executionContextId) {
    const lines = source.ECMAScriptCode.sourceText().split('\n');
    return {
      isModule: source instanceof engine262_mjs.SourceTextModuleRecord,
      scriptId: id,
      url: source.HostDefined.specifier || `vm:///${id}`,
      startLine: 0,
      startColumn: 0,
      endLine: lines.length,
      endColumn: lines.pop().length,
      executionContextId,
      hash: '',
      buildId: ''
    };
  }

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
      const source = engine262_mjs.surroundingAgent.parsedSources.get(scriptId);
      if (!source) {
        throw new Error('Not found');
      }
      return {
        scriptSource: source.ECMAScriptCode.sourceText()
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
      return evaluate({
        ...req,
        uniqueContextId: context.context.getRealm(undefined).descriptor.uniqueId,
        evalMode: context.context.evaluateMode
      }, context);
    },
    engine262_setEvaluateMode({
      mode
    }, {
      context
    }) {
      if (mode === 'module' || mode === 'script' || mode === 'console') {
        context.evaluateMode = mode;
      }
    },
    engine262_setFeatures() {
      throw new Error('Method should not be implemented here.');
    }
  };
  const Profiler = {
    enable() {}
  };
  const Runtime = {
    discardConsoleEntries() {},
    enable() {},
    compileScript(options, {
      context,
      sendEvent
    }) {
      let parsed;
      let realm = context.getRealm(options.executionContextId);
      if (!realm && !options.persistScript) {
        realm = context.getAnyRealm();
      }
      if (!realm) {
        return unsupportedError;
      }
      realm.realm.scope(() => {
        if (context.evaluateMode === 'module') {
          parsed = engine262_mjs.ParseModule(options.expression, realm.realm, {
            specifier: options.sourceURL,
            doNotTrackScriptId: !options.persistScript
          });
        } else {
          parsed = engine262_mjs.ParseScript(options.expression, realm.realm, {
            specifier: options.sourceURL,
            doNotTrackScriptId: !options.persistScript,
            [engine262_mjs.kInternal]: {
              allowAllPrivateNames: true
            }
          });
        }
      });
      if (!parsed) {
        throw new Error('No parsed result');
      }
      if (Array.isArray(parsed)) {
        const e = context.createExceptionDetails(engine262_mjs.ThrowCompletion(parsed[0]), false);
        // Note: it has to be this message to trigger devtools' line wrap.
        e.exception.description = 'SyntaxError: Unexpected end of input';
        return {
          exceptionDetails: e
        };
      }
      if (options.persistScript) {
        if (realm?.descriptor.id === undefined) {
          throw new Error('No realm id found');
        }
        const event = getParsedEvent(parsed, parsed.HostDefined.scriptId, realm.descriptor.id);
        sendEvent['Debugger.scriptParsed'](event);
        return {
          scriptId: event.scriptId
        };
      }
      return {};
    },
    callFunctionOn(options, {
      context
    }) {
      const realmDesc = context.getRealm(options.uniqueContextId || options.executionContextId) || context.getAnyRealm();
      if (!realmDesc) {
        throw new Error('No realm found');
      }
      const {
        Value: F
      } = realmDesc.realm.evaluateScript(`(${options.functionDeclaration})`, {
        doNotTrackScriptId: true
      });
      const thisValue = options.objectId ? context.getObject(options.objectId) : engine262_mjs.Value.undefined;
      const args = options.arguments?.map(a => {
        // TODO: revisit
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
      return realmDesc.realm.scope(() => {
        const completion = engine262_mjs.evalQ((Q, X) => {
          const r = Q(engine262_mjs.skipDebugger(engine262_mjs.Call(F, thisValue, args || [])));
          if (options.returnByValue) {
            const value = X(engine262_mjs.Call(realmDesc.realm.Intrinsics['%JSON.stringify%'], engine262_mjs.Value.undefined, [r]));
            if (value instanceof engine262_mjs.JSStringValue) {
              const valueRealized = JSON.parse(value.stringValue());
              return {
                result: {
                  type: typeof value,
                  value: valueRealized
                }
              };
            }
          }
          return context.createEvaluationResult(r);
        });
        if (completion instanceof engine262_mjs.ThrowCompletion) {
          return {
            result: {
              type: 'undefined'
            },
            exceptionDetails: context.createExceptionDetails(completion, false)
          };
        }
        return completion.Value;
      });
    },
    evaluate(options, context) {
      return evaluate({
        ...options,
        evalMode: context.context.evaluateMode,
        uniqueContextId: options.uniqueContextId
      }, context);
    },
    getExceptionDetails(req, {
      context
    }) {
      const object = context.getObject(req.errorObjectId);
      if (object instanceof engine262_mjs.ObjectValue) {
        return {
          exceptionDetails: context.createExceptionDetails(engine262_mjs.ThrowCompletion(object), false)
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
      context
    }) {
      return context.getProperties(options);
    },
    globalLexicalScopeNames({
      executionContextId
    }, {
      context
    }) {
      const global = context.getRealm(executionContextId)?.realm.GlobalObject;
      if (!global) {
        return {
          names: []
        };
      }
      const keys = engine262_mjs.skipDebugger(global.OwnPropertyKeys());
      if (keys instanceof engine262_mjs.ThrowCompletion) {
        return {
          names: []
        };
      }
      return {
        names: engine262_mjs.ValueOfNormalCompletion(keys).map(k => k instanceof engine262_mjs.JSStringValue ? k.stringValue() : null).filter(Boolean)
      };
    },
    releaseObject(req, {
      context
    }) {
      context.releaseObject(req.objectId);
    },
    releaseObjectGroup({
      objectGroup
    }, {
      context
    }) {
      context.releaseObjectGroup(objectGroup);
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
      context
    } = _context;
    const isPreview = options.throwOnSideEffect;
    if (options.awaitPromise) {
      return unsupportedError;
    }
    const realm = context.getRealm(options.uniqueContextId);
    if (!realm) {
      return unsupportedError;
    }
    const isCallOnFrame = typeof options.callFrameId === 'string';
    let callOnFramePoppedLevel = 0;
    const oldExecutionStack = [...engine262_mjs.surroundingAgent.executionContextStack];
    if (isCallOnFrame) {
      const frame = engine262_mjs.surroundingAgent.executionContextStack[options.callFrameId];
      if (!frame) {
        // eslint-disable-next-line no-console
        console.error('Execution context not found: ', options.callFrameId);
        return unsupportedError;
      }
      for (const currentFrame of [...engine262_mjs.surroundingAgent.executionContextStack].reverse()) {
        if (currentFrame === frame) {
          break;
        }
        callOnFramePoppedLevel += 1;
        engine262_mjs.surroundingAgent.executionContextStack.pop(currentFrame);
      }
    }
    const promise = new Promise(resolve => {
      let toBeEvaluated;
      if (isPreview || options.evalMode === 'console' || isCallOnFrame) {
        toBeEvaluated = engine262_mjs.performDevtoolsEval(options.expression, realm.realm, false, !!(isPreview || isCallOnFrame));
      } else {
        let parsed;
        const realm = context.getRealm(options.uniqueContextId);
        realm?.realm.scope(() => {
          if (options.evalMode === 'module') {
            parsed = engine262_mjs.ParseModule(options.expression, realm.realm);
          } else {
            parsed = engine262_mjs.ParseScript(options.expression, realm.realm);
          }
        });
        if (Array.isArray(parsed)) {
          const e = context.createExceptionDetails(engine262_mjs.ThrowCompletion(parsed[0]), false);
          // Note: it has to be this message to trigger devtools' line wrap.
          e.exception.description = 'SyntaxError: Unexpected end of input';
          resolve({
            exceptionDetails: e,
            result: {
              type: 'undefined'
            }
          });
          return;
        }
        toBeEvaluated = parsed;
      }
      const noDebuggerEvaluate = () => {
        if (!('next' in toBeEvaluated)) {
          throw new engine262_mjs.Assert.Error('Unexpected');
        }
        resolve(context.createEvaluationResult(engine262_mjs.skipDebugger(toBeEvaluated)));
      };
      if (isPreview) {
        engine262_mjs.surroundingAgent.debugger_scopePreview(noDebuggerEvaluate);
        return;
      }
      if (isCallOnFrame) {
        noDebuggerEvaluate();
        return;
      }
      const completion = realm.realm.evaluate(toBeEvaluated, completion => {
        resolve(context.createEvaluationResult(completion));
        engine262_mjs.runJobQueue();
      });
      if (completion) {
        return;
      }
      engine262_mjs.surroundingAgent.resumeEvaluate();
    });
    promise.then(() => {
      if (callOnFramePoppedLevel) {
        engine262_mjs.Assert(oldExecutionStack.length - callOnFramePoppedLevel === engine262_mjs.surroundingAgent.executionContextStack.length);
        for (const [newIndex, newStack] of engine262_mjs.surroundingAgent.executionContextStack.entries()) {
          engine262_mjs.Assert(newStack === oldExecutionStack[newIndex]);
        }
        engine262_mjs.surroundingAgent.executionContextStack.length = 0;
        for (const stack of oldExecutionStack) {
          engine262_mjs.surroundingAgent.executionContextStack.push(stack);
        }
      }
    });
    return promise;
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
    #context = new InspectorContext(this);
    #agents = [];
    attachAgent(agent, priorRealms) {
      const oldOnDebugger = agent.hostDefinedOptions.onDebugger;
      agent.hostDefinedOptions.onDebugger = () => {
        oldOnDebugger?.();
        this.sendEvent['Debugger.paused']({
          reason: 'debugCommand',
          callFrames: this.#context.getDebuggerCallFrame()
        });
      };
      const oldOnRealmCreated = agent.hostDefinedOptions.onRealmCreated;
      agent.hostDefinedOptions.onRealmCreated = realm => {
        oldOnRealmCreated?.(realm);
        this.#context.attachRealm(realm, agent);
      };
      const oldOnScriptParsed = agent.hostDefinedOptions.onScriptParsed;
      agent.hostDefinedOptions.onScriptParsed = (script, id) => {
        oldOnScriptParsed?.(script, id);
        const realmId = this.#context.getRealm(script.Realm)?.descriptor.id;
        if (realmId === undefined) {
          return;
        }
        this.sendEvent['Debugger.scriptParsed'](getParsedEvent(script, id, realmId));
      };
      this.#agents.push({
        agent,
        onDetach: () => {
          agent.hostDefinedOptions.onDebugger = oldOnDebugger;
          agent.hostDefinedOptions.onRealmCreated = oldOnRealmCreated;
          agent.hostDefinedOptions.onScriptParsed = oldOnScriptParsed;
          this.#agents = this.#agents.filter(x => x.agent !== agent);
        }
      });
      priorRealms.forEach(realm => {
        this.#context.attachRealm(realm, agent);
      });
    }
    detachAgent(agent) {
      const record = this.#agents.find(x => x.agent === agent);
      record?.onDetach();
      this.#context.detachAgent(agent);
    }
    preference = {
      previewDebug: false
    };
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
        resolve(f(params, this.#debugContext));
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
      const context = this.#context.getRealm(realm);
      if (!context) {
        return;
      }
      this.sendEvent['Runtime.consoleAPICalled']({
        type,
        args: args.map(x => this.#context.toRemoteObject(x, {})),
        executionContextId: context.descriptor.id,
        timestamp: Date.now()
      });
    }
    #debugContext = {
      sendEvent: this.sendEvent,
      preference: this.preference,
      context: this.#context,
      onDebuggerAttached: () => {
        this.#context.realms.forEach(realm => {
          if (realm) {
            this.sendEvent['Runtime.executionContextCreated']({
              context: realm.descriptor
            });
          }
        });
      }
    };
  }

  exports.Inspector = Inspector;
  exports.createConsole = createConsole;

}));
//# sourceMappingURL=inspector.js.map
