import type { Protocol } from 'devtools-protocol';
import type { InspectorContext } from '../context.mts';
import { getInspector, type Inspector } from './index.mts';
import {
  Descriptor,
  isTypedArrayObject, JSStringValue, ObjectValue, PrivateElementRecord, PrivateName, SymbolDescriptiveString, SymbolValue, UndefinedValue, Value, type MapObject, type PropertyKeyValue, type SetObject,
  DataBlock,
  TypedArrayGetElement,
  TypedArrayLength,
  MakeTypedArrayWithBufferWitnessRecord,
  ArrayExoticObjectInternalMethods,
  F,
} from '#self';

export type InternalPropertyItem = readonly [string, Value | MapObject['MapData'] | SetObject['SetData']];
export type AdditionalPropertyItem = readonly [string, Value];

export class ObjectInspector<T extends ObjectValue> implements Inspector<T> {
  subtype: Protocol.Runtime.RemoteObject['subtype'];

  className: string | ((value: Value) => string);

  toDescription: (value: T, context: InspectorContext) => string;

  toCustomPreview?: (value: T, getObjectId: (val: SymbolValue | ObjectValue) => string, context: InspectorContext) => Protocol.Runtime.CustomPreview | undefined;

  private toEntries: ((value: T, context: InspectorContext) => Protocol.Runtime.ObjectPreview['entries']) | undefined;

  private additionalProperties: ((value: T, context: InspectorContext) => Iterable<AdditionalPropertyItem>) | undefined;

  private internalProperties: ((value: T, context: InspectorContext) => Iterable<InternalPropertyItem>) | undefined;

  public exoticProperties: Inspector<T>['exoticProperties'] | undefined;

  constructor(
    className: ObjectInspector<T>['className'],
    subtype: ObjectInspector<T>['subtype'],
    toDescription: ObjectInspector<T>['toDescription'],
    additionalOptions?: {
      entries?: ObjectInspector<T>['toEntries'];
      additionalProperties?: ObjectInspector<T>['additionalProperties'];
      internalProperties?: ObjectInspector<T>['internalProperties'];
      exoticProperties?: ObjectInspector<T>['exoticProperties'];
      customPreview?: ObjectInspector<T>['toCustomPreview'];
    },
  ) {
    this.className = className;
    this.subtype = subtype;
    this.toDescription = toDescription;
    this.toEntries = additionalOptions?.entries;
    this.additionalProperties = additionalOptions?.additionalProperties;
    this.internalProperties = additionalOptions?.internalProperties;
    this.exoticProperties = additionalOptions?.exoticProperties;
    this.toCustomPreview = additionalOptions?.customPreview;
  }

  toRemoteObject(value: T, getObjectId: (val: ObjectValue | SymbolValue) => string, context: InspectorContext): Protocol.Runtime.RemoteObject {
    const object: Protocol.Runtime.RemoteObject = {
      type: 'object',
      subtype: this.subtype,
      objectId: getObjectId(value),
      className: typeof this.className === 'string' ? this.className : this.className(value),
      description: this.toDescription(value, context),
      preview: this.toObjectPreview(value, context),
    };
    const customPreview = this.toCustomPreview?.(value, getObjectId, context);
    if (customPreview) object.customPreview = customPreview;
    return object;
  }

  toPropertyPreview(name: string, value: T, context: InspectorContext): Protocol.Runtime.PropertyPreview {
    return {
      name,
      type: 'object',
      subtype: this.subtype,
      value: this.toDescription(value, context),
    };
  }

  toInternalProperties(value: T, getObjectId: (val: ObjectValue | SymbolValue) => string, context: InspectorContext, generatePreview: boolean | undefined): Protocol.Runtime.InternalPropertyDescriptor[] {
    const internalProperties = [...this.internalProperties?.(value, context) || []];
    if (!internalProperties.length) {
      return [];
    }
    return internalProperties.map(([name, val]): Protocol.Runtime.InternalPropertyDescriptor => {
      let value: Protocol.Runtime.RemoteObject;
      if (val instanceof Value) {
        value = getInspector(val).toRemoteObject(val, getObjectId, context, generatePreview);
      } else {
        const array = new ObjectValue([]);
        array.DefineOwnProperty = ArrayExoticObjectInternalMethods.DefineOwnProperty;
        array.properties.set('length', Descriptor({ Value: F(val.length) }));
        for (const [index, item] of val.entries()) {
          let value;
          if (item instanceof Value) {
            value = item;
          } else {
            if (!item?.Key || !item.Value) {
              continue;
            }
            value = new ObjectValue(['InspectorEntry']);
            value.properties.set('key', Descriptor({ Value: item.Key }));
            value.properties.set('value', Descriptor({ Value: item.Value }));
          }
          array.properties.set(Value(index.toString()), Descriptor({ Value: value }));
        }
        value = getInspector(array).toRemoteObject(array, getObjectId, context, generatePreview);
      }
      return ({ name, value });
    });
  }

  toObjectPreview(value: T, context: InspectorContext): Protocol.Runtime.ObjectPreview {
    const e = this.toEntries?.(value, context);
    return {
      type: 'object',
      subtype: this.subtype,
      description: this.toDescription(value, context),
      entries: e?.length ? e : undefined,
      ...propertiesToPropertyPreview(
        value,
        [...this.internalProperties?.(value, context) || [], ...this.additionalProperties?.(value, context) || []],
        context,
      ),
    };
  }
}

export const DefaultObject = new ObjectInspector<ObjectValue>('Object', undefined, (object) => {
  const [ctor] = object.ConstructedBy;
  if (!ctor) {
    return 'Object';
  }
  return propertyNameToString(ctor.HostInitialName);
});

export const InternalInspectorEntry = new ObjectInspector<ObjectValue>('Object', 'internal#entry' as never, (value, context) => {
  const key = value.properties.get(Value('key'))!.Value!;
  const val = value.properties.get(Value('value'))!.Value!;
  return `{${getInspector(key).toDescription(key, context)} => ${getInspector(val).toDescription(val, context)}}`;
});

function propertyNameToString(value: PropertyKeyValue | PrivateName): string {
  if (value instanceof JSStringValue) {
    return value.stringValue();
  } else if (value instanceof PrivateName) {
    return value.Description.stringValue();
  } else {
    return SymbolDescriptiveString(value).stringValue();
  }
}

export function propertyToPropertyPreview(key: PropertyKeyValue | PrivateName, desc: Descriptor | PrivateElementRecord, context: InspectorContext): Protocol.Runtime.PropertyPreview {
  const name = propertyNameToString(key);
  if (desc.Get || desc.Set) {
    return { name, type: 'accessor' };
  } else {
    return getInspector(desc.Value!).toPropertyPreview(name, desc.Value!, context);
  }
}

function propertiesToPropertyPreview(value: ObjectValue, extra: undefined | Iterable<InternalPropertyItem>, context: InspectorContext, max = 5) {
  let overflow = false;
  const properties: Protocol.Runtime.PropertyPreview[] = [];
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
    properties.push(propertyToPropertyPreview(key, desc, context));
  }
  for (const desc of value.PrivateElements) {
    if (properties.length > max) {
      overflow = true;
      break;
    }
    properties.push(propertyToPropertyPreview(desc.Key, desc, context));
  }
  return { overflow, properties };
}
