import { dirname, isAbsolute, resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import {
  AbstractModuleRecord,
  Assert,
  ManagedRealm, ModuleCache, OutOfRange, Realm,
  Throw,
  type ImportAttributeRecord,
  type ModuleCacheKey,
  type ModuleLoader,
  type PlainCompletion,
} from '#self';

export interface FileSystemLoaderOptions {
  getModuleCache?: (realm: ManagedRealm) => ModuleCache;
  /** @default false */
  sync?: boolean;
  /**
   * @default false
   * If this loader accepts specifier like "/home/test/module.js".
   * This conflicts with URL specifiers ("/root.js" relative to "http://example.com/").
   *
   * This will not reject Windows absolute path like "C:\path\to\module.js".
   */
  allowAbsoluteSpecifier?: boolean;
  canImport?: (resolvedSpecifier: string, callback: (result: boolean) => void) => void;
}

export type ResolvedResult = { type: undefined | 'text' | 'json' | 'bytes', path: string };

export function createFileSystemModuleLoader(options: FileSystemLoaderOptions = {}): ModuleLoader {
  const {
    getModuleCache = (realm) => realm.HostDefined.resolverCache,
    sync,
    allowAbsoluteSpecifier,
    canImport,
  } = options;

  return (referrer, moduleRequest, _hostDefined, finish, suggestError) => {
    const realm = (referrer instanceof Realm ? referrer : referrer.Realm) as ManagedRealm;
    realm.scope(() => {
      let type: ResolvedResult['type'];
      for (const attribute of moduleRequest.Attributes) {
        if (attribute.Key === 'type') {
          const value = attribute.Value;
          if (value !== 'json' && value !== 'text' && value !== 'bytes') {
            suggestError(`Unsupported import type "${value}" (only "json", "bytes" and "text" are supported)`);
            finish(undefined);
            return;
          }
          type = value;
        } else {
          suggestError(`Unsupported import attribute "${attribute.Key}"`);
          finish(undefined);
          return;
        }
      }
      const cache = getModuleCache(realm);
      let resolvedPath: string;

      const isPathToRoot = moduleRequest.Specifier.startsWith('/');
      const isFileURL = moduleRequest.Specifier.startsWith('file://');
      const isRelativeSpecifier = moduleRequest.Specifier.startsWith('./') || moduleRequest.Specifier.startsWith('../');
      if (isPathToRoot) {
        if (allowAbsoluteSpecifier) resolvedPath = moduleRequest.Specifier;
        else {
          suggestError(`Root specifier "${moduleRequest.Specifier}" is not allowed for locating file system modules`);
          finish(undefined);
          return;
        }
      } else if (isFileURL) {
        resolvedPath = moduleRequest.Specifier;
      } else if (isRelativeSpecifier) {
        const referrerSpecifier = referrer.HostDefined?.specifier;
        if (!referrerSpecifier) {
          finish(Throw.SyntaxError(`Cannot resolve relative module specifier "${moduleRequest.Specifier}" without referrer`));
          return;
        }
        const specifierPath = referrerSpecifier.startsWith('file://') ? fileURLToPath(referrerSpecifier) : referrerSpecifier;
        if (!isAbsolute(specifierPath)) {
          suggestError(`Referrer "${referrerSpecifier}" cannot be used to locate module request "${moduleRequest.Specifier}"`);
          finish(undefined);
          return;
        }
        const dir = dirname(specifierPath);
        resolvedPath = resolve(dir, moduleRequest.Specifier);
      } else {
        finish(undefined);
        return;
      }

      if (canImport) {
        canImport(resolvedPath, (result) => {
          if (!result) {
            finish(realm.scope(() => Throw.SyntaxError(`Import module "${resolvedPath}" is not allowed`)));
            return;
          }
          next();
        });
      } else {
        next();
      }

      function next() {
        let resolvedAttributes: readonly ImportAttributeRecord[];
        if (resolvedPath.endsWith('.json') && type === undefined) {
          type = 'json';
          Assert(moduleRequest.Attributes.length === 0);
          resolvedAttributes = [{ Key: 'type', Value: 'json' }];
        } else {
          resolvedAttributes = moduleRequest.Attributes;
        }
        let cacheKey: ModuleCacheKey;
        if (cache) {
          cacheKey = cache.toCacheKey({ Specifier: resolvedPath, Attributes: resolvedAttributes });
          cache.load(cacheKey, loader, finish);
        } else {
          loader(finish);
        }
      }

      function loader(callback: (result: PlainCompletion<AbstractModuleRecord>) => void) {
        if (type === 'bytes') {
          loadBytes(resolvedPath, (err, data) => {
            realm.scope(() => {
              if (err) callback(Throw.SyntaxError('$1', String((err as Error).message)));
              else callback(realm.createBytesModule(data));
            });
          });
        } else {
          load(resolvedPath, (err, data) => {
            realm.scope(() => {
              if (err) {
                callback(Throw.SyntaxError('$1', String((err as Error).message)));
              } else if (type === undefined) {
                callback(realm.compileModule(data, { specifier: resolvedPath }));
              } else if (type === 'json') {
                callback(realm.createJSONModule(data));
              } else if (type === 'text') {
                callback(realm.createTextModule(data));
              } else {
                Assert(type !== 'bytes');
                throw OutOfRange.exhaustive(type);
              }
            });
          });
        }
      }

      function load(path: string, callback: (err: unknown, data: string) => void) {
        if (sync) {
          try {
            const data = readFileSync(path, 'utf8');
            callback(null, data);
          } catch (err) {
            callback(err, null!);
          }
        } else {
          readFile(path, 'utf8').then(
            (data) => callback(null, data),
            (err) => callback(err, null!),
          );
        }
      }
      function loadBytes(path: string, callback: (err: unknown, data: Uint8Array) => void) {
        if (sync) {
          try {
            const data = readFileSync(path);
            callback(null, new Uint8Array(data));
          } catch (err) {
            callback(err, null!);
          }
        } else {
          readFile(path).then(
            (data) => callback(null, new Uint8Array(data)),
            (err) => callback(err, null!),
          );
        }
      }
    });
  };
}

export const fileSystemModuleLoader = createFileSystemModuleLoader();
export const fileSystemModuleLoaderSync = createFileSystemModuleLoader({ sync: true });
