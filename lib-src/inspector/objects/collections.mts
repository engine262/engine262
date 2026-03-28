import { getInspector } from './index.mts';
import { ObjectInspector } from './objects.mts';
import {
  type MapObject, Value, type SetObject, type WeakMapObject, type WeakSetObject,
} from '#self';

export const Map = new ObjectInspector<MapObject>('Map', 'map', (value) => `Map(${value.MapData.filter((x) => !!x.Key).length})`, {
  additionalProperties: (value) => [['size', Value(value.MapData.filter((x) => !!x.Key).length)]],
  internalProperties: (value) => [['[[Entries]]', value.MapData]],
  entries: (value, context) => value.MapData.filter((x) => x.Key).map(({ Key, Value }) => ({
    key: getInspector(Key!).toObjectPreview(Key!, context),
    value: getInspector(Value!).toObjectPreview(Value!, context),
  })),
});

export const Set = new ObjectInspector<SetObject>('Set', 'set', (value) => `Set(${value.SetData.filter(globalThis.Boolean).length})`, {
  additionalProperties: (value) => [['size', Value(value.SetData.filter(globalThis.Boolean).length)]],
  internalProperties: (value) => [['[[Entries]]', value.SetData]],
  entries: (value, context) => value.SetData.filter(globalThis.Boolean).map((Value) => ({
    value: getInspector(Value!).toObjectPreview(Value!, context),
  })),
});

export const WeakMap = new ObjectInspector<WeakMapObject>('WeakMap', 'weakmap', () => 'WeakMap', {
  internalProperties: (value) => [['[[Entries]]', value.WeakMapData]],
  entries: (value, context) => value.WeakMapData.filter((x) => x.Key).map(({ Key, Value }) => ({
    key: getInspector(Key!).toObjectPreview(Key!, context),
    value: getInspector(Value!).toObjectPreview(Value!, context),
  })),
});

export const WeakSet = new ObjectInspector<WeakSetObject>('WeakSet', 'weakset', () => 'WeakSet', {
  internalProperties: (value) => [['[[Entries]]', value.WeakSetData]],
  entries: (value, context) => value.WeakSetData.filter(globalThis.Boolean).map((Value) => ({
    value: getInspector(Value!).toObjectPreview(Value!, context),
  })),
});
