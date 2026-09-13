import { ManagedRealm } from '#self';
import { ModuleCache } from '#self';
import { ModuleLoader } from '#self';

export declare function createFileSystemModuleLoader(options?: FileSystemLoaderOptions): ModuleLoader;

export declare interface FileSystemLoaderOptions {
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

export declare const fileSystemModuleLoader: ModuleLoader;

export declare const fileSystemModuleLoaderSync: ModuleLoader;

export declare type ResolvedResult = {
    type: undefined | 'text' | 'json' | 'bytes';
    path: string;
};

export { }
