import { type AbstractModuleRecord, type PlainCompletion } from '#self';

type ModuleType = 'js' | 'json' | 'text' | 'bytes' | string;
type ModuleAttributes = Record<string, string>;

interface ModuleCacheEntry {
  result?: PlainCompletion<AbstractModuleRecord>;
  pending?: PromiseWithResolvers<PlainCompletion<AbstractModuleRecord>>;
}

export type ModuleCacheKey = string & { __ModuleCacheKey: never };

export class ModuleCache {
  #cache = new Map<ModuleCacheKey, ModuleCacheEntry>();

  toCacheKey(specifier: string, type: ModuleType, attributes: ModuleAttributes): ModuleCacheKey {
    const sorted: ModuleAttributes = {};
    for (const key of Object.keys(attributes).sort()) {
      sorted[key] = attributes[key];
    }
    sorted.type = type;
    return JSON.stringify([specifier, sorted]) as ModuleCacheKey;
  }

  set(key: ModuleCacheKey, result: PlainCompletion<AbstractModuleRecord>): void {
    if (!this.#cache.has(key)) {
      this.#cache.set(key, { result });
      return;
    }
    const entry = this.#cache.get(key);
    if (entry?.pending) {
      entry.pending.resolve(result);
      this.#cache.set(key, { result });
    } else {
      // cache cannot be modified.
    }
  }

  load(key: ModuleCacheKey, loader: (setCache: (value: PlainCompletion<AbstractModuleRecord>) => void) => void, callback: (result: PlainCompletion<AbstractModuleRecord>) => void): void {
    if (!this.#cache.has(key)) {
      const promise = Promise.withResolvers<PlainCompletion<AbstractModuleRecord>>();
      this.#cache.set(key, { pending: promise });
      loader((value) => {
        promise.resolve(value);
        this.#cache.set(key, { result: value });
        callback(value);
      });
      return;
    }
    const entry = this.#cache.get(key)!;
    if (entry.result) callback(entry.result);
    else if (entry.pending) entry.pending.promise.then(callback);
  }

  hasUnfinishedRequests() {
    return this.#cache.values().some((entry) => !entry.result);
  }

  untilAllRequestFinished() {
    const pending = Array.from(this.#cache.values()).filter((entry) => !!entry.pending).map((entry) => entry.pending!.promise);
    return Promise.all(pending);
  }
}
