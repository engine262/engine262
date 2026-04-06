import type { AbstractModuleRecord } from '#self';

export class ModuleCache {
  private cache = new Map<string, Map<string, AbstractModuleRecord>>();

  get(specifier: string, attribute: 'js' | 'json' | 'text') {
    return this.cache.get(specifier)?.get(attribute);
  }

  getOrInsert(specifier: string, attribute: 'js' | 'json' | 'text', module: () => AbstractModuleRecord) {
    if (!this.cache.has(specifier)) this.set(specifier, attribute, module());
    return this.cache.get(specifier)!.get(attribute)!;
  }

  has(specifier: string, attribute: 'js' | 'json' | 'text') {
    return this.cache.get(specifier)?.has(attribute) ?? false;
  }

  set(specifier: string, attribute: 'js' | 'json' | 'text', module: AbstractModuleRecord) {
    if (!this.cache.has(specifier)) this.cache.set(specifier, new Map());
    const attributeCache = this.cache.get(specifier)!;
    attributeCache.set(attribute, module);
  }
}
