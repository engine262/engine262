import type { Protocol } from 'devtools-protocol';
import {
  __Q2,
  BigIntValue, BooleanValue, Descriptor, EnsureCompletion, Get, IsAccessorDescriptor, IsArray, IsPromise, JSStringValue, NullValue, NumberValue, ObjectValue, R, SymbolValue, ThrowCompletion, Type, UndefinedValue, Value, type ExpressionCompletion, type ManagedRealm,
  type MapObject,
  type PromiseObject,
} from '#self';

class InspectorContext {
  realm: ManagedRealm;

  idToObject = new Map<string, ObjectValue>();

  objectToId = new Map<ObjectValue, string>();

  objectCounter = 0;

  previewStack: Value[] = [];

  constructor(realm: ManagedRealm) {
    this.realm = realm;
  }

  internObject(object: ObjectValue, group = 'default') {
    if (this.objectToId.has(object)) {
      return this.objectToId.get(object)!;
    }
    const id = `${group}:${this.objectCounter}`;
    this.objectCounter += 1;
    this.idToObject.set(id, object);
    this.objectToId.set(object, id);
    return id;
  }

  releaseObject(id: string) {
    const object = this.idToObject.get(id);
    if (object) {
      this.idToObject.delete(id);
      this.objectToId.delete(object);
    }
  }

  releaseObjectGroup(group: string) {
    for (const [id, object] of this.idToObject.entries()) {
      if (id.startsWith(group)) {
        this.idToObject.delete(id);
        this.objectToId.delete(object);
      }
    }
  }

  getObject(objectId: string) {
    return this.idToObject.get(objectId);
  }

  toRemoteObject(object: Value, options: Protocol.Runtime.EvaluateRequest & Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.RemoteObject {
    const type = Type(object);
    switch (type) {
      case 'Null':
        return { type: 'object', subtype: 'null', value: null };
      case 'Undefined':
        return { type: 'undefined' };
      case 'String':
        return { type: 'string', value: (object as JSStringValue).stringValue() };
      case 'Number': {
        const result: Protocol.Runtime.RemoteObject = { type: 'number' };
        const v = (object as NumberValue).numberValue(); // eslint-disable-line @engine262/mathematical-value
        if (!Number.isFinite(v)) {
          result.unserializableValue = v.toString();
        } else {
          result.value = v;
        }
        return result;
      }
      case 'Boolean':
        return { type: 'boolean', value: (object as BooleanValue).booleanValue() };
      case 'BigInt':
        return { type: 'bigint', unserializableValue: `${(object as BigIntValue).bigintValue().toString()}n` }; // eslint-disable-line @engine262/mathematical-value
      case 'Symbol':
        return {
          type: 'symbol',
          description: (object as SymbolValue).Description === Value.undefined
            ? 'Symbol()'
            // TODO: well-known symbols
            : `Symbol.for(${((object as SymbolValue).Description as JSStringValue).stringValue()})`,
        };
      default: break;
    }
    const result: Protocol.Runtime.RemoteObject = { type: 'object', objectId: this.internObject(object as ObjectValue, options.objectGroup) };
    // "iterator" | "generator"
    if ('Call' in object) {
      result.type = 'function';
    } else {
      result.subtype = getObjectValueSubtype(object as ObjectValue);
      if (IsArray(object as ObjectValue) === Value.true) {
        result.className = 'Array';
        const v = EnsureCompletion(Get(object as ObjectValue, Value('length')));
        if (v.Type === 'normal') {
          result.description = `Array(${R((v.Value as NumberValue))})`;
        }
      }
    }
    if (options.generatePreview
      && result.type === 'object'
      && result.subtype !== 'null'
      && !this.previewStack.includes(object)) {
      this.previewStack.push(object);
      const properties_completion = this.getPropertyPreview((object as ObjectValue), options);
      const properties = properties_completion instanceof ThrowCompletion ? [] : properties_completion;
      let entries: Protocol.Runtime.EntryPreview[] | undefined;
      if ('MapData' in object) {
        entries = (object as MapObject).MapData.filter((x) => x.Key! && x.Value).map((d): Protocol.Runtime.EntryPreview => ({
          key: this.toRemoteObject(d.Key!, options).preview,
          value: this.toRemoteObject(d.Value!, options).preview!,
        }));
      }
      this.previewStack.pop();
      result.preview = {
        type: result.type,
        subtype: result.subtype,
        overflow: properties.length > 5,
        properties: properties.slice(0, 5),
        entries,
      };
      if (IsArray(object as ObjectValue) === Value.true) {
        const v = EnsureCompletion(Get(object as ObjectValue, Value('length')));
        if (v.Type === 'normal') {
          result.preview.description = `Array(${R(v.Value as NumberValue)})`;
        }
      }
    }
    return result;
  }

  getProperties(object: ObjectValue, options: Protocol.Runtime.EvaluateRequest & Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.GetPropertiesResponse {
    const wrap = (v: Value) => this.toRemoteObject(v, options);

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

    const value = __Q2((Q) => {
      let p: NullValue | ObjectValue = object;
      while (p instanceof ObjectValue) {
        for (const key of Q(p.OwnPropertyKeys())) {
          const desc = Q(p.GetOwnProperty(key));
          if (options.accessorPropertiesOnly && !IsAccessorDescriptor(desc)) {
            continue;
          }
          if (desc instanceof UndefinedValue) {
            return;
          }
          const descriptor: Protocol.Runtime.PropertyDescriptor = {
            name: key instanceof JSStringValue
              ? key.stringValue()
              : '',
            value: desc.Value ? wrap(desc.Value!) : undefined,
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

        if (options.ownProperties) {
          break;
        }
        p = Q(p.GetPrototypeOf());
      }
    });
    if (value.Type === 'throw') {
      return {
        result: [],
        exceptionDetails: this.createExceptionDetails(value, options),
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

    return { result: properties, internalProperties, privateProperties };
  }

  private getPropertyPreview(object: ObjectValue, options: Protocol.Runtime.EvaluateRequest & Protocol.Runtime.GetPropertiesRequest): ThrowCompletion | Protocol.Runtime.PropertyPreview[] {
    const wrap = (v: Value) => this.toRemoteObject(v, options);

    const properties: Protocol.Runtime.PropertyPreview[] = [];
    const value = __Q2((Q) => {
      const keys = Q(object.OwnPropertyKeys());
      for (const key of keys) {
        if (IsArray(object) === Value.true && key.type === 'String' && key.stringValue() === 'length') {
          continue;
        }
        const desc = Q(object.GetOwnProperty(key));
        const descriptor: Protocol.Runtime.PropertyPreview = {
          type: 'object',
          name: key instanceof JSStringValue
            ? key.stringValue()
            : `Symbol(${key.Description instanceof JSStringValue ? key.Description.stringValue() : ''})`,
        };
        if (desc instanceof Descriptor && desc.Value) {
          descriptor.valuePreview = wrap(desc.Value).preview;
          switch (Type(desc.Value)) {
            case 'Object':
              if ('Call' in desc.Value) {
                descriptor.type = 'function';
              } else {
                descriptor.type = 'object';
                descriptor.subtype = getObjectValueSubtype(desc.Value as ObjectValue);
              }
              break;
            case 'Null':
              descriptor.type = 'object';
              descriptor.subtype = 'null';
              descriptor.value = 'null';
              break;
            case 'Undefined':
              descriptor.type = 'undefined';
              descriptor.value = 'undefined';
              break;
            case 'String':
              descriptor.type = 'string';
              descriptor.value = (desc.Value as JSStringValue).stringValue();
              break;
            case 'Number': {
              descriptor.type = 'number';
              descriptor.value = (desc.Value as NumberValue).numberValue().toString(); // eslint-disable-line @engine262/mathematical-value
              break;
            }
            case 'Boolean':
              descriptor.type = 'boolean';
              descriptor.value = (desc.Value as BooleanValue).booleanValue().toString();
              break;
            case 'BigInt':
              descriptor.type = 'bigint';
              descriptor.value = `${(desc.Value as BigIntValue).bigintValue().toString()}n`; // eslint-disable-line @engine262/mathematical-value
              break;
            case 'Symbol': {
              descriptor.type = 'symbol';
              const description = (desc.Value as SymbolValue).Description instanceof JSStringValue
                ? ((desc.Value as SymbolValue).Description as JSStringValue).stringValue()
                : '';
              descriptor.value = `Symbol(${description})`;
              break;
            }
            default:
              throw new RangeError();
          }
        } else {
          descriptor.type = 'accessor';
        }
        properties.push(descriptor);
      }
    });
    if (value.Type === 'throw') {
      return value;
    }

    if (IsPromise(object) === Value.true) {
      properties.push({
        name: '[[PromiseState]]',
        type: 'string',
        value: (object as PromiseObject).PromiseState,
      });
    }

    return properties;
  }

  createExceptionDetails(completion: ThrowCompletion, options: Protocol.Runtime.EvaluateRequest & Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.ExceptionDetails {
    return {
      text: 'Uncaught',
      lineNumber: 0,
      columnNumber: 0,
      exceptionId: 0,
      exception: this.toRemoteObject(completion.Value as Value, options),
    };
  }

  createEvaluationResult(completion: ExpressionCompletion, options: Protocol.Runtime.EvaluateRequest & Protocol.Runtime.GetPropertiesRequest): Protocol.Runtime.EvaluateResponse {
    completion = EnsureCompletion(completion);
    if (completion instanceof ThrowCompletion) {
      return {
        exceptionDetails: this.createExceptionDetails(completion, options),
        result: this.toRemoteObject(completion.Value, options),
      };
    } else {
      if (!(completion.Value instanceof Value)) {
        throw new RangeError('Invalid completion value');
      }
      return {
        result: this.toRemoteObject(completion.Value, options),
      };
    }
  }
}

const contexts: InspectorContext[] = [];
function attachRealm(realm: ManagedRealm) {
  contexts.push(new InspectorContext(realm));
}

function getContext(id = 0) {
  return contexts[id];
}
function getObjectValueSubtype(object: ObjectValue): Protocol.Runtime.PropertyPreview['subtype'] {
  switch (true) {
    case IsArray(object) === Value.true:
      return 'array';
    case 'RegExpMatcher' in object:
      return 'regexp';
    case 'DateValue' in object:
      return 'date';
    case 'MapData' in object:
      return 'map';
    case 'SetData' in object:
      return 'set';
    case 'WeakMapData' in object:
      return 'weakmap';
    case 'WeakSetData' in object:
      return 'weakset';
    case 'GeneratorState' in object:
      return 'generator';
    case 'ErrorData' in object:
      return 'error';
    case 'ProxyTarget' in object:
      return 'proxy';
    case 'PromiseState' in object:
      return 'promise';
    case 'TypedArrayName' in object:
      return 'typedarray';
    case 'ArrayBufferData' in object:
      return 'arraybuffer';
    case 'DataView' in object:
      return 'dataview';
    default:
      return undefined;
  }
}

export { attachRealm, getContext };
export const inspectorOptions = { preview: true, previewDebug: false };
