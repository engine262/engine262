import type { Protocol } from 'devtools-protocol';
import {
  BigIntValue,
  Descriptor,
  evalQ,
  Get,
  IntrinsicsFunctionToString, isArrayBufferObject, isArrayExoticObject, IsCallable, isDataViewObject, isDateObject, isECMAScriptFunctionObject, isErrorObject, isIntegerIndex, isMapObject, isPromiseObject, isProxyExoticObject, isRegExpObject, isSetObject, isTypedArrayObject, isWeakMapObject, isWeakSetObject, JSStringValue, NumberValue, ObjectValue, PrivateElementRecord, PrivateName, R, surroundingAgent, SymbolDescriptiveString, SymbolValue, ToString, skipDebugger, UndefinedValue, Value, type ArrayBufferObject, type BooleanValue, type DataViewObject, type DateObject, type FunctionObject, type MapObject, type NullValue, type PromiseObject, type PropertyKeyValue, type ProxyObject, type RegExpObject, type SetObject, type TypedArrayObject,
  type WeakMapObject,
  type WeakSetObject,
  type ModuleNamespaceObject,
  isModuleNamespaceObject,
  DataBlock,
  TypedArrayGetElement,
  TypedArrayLength,
  MakeTypedArrayWithBufferWitnessRecord,
  DateProto_toISOString,
  ValueOfNormalCompletion,
  NormalCompletion,
  type ShadowRealmObject,
  isShadowRealmObject,
  isWrappedFunctionExoticObject,
} from '#self';

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
interface Inspector<T extends Value> {
    toRemoteObject(value: T, getObjectId: (val: SymbolValue | ObjectValue) => string, generatePreview: boolean | undefined): Protocol.Runtime.RemoteObject;
    toObjectPreview(value: T): Protocol.Runtime.ObjectPreview;
    toPropertyPreview(name: string, value: T): Protocol.Runtime.PropertyPreview;
    toDescription(value: T): string;
    toInternalProperties?(value: T, getObjectId: (val: SymbolValue | ObjectValue) => string, generatePreview: boolean | undefined): Protocol.Runtime.InternalPropertyDescriptor[];
}

const Null: Inspector<NullValue> = {
  toRemoteObject: () => ({ type: 'object', subtype: 'null', value: null }),
  toObjectPreview: () => ({
    type: 'object', subtype: 'null', properties: [], overflow: false,
  }),
  toPropertyPreview: (name) => ({
    name, type: 'object', subtype: 'null', value: 'null',
  }),
  toDescription: () => '',
};

const Undefined: Inspector<UndefinedValue> = {
  toRemoteObject: () => ({ type: 'undefined' }),
  toObjectPreview: () => ({
    type: 'undefined', properties: [], overflow: false,
  }),
  toPropertyPreview: (name) => ({
    name, type: 'undefined', value: 'undefined',
  }),
  toDescription: () => 'undefined',
};

const Boolean: Inspector<BooleanValue> = {
  toRemoteObject: (value) => ({ type: 'boolean', value: value.booleanValue() }),
  toPropertyPreview: (name, value) => ({
    name, type: 'boolean', value: value.booleanValue().toString(),
  }),
  toObjectPreview(value) {
    return {
      type: 'boolean',
      value: value.booleanValue(),
      description: value.booleanValue().toString(),
      overflow: false,
      properties: [],
    };
  },
  toDescription: (value) => value.booleanValue().toString(),
};

const Symbol: Inspector<SymbolValue> = {
  toRemoteObject: (value, getObjectId) => ({
    type: 'symbol',
    description: SymbolDescriptiveString(value).stringValue(),
    objectId: getObjectId(value),
  }),
  toPropertyPreview: (name, value) => ({
    name, type: 'symbol', value: SymbolDescriptiveString(value).stringValue(),
  }),
  toObjectPreview: (value) => ({
    type: 'symbol',
    description: SymbolDescriptiveString(value).stringValue(),
    overflow: false,
    properties: [],
  }),
  toDescription: (value) => SymbolDescriptiveString(value).stringValue(),
};

const String: Inspector<JSStringValue> = {
  toRemoteObject: (value) => ({ type: 'string', value: value.stringValue() }),
  toPropertyPreview(name, value) {
    return {
      name, type: 'string', value: value.stringValue(),
    };
  },
  toObjectPreview(value) {
    return {
      type: 'string',
      description: value.stringValue(),
      overflow: false,
      properties: [],
    };
  },
  toDescription: (value) => value.stringValue(),
};

const Number: Inspector<NumberValue> = {
  toRemoteObject(value) {
    const v = R(value);
    let description = v.toString();
    const isNeg0 = Object.is(v, -0);
    // Includes values `-0`, `NaN`, `Infinity`, `-Infinity`, and bigint literals.
    if (isNeg0 || !globalThis.Number.isFinite(v)) {
      if (typeof v === 'bigint') {
        description += 'n';
        return { type: 'bigint', unserializableValue: description, description };
      }
      return { type: 'number', unserializableValue: description, description: isNeg0 ? '-0' : description };
    }
    return { type: 'number', value: v, description };
  },
  toPropertyPreview(name, value) {
    return {
      name, type: 'number', value: this.toDescription(value),
    };
  },
  toObjectPreview(value) {
    return {
      type: 'number',
      description: this.toDescription(value),
      overflow: false,
      properties: [],
    };
  },
  toDescription: (value) => {
    const r = R(value);
    return value instanceof BigIntValue ? `${r}n` : r.toString();
  },
};

function unwrapFunction(value: FunctionObject): FunctionObject {
  if (isWrappedFunctionExoticObject(value)) {
    return unwrapFunction(value.WrappedTargetFunction);
  }
  return value;
}
const Function: Inspector<FunctionObject> = {
  toRemoteObject(value, getObjectId) {
    value = unwrapFunction(value);
    const result: Protocol.Runtime.RemoteObject = {
      type: 'function',
      objectId: getObjectId(value),
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
  toPropertyPreview: (name) => ({ name, type: 'function', value: '' }),
  toObjectPreview(value) {
    return {
      type: 'function',
      description: IntrinsicsFunctionToString(value),
      overflow: false,
      properties: [],
    };
  },
  toDescription: () => 'Function',
};

class ObjectInspector<T extends ObjectValue> implements Inspector<T> {
  subtype;

  className;

  toDescription;

  private toEntries;

  private additionalProperties;

  private internalProperties;

  constructor(
    className: string | ((value: Value) => string),
    subtype: Protocol.Runtime.RemoteObject['subtype'],
    toDescription: (value: T) => string,
    additionalOptions?: {
      entries?: (value: T) => Protocol.Runtime.ObjectPreview['entries'];
      additionalProperties?: (value: T) => Iterable<[string, Value]>;
      internalProperties?: (value: T) => Iterable<[string, Value]>;
    },
  ) {
    this.className = className;
    this.subtype = subtype;
    this.toDescription = toDescription;
    this.toEntries = additionalOptions?.entries;
    this.additionalProperties = additionalOptions?.additionalProperties;
    this.internalProperties = additionalOptions?.internalProperties;
  }

  toRemoteObject(value: T, getObjectId: (val: ObjectValue) => string): Protocol.Runtime.RemoteObject {
    return {
      type: 'object',
      subtype: this.subtype,
      objectId: getObjectId(value),
      className: typeof this.className === 'string' ? this.className : this.className(value),
      description: this.toDescription(value),
      preview: this.toObjectPreview(value),
    };
  }

  toPropertyPreview(name: string, value: T): Protocol.Runtime.PropertyPreview {
    return {
      name,
      type: 'object',
      subtype: this.subtype,
      value: this.toDescription(value),
    };
  }

  toInternalProperties(value: T, getObjectId: (val: ObjectValue | SymbolValue) => string, generatePreview: boolean | undefined): Protocol.Runtime.InternalPropertyDescriptor[] {
    const internalProperties = [...this.internalProperties?.(value) || []];
    if (!internalProperties.length) {
      return [];
    }
    return internalProperties.map(([name, val]): Protocol.Runtime.InternalPropertyDescriptor => ({
      name,
      value: getInspector(val).toRemoteObject(val, getObjectId, generatePreview),
    }));
  }

  toObjectPreview(value: T): Protocol.Runtime.ObjectPreview {
    const e = this.toEntries?.(value);
    return {
      type: 'object',
      subtype: this.subtype,
      description: this.toDescription(value),
      entries: e?.length ? e : undefined,
      ...propertiesToPropertyPreview(value, [...this.internalProperties?.(value) || [], ...this.additionalProperties?.(value) || []]),
    };
  }
}
const Default = new ObjectInspector<ObjectValue>('Object', undefined, () => 'Object');

const ArrayBuffer = new ObjectInspector<ArrayBufferObject>('ArrayBuffer', 'arraybuffer', (value) => `ArrayBuffer(${value.ArrayBufferByteLength})`, {});
const DataView = new ObjectInspector<DataViewObject>('DataView', 'dataview', (value) => `DataView(${value.ByteLength})`);
const Error = new ObjectInspector<ObjectValue>('SyntaxError', 'error', (value) => {
  let text = '';
  surroundingAgent.debugger_scopePreview(() => {
    evalQ((Q) => {
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

const Map = new ObjectInspector<MapObject>('Map', 'map', (value) => `Map(${value.MapData.filter((x) => !!x.Key).length})`, {
  additionalProperties: (value) => [['size', Value(value.MapData.filter((x) => !!x.Key).length)]],
  entries: (value) => value.MapData.filter((x) => x.Key).map(({ Key, Value }) => ({
    key: getInspector(Key!).toObjectPreview(Key!),
    value: getInspector(Value!).toObjectPreview(Value!),
  })),
});
const Set = new ObjectInspector<SetObject>('Set', 'set', (value) => `Set(${value.SetData.filter(globalThis.Boolean).length})`, {
  additionalProperties: (value) => [['size', Value(value.SetData.filter(globalThis.Boolean).length)]],
  entries: (value) => value.SetData.filter(globalThis.Boolean).map((Value) => ({
    value: getInspector(Value!).toObjectPreview(Value!),
  })),
});
const WeakMap = new ObjectInspector<WeakMapObject>('WeakMap', 'weakmap', () => 'WeakMap', {
  entries: (value) => value.WeakMapData.filter((x) => x.Key).map(({ Key, Value }) => ({
    key: getInspector(Key!).toObjectPreview(Key!),
    value: getInspector(Value!).toObjectPreview(Value!),
  })),
});
const WeakSet = new ObjectInspector<WeakSetObject>('WeakSet', 'weakset', () => 'WeakSet', {
  entries: (value) => value.WeakSetData.filter(globalThis.Boolean).map((Value) => ({
    value: getInspector(Value!).toObjectPreview(Value!),
  })),
});

const Date = new ObjectInspector<DateObject>('Date', 'date', ((value: DateObject) => {
  if (!globalThis.Number.isFinite(R(value.DateValue))) {
    return 'Invalid Date';
  }
  const val = DateProto_toISOString([], { thisValue: value, NewTarget: Value.undefined });
  return ValueOfNormalCompletion(val as NormalCompletion<JSStringValue>).stringValue();
}));
const Promise = new ObjectInspector<PromiseObject>('Promise', 'promise', () => 'Promise', {
  internalProperties: (value) => [['[[PromiseState]]', Value(value.PromiseState)], ['[[PromiseResult]]', value.PromiseResult || Value.undefined]],
});
const Proxy = new ObjectInspector<ProxyObject>('Proxy', 'proxy', (value) => {
  if (IsCallable(value.ProxyTarget)) {
    return 'Proxy(Function)';
  }
  if (value.ProxyTarget instanceof ObjectValue) {
    return 'Proxy(Object)';
  }
  return 'Proxy';
});
const RegExp = new ObjectInspector<RegExpObject>('RegExp', 'regexp', (value) => `/${value.OriginalSource.stringValue()}/${value.OriginalFlags.stringValue()}`);
const Module = new ObjectInspector<ModuleNamespaceObject>('Module', undefined, () => 'Module', {});
const ShadowRealm = new ObjectInspector<ShadowRealmObject>('ShadowRealm', undefined, () => 'ShadowRealm', {
  internalProperties: (realm) => [['[[GlobalObject]]', realm.ShadowRealm.GlobalObject]],
});

const Array: Inspector<ObjectValue> = {
  toRemoteObject(value, getObjectId) {
    return {
      type: 'object',
      className: 'Array',
      subtype: 'array',
      objectId: getObjectId(value),
      description: getInspector(value).toDescription(value),
      preview: this.toObjectPreview?.(value),
    };
  },
  toPropertyPreview(name, value) {
    return {
      name, type: 'object', subtype: 'array', value: this.toDescription(value),
    };
  },
  toObjectPreview(value) {
    const result: Protocol.Runtime.ObjectPreview = {
      type: 'object',
      subtype: 'array',
      overflow: false,
      properties: [],
      description: this.toDescription(value),
    };
    const indexProp: Protocol.Runtime.PropertyPreview[] = [];
    const otherProp: Protocol.Runtime.PropertyPreview[] = [];
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
  },
};
const TypedArray = new ObjectInspector<TypedArrayObject>('TypedArray', 'typedarray', (value) => `${value.TypedArrayName.stringValue()}(${value.ArrayLength})`);

function propertyToPropertyPreview(key: PropertyKeyValue | PrivateName, desc: Descriptor | PrivateElementRecord): Protocol.Runtime.PropertyPreview {
  let name;
  if (key instanceof JSStringValue) {
    name = key.stringValue();
  } else if (key instanceof PrivateName) {
    name = key.Description.stringValue();
  } else {
    name = SymbolDescriptiveString(key).stringValue();
  }
  if (desc.Get || desc.Set) {
    return { name, type: 'accessor' };
  } else {
    return getInspector(desc.Value!).toPropertyPreview(name, desc.Value!);
  }
}

function propertiesToPropertyPreview(value: ObjectValue, extra: undefined | Iterable<[string, Value]>, max = 5) {
  let overflow = false;
  const properties: Protocol.Runtime.PropertyPreview[] = [];
  if (extra) {
    for (const [key, value] of extra) {
      properties.push(getInspector(value).toPropertyPreview(key, value));
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
      properties.push(getInspector(index_value).toPropertyPreview(index.toString(), index_value));
    }
    properties.push(
      {
        name: 'buffer', type: 'object', subtype: 'arraybuffer', value: `ArrayBuffer(${value.ViewedArrayBuffer.ArrayBufferData.byteLength})`,
      },
      { name: 'byteLength', type: 'number', value: globalThis.String(value.ArrayLength) },
      { name: 'byteOffset', type: 'number', value: globalThis.String(value.ByteOffset) },
      { name: 'length', type: 'number', value: globalThis.String(length) },
    );
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
  return { overflow, properties };
}

export function getInspector(value: Value): Inspector<Value> {
  switch (true) {
    case value === Value.null:
      return Null;
    case value === Value.undefined:
      return Undefined;
    case value === Value.true || value === Value.false:
      return Boolean;
    case value instanceof SymbolValue:
      return Symbol;
    case value instanceof JSStringValue:
      return String;
    case value instanceof NumberValue:
    case value instanceof BigIntValue:
      return Number;
    case isProxyExoticObject(value):
      return Proxy;
    case IsCallable(value):
      return Function;
    case isArrayExoticObject(value):
      return Array;
    case isRegExpObject(value):
      return RegExp;
    case isDateObject(value):
      return Date;
    case isMapObject(value):
      return Map;
    case isSetObject(value):
      return Set;
    case isWeakMapObject(value):
      return WeakMap;
    case isWeakSetObject(value):
      return WeakSet;
    // generator
    case isErrorObject(value):
      return Error;
    case isPromiseObject(value):
      return Promise;
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
    default:
      return Default;
  }
}
