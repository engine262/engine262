import type { Protocol } from 'devtools-protocol';
import type { InspectorContext } from '../context.mts';
import { ObjectInspector, propertyToPropertyPreview } from './objects.mts';
import { type Inspector, getInspector } from './index.mts';
import {
  DataBlock,
  isIntegerIndex, JSStringValue, NumberValue, ObjectValue, R, Value, type ArrayBufferObject, type DataViewObject, type TypedArrayObject,
} from '#self';

export const Array: Inspector<ObjectValue> = {
  toRemoteObject(value, getObjectId, context) {
    return {
      type: 'object',
      className: 'Array',
      subtype: 'array',
      objectId: getObjectId(value),
      description: getInspector(value).toDescription(value, context),
      preview: this.toObjectPreview?.(value, context),
    };
  },
  toPropertyPreview(name, value, context) {
    return {
      name, type: 'object', subtype: 'array', value: this.toDescription(value, context),
    };
  },
  toObjectPreview(value, context) {
    const result: Protocol.Runtime.ObjectPreview = {
      type: 'object',
      subtype: 'array',
      overflow: false,
      properties: [],
      description: this.toDescription(value, context),
    };
    const indexProp: Protocol.Runtime.PropertyPreview[] = [];
    const otherProp: Protocol.Runtime.PropertyPreview[] = [];
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
  },
};

const globalId = new WeakMap<InspectorContext, number>();
const id = new WeakMap<DataBlock, number>();
export const ArrayBuffer = new ObjectInspector<ArrayBufferObject>('ArrayBuffer', 'arraybuffer', (value) => `ArrayBuffer(${value.ArrayBufferByteLength})`, {
  internalProperties(value, context) {
    if (value.ArrayBufferData instanceof DataBlock) {
      if (!id.has(value.ArrayBufferData)) id.set(value.ArrayBufferData, (globalId.get(context) ?? 1000) + 1);
      const blockId = id.get(value.ArrayBufferData)!;
      globalId.set(context, blockId);
      return [
        ['[[ArrayBufferByteLength]]', Value(value.ArrayBufferByteLength)],
        ['[[ArrayBufferData]]', Value(blockId)],
      ];
    }
    return [];
  },
});

export const DataView = new ObjectInspector<DataViewObject>('DataView', 'dataview', (value) => `DataView(${value.ByteLength})`);

export const TypedArray = new ObjectInspector<TypedArrayObject>('TypedArray', 'typedarray', (value) => `${value.TypedArrayName.stringValue()}(${value.ArrayLength})`);
