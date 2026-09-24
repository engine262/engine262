import type { GCTrace } from '../gc.mts';
import {
  JSStringValue, Value, type PropertyKeyValue, SymbolValue,
} from '#self';

export class PropertyKeyMap<V> implements Map<PropertyKeyValue, V> {
  #map = new Map<string | SymbolValue, V>();

  clear() {
    this.#map.clear();
  }

  delete(key: PropertyKeyValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.delete(key);
  }

  forEach(callbackfn: (value: V, key: PropertyKeyValue, map: Map<PropertyKeyValue, V>) => void, thisArg?: PropertyKeyMap<V>) {
    this.#map.forEach((value, key) => Reflect.apply(callbackfn, thisArg, [value, typeof key === 'string' ? Value(key) : key, this]));
  }

  get(key: PropertyKeyValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.get(key);
  }

  has(key: PropertyKeyValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.has(key);
  }

  set(key: PropertyKeyValue | string, value: V): this {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    this.#map.set(key, value);
    return this;
  }

  get size() {
    return this.#map.size;
  }

  * entries() {
    for (const [key, value] of this.#map.entries()) {
      if (typeof key === 'string') {
        yield [Value(key), value] as [JSStringValue, V];
      } else {
        yield [key, value] as [SymbolValue, V];
      }
    }
    return undefined;
  }

  * keys() {
    for (const key of this.#map.keys()) {
      if (typeof key === 'string') {
        yield Value(key);
      } else {
        yield key;
      }
    }
    return undefined;
  }

  * values() {
    for (const value of this.#map.values()) {
      yield value;
    }
    return undefined;
  }

  getOrInsert(key: PropertyKeyValue | string, defaultValue: V): V {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    if (this.#map.getOrInsert) return this.#map.getOrInsert(key, defaultValue);
    if (!this.#map.has(key)) {
      this.#map.set(key, defaultValue);
    }
    return this.#map.get(key)!;
  }

  getOrInsertComputed(key: PropertyKeyValue | string, defaultValueFn: (key: PropertyKeyValue) => V): V {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    const value = typeof key === 'string' ? Value(key) : key;
    return this.#map.getOrInsertComputed(key, () => defaultValueFn(value));
  }

  declare [Symbol.iterator]: () => MapIterator<[PropertyKeyValue, V]>;

  declare [Symbol.toStringTag]: string;

  static {
    PropertyKeyMap.prototype[Symbol.toStringTag] = 'PropertyKeyMap';
    PropertyKeyMap.prototype[Symbol.iterator] = PropertyKeyMap.prototype.entries;
  }

  mark(trace: GCTrace) {
    let index = 0;
    for (const [k, v] of this.#map.entries()) {
      trace.strong(`${index}:key`, k, 'element');
      trace.strong(`${index}:value`, v, 'element');
      index += 1;
    }
  }
}
