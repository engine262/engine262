import {
  JSStringValue, Value, type GCMarker, type PropertyKeyValue, SymbolValue, NullValue,
} from '#self';


export class JSStringMap<V> implements Map<JSStringValue, V> {
  #map = new Map<string, V>();

  clear() {
    this.#map.clear();
  }

  delete(key: JSStringValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.delete(key);
  }

  forEach(callbackfn: (value: V, key: JSStringValue, map: Map<JSStringValue, V>) => void, thisArg?: JSStringMap<V>) {
    this.#map.forEach((value, key) => Reflect.apply(callbackfn, thisArg, [value, typeof key === 'string' ? Value(key) : key, this]));
  }

  get(key: JSStringValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.get(key);
  }

  has(key: JSStringValue | string) {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    return this.#map.has(key);
  }

  set(key: JSStringValue | string, value: V): this {
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
      yield [Value(key), value] as [JSStringValue, V];
    }
    return undefined;
  }

  * keys() {
    for (const key of this.#map.keys()) {
      yield Value(key);
    }
    return undefined;
  }

  values() {
    return this.#map.values();
  }

  getOrInsert(key: JSStringValue | string, defaultValue: V): V {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    if (this.#map.getOrInsert) return this.#map.getOrInsert(key, defaultValue);
    if (!this.#map.has(key)) {
      this.#map.set(key, defaultValue);
    }
    return this.#map.get(key)!;
  }

  getOrInsertComputed(key: JSStringValue | string, defaultValueFn: (key: JSStringValue) => V): V {
    if (key instanceof JSStringValue) {
      key = key.stringValue();
    }
    if (this.#map.getOrInsertComputed) return this.#map.getOrInsertComputed(key, (k) => defaultValueFn(Value(k)));
    if (!this.#map.has(key)) {
      this.#map.set(key, defaultValueFn(Value(key)));
    }
    return this.#map.get(key)!;
  }

  declare [Symbol.iterator]: () => MapIterator<[JSStringValue, V]>;

  declare [Symbol.toStringTag]: string;

  static {
    JSStringMap.prototype[Symbol.toStringTag] = 'JSStringMap';
    JSStringMap.prototype[Symbol.iterator] = JSStringMap.prototype.entries;
  }

  mark(m: GCMarker) {
    for (const [k, v] of this.#map.entries()) {
      m(k);
      m(v);
    }
  }
}

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
    if (this.#map.getOrInsertComputed) return this.#map.getOrInsertComputed(key, () => defaultValueFn(value));
    if (!this.#map.has(key)) {
      this.#map.set(key, defaultValueFn(value));
    }
    return this.#map.get(key)!;
  }

  declare [Symbol.iterator]: () => MapIterator<[PropertyKeyValue, V]>;

  declare [Symbol.toStringTag]: string;

  static {
    PropertyKeyMap.prototype[Symbol.toStringTag] = 'PropertyKeyMap';
    PropertyKeyMap.prototype[Symbol.iterator] = PropertyKeyMap.prototype.entries;
  }

  mark(m: GCMarker) {
    for (const [k, v] of this.#map.entries()) {
      m(k);
      m(v);
    }
  }
}

export class JSStringSet {
  #set = new Set<string>();

  constructor(value?: Iterable<JSStringValue | string>) {
    if (value) {
      for (const item of value) {
        this.add(item);
      }
    }
  }

  add(value: JSStringValue | string): this {
    this.#set.add(typeof value === 'string' ? value : value.stringValue());
    return this;
  }

  clear(): void {
    this.#set.clear();
  }

  delete(value: JSStringValue | string): boolean {
    return this.#set.delete(typeof value === 'string' ? value : value.stringValue());
  }

  forEach(callbackfn: (value: JSStringValue, value2: JSStringValue, set: Set<JSStringValue>) => void, thisArg?: JSStringSet): void {
    for (const value of this.#set) {
      Reflect.apply(callbackfn, thisArg, [Value(value), Value(value), this]);
    }
  }

  has(value: JSStringValue | NullValue | string): boolean {
    if (value instanceof NullValue) {
      return false;
    }
    return this.#set.has(typeof value === 'string' ? value : value.stringValue());
  }

  get size() {
    return this.#set.size;
  }

  * entries(): SetIterator<[JSStringValue, JSStringValue]> {
    for (const value of this.#set) {
      yield [Value(value), Value(value)];
    }
    return undefined;
  }

  declare keys: () => SetIterator<JSStringValue>;

  * values() {
    for (const value of this.#set) {
      yield Value(value);
    }
    return undefined;
  }

  declare [Symbol.iterator]: () => SetIterator<JSStringValue>;

  declare [Symbol.toStringTag]: string;

  static {
    JSStringSet.prototype[Symbol.toStringTag] = 'JSStringSet';
    JSStringSet.prototype[Symbol.iterator] = JSStringSet.prototype.values;
    JSStringSet.prototype.keys = JSStringSet.prototype.values;
  }

  mark(_m: GCMarker) { }
}
