import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  evalQ, ManagedRealm, NullValue, Realm, Throw, ThrowCompletion, type AgentHostDefined,
} from '#self';

export function createLoadImportedModule(getCache = (realm: ManagedRealm) => realm.HostDefined.resolverCache) {
  const validateType = (attributes: Map<string, string>, finish: (completon: ThrowCompletion) => void) => {
    const type = attributes.get('type');
    if (type && type !== 'json') {
      finish(Throw('TypeError', 'UnsupportedModuleType', type));
      return false;
    }
    return true;
  };

  const parseModule = (realm: ManagedRealm, resolved: string, attributes: Map<string, string>, source: string) => (attributes.get('type') === 'json' || resolved.endsWith('.json')
    ? realm.createJSONModule(resolved, source)
    : realm.createSourceTextModule(resolved, source));

  const loadImportedModule: NonNullable<AgentHostDefined['loadImportedModule']> = (referrer, specifier, attributes, _hostDefined, finish) => {
    if (referrer instanceof Realm || referrer instanceof NullValue) {
      throw new Error('Internal error: loadImportedModule called without a ScriptOrModule referrer.');
    }
    const realm = referrer.Realm as ManagedRealm;
    const cache = getCache(realm);

    if (!validateType(attributes, finish)) {
      return;
    }

    evalQ(async (Q) => {
      const base = path.dirname(referrer.HostDefined.specifier!);
      const resolved = path.resolve(base, specifier);
      if (cache?.has(resolved)) {
        finish(cache.get(resolved)!);
        return;
      }
      try {
        const source = await readFile(resolved, 'utf8');
        const m = Q(parseModule(realm, resolved, attributes, source));
        cache?.set(resolved, m);
        finish(m);
      } catch (error) {
        finish(Throw('SyntaxError', 'CouldNotResolveModule', specifier));
      }
    });
  };
  const loadImportedModuleSync: NonNullable<AgentHostDefined['loadImportedModule']> = (referrer, specifier, attributes, _hostDefined, finish) => {
    if (referrer instanceof Realm || referrer instanceof NullValue) {
      throw new Error('Internal error: loadImportedModule called without a ScriptOrModule referrer.');
    }
    const realm = referrer.Realm as ManagedRealm;
    const cache = getCache(realm);

    if (!validateType(attributes, finish)) {
      return;
    }

    evalQ((Q) => {
      const base = path.dirname(referrer.HostDefined.specifier!);
      const resolved = path.resolve(base, specifier);
      if (cache?.has(resolved)) {
        finish(cache.get(resolved)!);
        return;
      }
      try {
        const source = readFileSync(resolved, 'utf8');
        const m = Q(parseModule(realm, resolved, attributes, source));
        cache?.set(resolved, m);
        finish(m);
      } catch (error) {
        finish(Throw('SyntaxError', 'CouldNotResolveModule', specifier));
      }
    });
  };
  return { loadImportedModule, loadImportedModuleSync };
}

export const { loadImportedModule, loadImportedModuleSync } = createLoadImportedModule();
