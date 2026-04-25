import { readFile, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  EnsureCompletion,
  ManagedRealm, Realm, Throw, ThrowCompletion, type AgentHostDefined, type AbstractModuleRecord, type PlainCompletion,
  type ModuleCacheKey,
} from '#self';

export function createLoadImportedModule(getCache = (realm: ManagedRealm) => realm.HostDefined.resolverCache) {
  const validateType = (attributes: Map<string, string>, finish: (completion: ThrowCompletion) => void) => {
    const type = attributes.get('type');
    if (type && type !== 'json' && type !== 'text') {
      finish(Throw.TypeError('Unsupported import type "$1" (only "json" and "text" are supported)', type));
      return false;
    }
    return true;
  };

  const parseModule = (realm: ManagedRealm, resolved: string, attributes: Map<string, string>, source: string) => {
    if (attributes.get('type') === 'text') {
      return realm.createTextModule(source);
    } else if (attributes.get('type') === 'json' || resolved.endsWith('.json')) {
      return realm.createJSONModule(source);
    } else {
      return realm.compileModule(source, { specifier: resolved });
    }
  };

  const loadImportedModuleSyncOrAsync = (
    readFile: (path: string, callback: (err: NodeJS.ErrnoException | null, data: string) => void) => void,
    ...[referrer, specifier, attributes, _hostDefined, finish]: Parameters<NonNullable<AgentHostDefined['loadImportedModule']>>
  ) => {
    const realm = (referrer instanceof Realm ? referrer : referrer.Realm) as ManagedRealm;
    realm.scope(() => {
      const cache = getCache(realm);

      if (!referrer.HostDefined?.specifier) {
        finish(Throw.SyntaxError('Could not resolve module "$1" from a module with no source location', specifier));
        return;
      }

      if (!validateType(attributes, finish)) {
        return;
      }

      const base = path.dirname(referrer.HostDefined!.specifier!);
      const resolved = path.resolve(base, specifier);
      const attributeObject = Object.fromEntries(attributes);

      const load = (callback: (completion: PlainCompletion<AbstractModuleRecord>) => void) => {
        readFile(resolved, (err, data) => {
          realm.scope(() => {
            if (err) {
              callback(Throw.SyntaxError('Could not read module $1', specifier));
            } else {
              callback(EnsureCompletion(parseModule(realm, resolved, attributes, data)));
            }
          });
        });
      };

      let cacheKey: ModuleCacheKey;
      if (cache) {
        cacheKey = cache.toCacheKey(resolved, attributes.get('type') || 'js', attributeObject);
        cache.load(cacheKey, load, finish);
      } else {
        load(finish);
      }
    });
  };

  const loadImportedModule: NonNullable<AgentHostDefined['loadImportedModule']> = loadImportedModuleSyncOrAsync.bind(null, (path, callback) => {
    readFile(path, 'utf8', callback);
  });
  const loadImportedModuleSync: NonNullable<AgentHostDefined['loadImportedModule']> = loadImportedModuleSyncOrAsync.bind(null, (path, callback) => {
    try {
      const data = readFileSync(path, 'utf8');
      callback(null, data);
    } catch (error) {
      callback(error as NodeJS.ErrnoException, '');
    }
  });
  return { loadImportedModule, loadImportedModuleSync };
}

export const { loadImportedModule, loadImportedModuleSync } = createLoadImportedModule();
