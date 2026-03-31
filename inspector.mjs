/*!
 * engine262 0.0.1 661889ca61f8cee584c73338e2c8e8ff39bd7778
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

import { SymbolDescriptiveString, R, BigIntValue, isECMAScriptFunctionObject, isBuiltinFunctionObject, IntrinsicsFunctionToString, isWrappedFunctionExoticObject, Value, ObjectValue, ArrayExoticObjectInternalMethods, Descriptor, F, isTypedArrayObject, DataBlock, MakeTypedArrayWithBufferWitnessRecord, TypedArrayLength, TypedArrayGetElement, UndefinedValue, JSStringValue, PrivateName, surroundingAgent, skipDebugger, performDevtoolsEval, EnsureCompletion, Get, NormalCompletion, CreateBuiltinFunction, IsCallable, NumberValue, isIntegerIndex, TemporalZonedDateTimeToString, TemporalYearMonthToString, TimeRecordToString, TemporalMonthDayToString, ISODateTimeToString, TemporalDateToString, TemporalDurationToString, TemporalInstantToString, DateProto_toISOString, ValueOfNormalCompletion, evalQ, ToString, isTemporalZonedDateTimeObject, isTemporalPlainYearMonthObject, isTemporalPlainTimeObject, isTemporalPlainMonthDayObject, isTemporalPlainDateTimeObject, isTemporalPlainDateObject, isTemporalDurationObject, isTemporalInstantObject, isShadowRealmObject, isModuleNamespaceObject, isDataViewObject, isArrayBufferObject, isPromiseObject, isErrorObject, isWeakSetObject, isWeakMapObject, isSetObject, isMapObject, isDateObject, isRegExpObject, isArrayExoticObject, isProxyExoticObject, SymbolValue, ManagedRealm, IsAccessorDescriptor, ThrowCompletion, getHostDefinedErrorStack, getCurrentStack, EnvironmentRecord, DeclarativeEnvironmentRecord, OrdinaryObjectCreate, isArgumentExoticObject, ObjectEnvironmentRecord, GlobalEnvironmentRecord, NullValue, FunctionEnvironmentRecord, ModuleEnvironmentRecord, SourceTextModuleRecord, Call, ParseModule, ParseScript, kInternal, runJobQueue, Assert, captureStack, DefinePropertyOrThrow, CreateDataProperty } from './engine262.mjs';

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
const Number = {
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
  toPropertyPreview(name, value, context) {
    return {
      name,
      type: 'number',
      value: this.toDescription(value, context)
    };
  },
  toObjectPreview(value, context) {
    return {
      type: 'number',
      description: this.toDescription(value, context),
      overflow: false,
      properties: []
    };
  },
  toDescription: value => {
    const r = R(value);
    return value instanceof BigIntValue ? `${r}n` : r.toString();
  }
};

function unwrapFunction(value) {
  if (isWrappedFunctionExoticObject(value)) {
    return unwrapFunction(value.WrappedTargetFunction);
  }
  return value;
}
const Function = {
  toRemoteObject(value, getObjectId) {
    value = unwrapFunction(value);
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
  toInternalProperties(value) {
    if (isECMAScriptFunctionObject(value)) {
      return [{
        name: '[[FunctionLocation]]',
        value: value.ECMAScriptCode ? {
          type: 'object',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          subtype: 'internal#location',
          description: 'Object',
          value: {
            columnNumber: value.ECMAScriptCode.location.start.column,
            lineNumber: value.ECMAScriptCode.location.start.line - 1,
            scriptId: value.scriptId
          }
        } : undefined
      }];
    }
    if (isBuiltinFunctionObject(value) && value.nativeFunction.section) {
      return [{
        name: '[[Section]]',
        value: {
          type: 'string',
          value: value.nativeFunction.section
        }
      }];
    }
    return [];
  },
  toDescription: () => 'Function'
};

class ObjectInspector {
  subtype;
  className;
  toDescription;
  toEntries;
  additionalProperties;
  internalProperties;
  exoticProperties;
  constructor(className, subtype, toDescription, additionalOptions) {
    this.className = className;
    this.subtype = subtype;
    this.toDescription = toDescription;
    this.toEntries = additionalOptions?.entries;
    this.additionalProperties = additionalOptions?.additionalProperties;
    this.internalProperties = additionalOptions?.internalProperties;
    this.exoticProperties = additionalOptions?.exoticProperties;
  }
  toRemoteObject(value, getObjectId, context) {
    return {
      type: 'object',
      subtype: this.subtype,
      objectId: getObjectId(value),
      className: typeof this.className === 'string' ? this.className : this.className(value),
      description: this.toDescription(value, context),
      preview: this.toObjectPreview(value, context)
    };
  }
  toPropertyPreview(name, value, context) {
    return {
      name,
      type: 'object',
      subtype: this.subtype,
      value: this.toDescription(value, context)
    };
  }
  toInternalProperties(value, getObjectId, context, generatePreview) {
    const internalProperties = [...(this.internalProperties?.(value, context) || [])];
    if (!internalProperties.length) {
      return [];
    }
    return internalProperties.map(([name, val]) => {
      let value;
      if (val instanceof Value) {
        value = getInspector(val).toRemoteObject(val, getObjectId, context, generatePreview);
      } else {
        const array = new ObjectValue([]);
        array.DefineOwnProperty = ArrayExoticObjectInternalMethods.DefineOwnProperty;
        array.properties.set('length', Descriptor({
          Value: F(val.length)
        }));
        for (const [index, item] of val.entries()) {
          let value;
          if (item instanceof Value) {
            value = item;
          } else {
            if (!item?.Key || !item.Value) {
              continue;
            }
            value = new ObjectValue(['InspectorEntry']);
            value.properties.set('key', Descriptor({
              Value: item.Key
            }));
            value.properties.set('value', Descriptor({
              Value: item.Value
            }));
          }
          array.properties.set(Value(index.toString()), Descriptor({
            Value: value
          }));
        }
        value = getInspector(array).toRemoteObject(array, getObjectId, context, generatePreview);
      }
      return {
        name,
        value
      };
    });
  }
  toObjectPreview(value, context) {
    const e = this.toEntries?.(value, context);
    return {
      type: 'object',
      subtype: this.subtype,
      description: this.toDescription(value, context),
      entries: e?.length ? e : undefined,
      ...propertiesToPropertyPreview(value, [...(this.internalProperties?.(value, context) || []), ...(this.additionalProperties?.(value, context) || [])], context)
    };
  }
}
const DefaultObject = new ObjectInspector('Object', undefined, object => {
  const [ctor] = object.ConstructedBy;
  if (!ctor) {
    return 'Object';
  }
  return propertyNameToString(ctor.HostInitialName);
});
const InternalInspectorEntry = new ObjectInspector('Object', 'internal#entry', (value, context) => {
  const key = value.properties.get(Value('key')).Value;
  const val = value.properties.get(Value('value')).Value;
  return `{${getInspector(key).toDescription(key, context)} => ${getInspector(val).toDescription(val, context)}}`;
});
function propertyNameToString(value) {
  if (value instanceof JSStringValue) {
    return value.stringValue();
  } else if (value instanceof PrivateName) {
    return value.Description.stringValue();
  } else {
    return SymbolDescriptiveString(value).stringValue();
  }
}
function propertyToPropertyPreview(key, desc, context) {
  const name = propertyNameToString(key);
  if (desc.Get || desc.Set) {
    return {
      name,
      type: 'accessor'
    };
  } else {
    return getInspector(desc.Value).toPropertyPreview(name, desc.Value, context);
  }
}
function propertiesToPropertyPreview(value, extra, context, max = 5) {
  let overflow = false;
  const properties = [];
  if (extra) {
    for (const [key, value] of extra) {
      if (value instanceof Value) {
        properties.push(getInspector(value).toPropertyPreview(key, value, context));
      }
      // TODO:... handle Value[]
    }
  }
  if (isTypedArrayObject(value) && value.ViewedArrayBuffer instanceof ObjectValue && value.ViewedArrayBuffer.ArrayBufferData instanceof DataBlock) {
    const record = MakeTypedArrayWithBufferWitnessRecord(value, 'seq-cst');
    const length = TypedArrayLength(record);
    for (let index = 0; index < length; index += 1) {
      const index_value = TypedArrayGetElement(value, Value(index));
      if (index_value instanceof UndefinedValue) {
        break;
      }
      if (properties.length > 100) {
        overflow = true;
        break;
      }
      properties.push(getInspector(index_value).toPropertyPreview(index.toString(), index_value, context));
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
    properties.push(propertyToPropertyPreview(key, desc, context));
  }
  for (const desc of value.PrivateElements) {
    if (properties.length > max) {
      overflow = true;
      break;
    }
    properties.push(propertyToPropertyPreview(desc.Key, desc, context));
  }
  return {
    overflow,
    properties
  };
}

const ShadowRealm = new ObjectInspector('ShadowRealm', undefined, () => 'ShadowRealm', {
  internalProperties: realm => [['[[GlobalObject]]', realm.ShadowRealm.GlobalObject]]
});

const Module = new ObjectInspector('Module', undefined, () => 'Module', {
  additionalProperties: module => {
    const result = [];
    surroundingAgent.debugger_scopePreview(() => {
      skipDebugger(performDevtoolsEval(function* accessModuleExports() {
        for (const key of module.Exports) {
          const completion = EnsureCompletion(skipDebugger(Get(module, key)));
          if (completion instanceof NormalCompletion) {
            result.push([key.stringValue(), completion.Value]);
          }
        }
        return Value.undefined;
      }, module.Module.Realm, true, true));
    });
    return result;
  },
  exoticProperties(module, getObjectId, context, generatePreview) {
    const result = [];
    surroundingAgent.debugger_scopePreview(() => {
      skipDebugger(performDevtoolsEval(function* accessModuleExports() {
        for (const key of module.Exports) {
          const completion = EnsureCompletion(skipDebugger(Get(module, key)));
          if (completion instanceof NormalCompletion) {
            result.push({
              name: key.stringValue(),
              value: getInspector(completion.Value).toRemoteObject(completion.Value, getObjectId, context, generatePreview),
              writable: false,
              configurable: false,
              enumerable: true,
              isOwn: true
            });
          } else {
            const realm = module.Module.Realm;
            const evaluate = CreateBuiltinFunction(function* evaluate() {
              return yield* Get(module, key);
            }, 0, 'Module.evaluate', [], realm);
            result.push({
              name: key.stringValue(),
              get: getInspector(evaluate).toRemoteObject(evaluate, getObjectId, context, generatePreview),
              set: {
                type: 'undefined'
              },
              writable: false,
              configurable: false,
              enumerable: true,
              isOwn: true
            });
          }
        }
        return Value.undefined;
      }, module.Module.Realm, true, true));
    });
    return result;
  }
});

const RegExp = new ObjectInspector('RegExp', 'regexp', value => `/${value.OriginalSource.stringValue()}/${value.OriginalFlags.stringValue()}`);

const Proxy$1 = new ObjectInspector('Proxy', 'proxy', value => {
  if (IsCallable(value.ProxyTarget)) {
    return 'Proxy(Function)';
  }
  if (value.ProxyTarget instanceof ObjectValue) {
    return 'Proxy(Object)';
  }
  return 'Proxy';
});

const Promise$1 = new ObjectInspector('Promise', 'promise', () => 'Promise', {
  internalProperties: value => [['[[PromiseState]]', Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || Value.undefined]]
});

const Array$1 = {
  toRemoteObject(value, getObjectId, context) {
    return {
      type: 'object',
      className: 'Array',
      subtype: 'array',
      objectId: getObjectId(value),
      description: getInspector(value).toDescription(value, context),
      preview: this.toObjectPreview?.(value, context)
    };
  },
  toPropertyPreview(name, value, context) {
    return {
      name,
      type: 'object',
      subtype: 'array',
      value: this.toDescription(value, context)
    };
  },
  toObjectPreview(value, context) {
    const result = {
      type: 'object',
      subtype: 'array',
      overflow: false,
      properties: [],
      description: this.toDescription(value, context)
    };
    const indexProp = [];
    const otherProp = [];
    for (const [key, desc] of value.properties) {
      if (indexProp.length > 100) {
        result.overflow = true;
        break;
      }
      if (isIntegerIndex(key)) {
        indexProp.push(propertyToPropertyPreview(key, desc, context));
      } else if (!(key instanceof JSStringValue && key.stringValue() === 'length')) {
        otherProp.push(propertyToPropertyPreview(key, desc, context));
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
const globalId = new WeakMap();
const id = new WeakMap();
const ArrayBuffer = new ObjectInspector('ArrayBuffer', 'arraybuffer', value => `ArrayBuffer(${value.ArrayBufferByteLength})`, {
  internalProperties(value, context) {
    if (value.ArrayBufferData instanceof DataBlock) {
      if (!id.has(value.ArrayBufferData)) id.set(value.ArrayBufferData, (globalId.get(context) ?? 1000) + 1);
      const blockId = id.get(value.ArrayBufferData);
      globalId.set(context, blockId);
      return [['[[ArrayBufferByteLength]]', Value(value.ArrayBufferByteLength)], ['[[ArrayBufferData]]', Value(blockId)]];
    }
    return [];
  }
});
const DataView = new ObjectInspector('DataView', 'dataview', value => `DataView(${value.ByteLength})`);
const TypedArray = new ObjectInspector('TypedArray', 'typedarray', value => `${value.TypedArrayName.stringValue()}(${value.ArrayLength})`);

const Date$1 = new ObjectInspector('Date', 'date', value => {
  if (!globalThis.Number.isFinite(R(value.DateValue))) {
    return 'Invalid Date';
  }
  const val = DateProto_toISOString([], {
    thisValue: value,
    NewTarget: Value.undefined
  });
  return ValueOfNormalCompletion(val).stringValue();
});
const TemporalInstant = new ObjectInspector('Temporal.Instant', 'date', value => `Temporal.Instant <${TemporalInstantToString(value, undefined, 'auto')}>`);
const TemporalDuration = new ObjectInspector('Temporal.Duration', 'date', value => `Temporal.Duration <${TemporalDurationToString(value, 'auto')}>`);
const TemporalPlainDate = new ObjectInspector('Temporal.PlainDate', 'date', value => `Temporal.PlainDate <${TemporalDateToString(value, 'auto')}>`);
const TemporalPlainDateTime = new ObjectInspector('Temporal.PlainDateTime', 'date', value => `Temporal.PlainDateTime <${ISODateTimeToString(value.ISODateTime, value.Calendar, 'auto', 'auto')}>`);
const TemporalPlainMonthDay = new ObjectInspector('Temporal.PlainMonthDay', 'date', value => `Temporal.PlainMonthDay <${TemporalMonthDayToString(value, 'auto')}>`);
const TemporalPlainTime = new ObjectInspector('Temporal.PlainTime', 'date', value => `Temporal.PlainTime <${TimeRecordToString(value.Time, 'auto')}>`);
const TemporalPlainYearMonth = new ObjectInspector('Temporal.PlainYearMonth', 'date', value => `Temporal.PlainYearMonth <${TemporalYearMonthToString(value, 'auto')}>`);
const TemporalZonedDateTime = new ObjectInspector('Temporal.ZonedDateTime', 'date', value => `Temporal.ZonedDateTime <${TemporalZonedDateTimeToString(value, 'auto', 'auto', 'auto', 'auto')}>`);

const Map$1 = new ObjectInspector('Map', 'map', value => `Map(${value.MapData.filter(x => !!x.Key).length})`, {
  additionalProperties: value => [['size', Value(value.MapData.filter(x => !!x.Key).length)]],
  internalProperties: value => [['[[Entries]]', value.MapData]],
  entries: (value, context) => value.MapData.filter(x => x.Key).map(({
    Key,
    Value
  }) => ({
    key: getInspector(Key).toObjectPreview(Key, context),
    value: getInspector(Value).toObjectPreview(Value, context)
  }))
});
const Set = new ObjectInspector('Set', 'set', value => `Set(${value.SetData.filter(globalThis.Boolean).length})`, {
  additionalProperties: value => [['size', Value(value.SetData.filter(globalThis.Boolean).length)]],
  internalProperties: value => [['[[Entries]]', value.SetData]],
  entries: (value, context) => value.SetData.filter(globalThis.Boolean).map(Value => ({
    value: getInspector(Value).toObjectPreview(Value, context)
  }))
});
const WeakMap$1 = new ObjectInspector('WeakMap', 'weakmap', () => 'WeakMap', {
  internalProperties: value => [['[[Entries]]', value.WeakMapData]],
  entries: (value, context) => value.WeakMapData.filter(x => x.Key).map(({
    Key,
    Value
  }) => ({
    key: getInspector(Key).toObjectPreview(Key, context),
    value: getInspector(Value).toObjectPreview(Value, context)
  }))
});
const WeakSet = new ObjectInspector('WeakSet', 'weakset', () => 'WeakSet', {
  internalProperties: value => [['[[Entries]]', value.WeakSetData]],
  entries: (value, context) => value.WeakSetData.filter(globalThis.Boolean).map(Value => ({
    value: getInspector(Value).toObjectPreview(Value, context)
  }))
});

const Error$1 = new ObjectInspector('SyntaxError', 'error', (value, context) => {
  let text = '';
  const realm = surroundingAgent.runningExecutionContext?.Realm || context.getAnyRealm()?.realm;
  if (!realm) {
    return text;
  }
  surroundingAgent.debugger_scopePreview(() => {
    skipDebugger(performDevtoolsEval(function* getErrorStack() {
      evalQ(Q => {
        if (value instanceof ObjectValue) {
          const stack = Q(skipDebugger(Get(value, Value('stack'))));
          if (stack !== Value.undefined) {
            text += Q(skipDebugger(ToString(stack))).stringValue();
          }
        }
      });
      return Value.undefined;
    }, realm, true, true));
  });
  return text;
});

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
      return Number;
    case isProxyExoticObject(value):
      return Proxy$1;
    case IsCallable(value):
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
      return WeakMap$1;
    case isWeakSetObject(value):
      return WeakSet;
    // generator
    case isErrorObject(value):
      return Error$1;
    case isPromiseObject(value):
      return Promise$1;
    case isTypedArrayObject(value):
      return TypedArray;
    case isArrayBufferObject(value):
      return ArrayBuffer;
    case isDataViewObject(value):
      return DataView;
    case isModuleNamespaceObject(value):
      return Module;
    case isShadowRealmObject(value):
      return ShadowRealm;
    case isTemporalInstantObject(value):
      return TemporalInstant;
    case isTemporalDurationObject(value):
      return TemporalDuration;
    case isTemporalPlainDateObject(value):
      return TemporalPlainDate;
    case isTemporalPlainDateTimeObject(value):
      return TemporalPlainDateTime;
    case isTemporalPlainMonthDayObject(value):
      return TemporalPlainMonthDay;
    case isTemporalPlainTimeObject(value):
      return TemporalPlainTime;
    case isTemporalPlainYearMonthObject(value):
      return TemporalPlainYearMonth;
    case isTemporalZonedDateTimeObject(value):
      return TemporalZonedDateTime;
    case value.internalSlotsList.includes('InspectorEntry'):
      return InternalInspectorEntry;
    default:
      return DefaultObject;
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
      origin: realm.HostDefined.specifier || 'vm://repl',
      name: realm.HostDefined.name || 'engine262',
      uniqueId: id.toString()
    };
    this.realms.push({
      realm,
      descriptor,
      agent,
      detach: () => {
        realm.HostDefined.attachingInspector = oldInspector;
        realm.HostDefined.attachingInspectorReportError = function attachingInspectorReportError(realm, error) {
          if (this.attachingInspector && realm instanceof ManagedRealm) {
            this.attachingInspector.console(realm, 'error', [error]);
          }
        };
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
    realm.HostDefined.attachingInspectorReportError = undefined;
    this.realms[index] = undefined;
    this.#io.sendEvent['Runtime.executionContextDestroyed']({
      executionContextId: descriptor.id,
      executionContextUniqueId: descriptor.uniqueId
    });
  }
  getRealm(realm) {
    if (realm === undefined) {
      if (surroundingAgent.runningExecutionContext && surroundingAgent.currentRealmRecord instanceof ManagedRealm) {
        realm = surroundingAgent.currentRealmRecord;
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
    return getInspector(value).toRemoteObject(value, val => this.#internObject(val, options.objectGroup), this, options.generatePreview);
  }
  getProperties({
    objectId,
    accessorPropertiesOnly,
    generatePreview,
    nonIndexedPropertiesOnly,
    ownProperties
  }) {
    const object = this.getObject(objectId);
    if (!(object instanceof ObjectValue)) {
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
    const exoticProperties = getInspector(object).exoticProperties?.(object, val => this.#internObject(val), this, generatePreview);
    if (exoticProperties) {
      properties.push(...exoticProperties);
    }
    (() => {
      let p = object;
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
        if (ownProperties) {
          break;
        }
        if ('Prototype' in p) {
          p = p.Prototype;
        } else {
          p = Value.null;
        }
      }
    })();
    const additionalInternalFields = getInspector(object).toInternalProperties?.(object, val => this.#internObject(val, 'default'), this, generatePreview);
    if (additionalInternalFields) {
      internalProperties.push(...additionalInternalFields);
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
  #exceptionMap = new WeakMap();
  createExceptionDetails(completion, isPromise) {
    const value = completion instanceof ThrowCompletion ? completion.Value : completion;
    const stack = getHostDefinedErrorStack(value);
    const frames = InspectorContext.callSiteToCallFrame(stack);
    const exceptionId = this.#objectCounter;
    this.#objectCounter += 1;
    this.#exceptionMap.set(value, exceptionId);
    return {
      text: isPromise ? 'Uncaught (in promise)' : 'Uncaught',
      stackTrace: stack ? {
        callFrames: frames
      } : undefined,
      exception: getInspector(value).toRemoteObject(value, val => this.#internObject(val), this, false),
      lineNumber: frames[0]?.lineNumber || 0,
      columnNumber: frames[0]?.columnNumber || 0,
      exceptionId,
      scriptId: frames[0]?.scriptId,
      url: frames[0]?.url
    };
  }
  static callSiteToCallFrame(callSite) {
    return callSite?.map(call => call.toCallFrame()).filter(Boolean) || [];
  }
  createEvaluationResult(completion) {
    completion = EnsureCompletion(completion);
    if (!(completion.Value instanceof Value)) {
      throw new RangeError('Invalid completion value');
    }
    return {
      exceptionDetails: completion instanceof ThrowCompletion ? this.createExceptionDetails(completion, false) : undefined,
      result: this.toRemoteObject(completion.Value, {})
    };
  }
  getDebuggerCallFrame() {
    const stacks = getCurrentStack(false);
    const length = surroundingAgent.executionContextStack.length;
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
        functionLocation: isECMAScriptFunctionObject(stack.context.Function) ? {
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

function getParsedEvent(source, id, executionContextId) {
  const lines = source.ECMAScriptCode.sourceText.split('\n');
  return {
    isModule: source instanceof SourceTextModuleRecord,
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
  enable(_req, context) {
    context.onDebuggerConnect();
    return {
      debuggerId: 'debugger.0'
    };
  },
  disable(_req, context) {
    context.onDebuggerDisconnect();
  },
  getScriptSource({
    scriptId
  }) {
    const source = surroundingAgent.parsedSources.get(scriptId);
    if (!source) {
      throw new Error('Not found');
    }
    return {
      scriptSource: source.ECMAScriptCode.sourceText
    };
  },
  setAsyncCallStackDepth() {},
  setBlackboxPatterns() {},
  setBlackboxExecutionContexts() {},
  // #region breakpoints
  getPossibleBreakpoints() {
    // getPossibleBreakpoints({ start, end, restrictToFunction }) {
    return {
      locations: []
    };
    // return { locations: getBreakpointCandidates(start, end, restrictToFunction) };
  },
  removeBreakpoint({
    breakpointId
  }) {
    surroundingAgent?.removeBreakpoint(breakpointId);
  },
  // setBreakpoint({ location, condition }) { },
  setBreakpointByUrl(req) {
    return surroundingAgent?.addBreakpointByUrl(req);
  },
  // setBreakpointOnFunctionCall({ objectId, condition }) { },
  setBreakpointsActive({
    active
  }) {
    surroundingAgent.breakpointsEnabled = active;
  },
  // setInstrumentationBreakpoint({ instrumentation }) { },
  setPauseOnExceptions({
    state
  }) {
    if (surroundingAgent) {
      surroundingAgent.pauseOnExceptions = state === 'none' ? undefined : state;
    }
  },
  // #endregion

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
        parsed = ParseModule(options.expression, realm.realm, {
          specifier: options.sourceURL,
          doNotTrackScriptId: !options.persistScript
        });
      } else {
        parsed = ParseScript(options.expression, realm.realm, {
          specifier: options.sourceURL,
          doNotTrackScriptId: !options.persistScript,
          [kInternal]: {
            allowAllPrivateNames: true,
            allowAwait: true
          }
        });
      }
    });
    if (!parsed) {
      throw new Error('No parsed result');
    }
    if (Array.isArray(parsed)) {
      const e = context.createExceptionDetails(ThrowCompletion(parsed[0]), false);
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
    const thisValue = options.objectId ? context.getObject(options.objectId) : Value.undefined;
    const args = options.arguments?.map(a => {
      // TODO: revisit
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
    return realmDesc.realm.scope(() => {
      const completion = evalQ((Q, X) => {
        const r = Q(skipDebugger(Call(F, thisValue, args || [])));
        if (options.returnByValue) {
          const value = X(Call(realmDesc.realm.Intrinsics['%JSON.stringify%'], Value.undefined, [r]));
          if (value instanceof JSStringValue) {
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
      if (completion instanceof ThrowCompletion) {
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
    if (object instanceof ObjectValue) {
      return {
        exceptionDetails: context.createExceptionDetails(ThrowCompletion(object), false)
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
    const keys = skipDebugger(global.OwnPropertyKeys());
    if (keys instanceof ThrowCompletion) {
      return {
        names: []
      };
    }
    return {
      names: ValueOfNormalCompletion(keys).map(k => k instanceof JSStringValue ? k.stringValue() : null).filter(Boolean)
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
const Target = {
  setDiscoverTargets() {},
  // @ts-expect-error no doc
  setRemoteLocations() {}
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
  const oldExecutionStack = [...surroundingAgent.executionContextStack];
  if (isCallOnFrame) {
    const frame = surroundingAgent.executionContextStack[options.callFrameId];
    if (!frame) {
      // eslint-disable-next-line no-console
      console.error('Execution context not found: ', options.callFrameId);
      return unsupportedError;
    }
    for (const currentFrame of [...surroundingAgent.executionContextStack].reverse()) {
      if (currentFrame === frame) {
        break;
      }
      callOnFramePoppedLevel += 1;
      surroundingAgent.executionContextStack.pop(currentFrame);
    }
  }
  const promise = new Promise(resolve => {
    let toBeEvaluated;
    if (isPreview || options.evalMode === 'console' || isCallOnFrame) {
      toBeEvaluated = performDevtoolsEval(options.expression, realm.realm, false, !!(isPreview || isCallOnFrame));
    } else {
      let parsed;
      const realm = context.getRealm(options.uniqueContextId);
      realm?.realm.scope(() => {
        if (options.evalMode === 'module') {
          parsed = ParseModule(options.expression, realm.realm);
        } else {
          parsed = ParseScript(options.expression, realm.realm);
        }
      });
      if (Array.isArray(parsed)) {
        const e = context.createExceptionDetails(ThrowCompletion(parsed[0]), false);
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
        throw new Assert.Error('Unexpected');
      }
      resolve(context.createEvaluationResult(skipDebugger(toBeEvaluated)));
    };
    if (isPreview) {
      surroundingAgent.debugger_scopePreview(noDebuggerEvaluate);
      return;
    }
    if (isCallOnFrame) {
      noDebuggerEvaluate();
      return;
    }
    const completion = realm.realm.evaluate(toBeEvaluated, completion => {
      resolve(context.createEvaluationResult(completion));
      runJobQueue();
    });
    if (completion) {
      return;
    }
    surroundingAgent.resumeEvaluate();
  });
  promise.then(() => {
    if (callOnFramePoppedLevel) {
      Assert(oldExecutionStack.length - callOnFramePoppedLevel === surroundingAgent.executionContextStack.length);
      for (const [newIndex, newStack] of surroundingAgent.executionContextStack.entries()) {
        Assert(newStack === oldExecutionStack[newIndex]);
      }
      surroundingAgent.executionContextStack.length = 0;
      for (const stack of oldExecutionStack) {
        surroundingAgent.executionContextStack.push(stack);
      }
    }
  }, err => {
    const expr = surroundingAgent.runningExecutionContext.callSite.lastNode?.sourceText;
    const frame = InspectorContext.callSiteToCallFrame(captureStack().stack);
    _context.sendEvent['Runtime.exceptionThrown']({
      timestamp: Date.now(),
      exceptionDetails: {
        stackTrace: frame.length ? {
          callFrames: frame
        } : undefined,
        text: `engine262 error when evaluating the following node:\n\n    ${expr}\n\n${err.constructor.name}: ${err.message}\n${err.stack.slice(err.stack.indexOf(err.message) + err.message.length + 1)}\n\nFrom now on, the engine262 VM state is broken, please press the reload button.`,
        columnNumber: frame[0]?.columnNumber,
        lineNumber: frame[0]?.lineNumber,
        scriptId: frame[0]?.scriptId,
        url: frame[0]?.url,
        exceptionId: 0
      }
    });
    return {
      result: {
        type: 'undefined'
      }
    };
  });
  return promise;
}

var impl = /*#__PURE__*/Object.freeze({
  __proto__: null,
  Debugger: Debugger,
  HeapProfiler: HeapProfiler,
  Profiler: Profiler,
  Runtime: Runtime,
  Target: Target
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
      const f = CreateBuiltinFunction(function* Console(args) {
        if (surroundingAgent.debugger_isPreviewing) {
          return Value.undefined;
        }
        let completion;
        if (defaultBehaviour[method]) {
          completion = defaultBehaviour[method](args);
        } else if (defaultBehaviour.default) {
          completion = defaultBehaviour.default(method, args);
        }
        if (completion) {
          if (typeof completion === 'object' && 'next' in completion) {
            completion = yield* completion;
          }
          // Do not use Q(host) here. A host may return something invalid like ReturnCompletion.
          if (completion instanceof ThrowCompletion) {
            return completion;
          }
        }
        if (realm.HostDefined.attachingInspector) {
          realm.HostDefined.attachingInspector.console(realm, method, args);
        }
        return Value.undefined;
      }, 1, Value(method), []);
      skipDebugger(CreateDataProperty(console, Value(method), f));
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
      this.sendEvent['Runtime.consoleAPICalled']({
        timestamp: Date.now(),
        type: 'warning',
        executionContextId: 0,
        args: [{
          type: 'string',
          value: `engine262 internal error: Method not implemented: ${namespace}.${method}`
        }]
      });
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
        if (this.#debuggerAttached) {
          this.send({
            method: key,
            params
          });
        }
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
  #debuggerAttached = false;
  onDebuggerDisconnect() {
    this.#debuggerAttached = false;
  }
  #onDebuggerConnected() {
    this.#context.realms.forEach(realm => {
      if (realm) {
        this.sendEvent['Runtime.executionContextCreated']({
          context: realm.descriptor
        });
      }
    });
    this.#agents.forEach(({
      agent
    }) => {
      agent.parsedSources.forEach((script, id) => {
        const realmId = this.#context.getRealm(script.Realm)?.descriptor.id;
        if (realmId === undefined) {
          return;
        }
        this.sendEvent['Debugger.scriptParsed'](getParsedEvent(script, id, realmId));
      });
    });
  }
  #debugContext = {
    sendEvent: this.sendEvent,
    preference: this.preference,
    context: this.#context,
    onDebuggerConnect: () => {
      if (!this.#debuggerAttached) {
        this.#debuggerAttached = true;
        this.#onDebuggerConnected();
      }
    },
    onDebuggerDisconnect: () => {
      this.#debuggerAttached = false;
    }
  };
}

export { Inspector, createConsole };
//# sourceMappingURL=inspector.mjs.map
