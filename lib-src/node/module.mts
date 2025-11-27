import { readFile, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  evalQ, ManagedRealm, Realm, Throw, ThrowCompletion, type AgentHostDefined,
} from '#self';

export function createLoadImportedModule(getCache = (realm: ManagedRealm) => realm.HostDefined.resolverCache) {
  const validateType = (attributes: Map<string, string>, finish: (completion: ThrowCompletion) => void) => {
    const type = attributes.get('type');
    if (type && type !== 'json') {
      finish(Throw('TypeError', 'UnsupportedModuleType', type));
      return false;
    }
    return true;
  };

  const parseModule = (realm: ManagedRealm, resolved: string, attributes: Map<string, string>, source: string) => (attributes.get('type') === 'json' || resolved.endsWith('.json')
    ? realm.createJSONModule(resolved, source)
    : realm.compileModule(source, { specifier: resolved }));

  const loadImportedModuleSyncOrAsync = (
    readFile: (path: string, callback: (err: NodeJS.ErrnoException | null, data: string) => void) => void,
    ...[referrer, specifier, attributes, _hostDefined, finish]: Parameters<NonNullable<AgentHostDefined['loadImportedModule']>>
  ) => {
    const realm = (referrer instanceof Realm ? referrer : referrer.Realm) as ManagedRealm;
    const cache = getCache(realm);

    if (!referrer.HostDefined.specifier) {
      finish(Throw('SyntaxError', 'CouldNotResolveModule', specifier));
      return;
    }

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
        readFile(resolved, (err, data) => {
          if (err) {
            finish(Throw('SyntaxError', 'CouldNotResolveModule', specifier));
            return;
          }
          const m = Q(parseModule(realm, resolved, attributes, data));
          cache?.set(resolved, m);
          finish(m);
        });
      } catch (error) {
        finish(Throw('SyntaxError', 'CouldNotResolveModule', specifier));
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
