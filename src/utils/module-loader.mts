import {
  AbstractModuleRecord,
  FinishLoadingImportedModule,
  ManagedRealm,
  NormalCompletion,
  Realm,
  runJobQueue,
  surroundingAgent,
  Throw,
  ThrowCompletion,
  type CyclicModuleRecord, type HostHooks, type ModuleCacheKey, type ModuleRecordHostDefined, type ModuleRequestRecord, type PlainCompletion, type ScriptRecord,
} from '#self';

/**
 * If finish is called with `undefined`, it will pass the module request to the next loader in the chain.
 */
export type ModuleLoader = (
  referrer: CyclicModuleRecord | ScriptRecord | Realm,
  moduleRequest: ModuleRequestRecord,
  hostDefined: ModuleRecordHostDefined | undefined,
  finish: (result: AbstractModuleRecord | NormalCompletion<AbstractModuleRecord> | ThrowCompletion | undefined) => void,
  suggestError: (error: string) => void,
) => void;

export interface ModuleLoaderResultWithCacheKey {
  cacheKey: ModuleCacheKey;
  completion: AbstractModuleRecord | NormalCompletion<AbstractModuleRecord> | ThrowCompletion;
}

export interface ModuleLoaderResultWithoutCacheKey {
  cacheKey: ModuleCacheKey | undefined;
  completion: ThrowCompletion;
}

export function composeModuleLoaders(loaders: readonly ModuleLoader[]): NonNullable<HostHooks['HostLoadImportedModule']> {
  return (referrer, moduleRequest, hostDefined, payload) => {
    const executionContext = surroundingAgent.runningExecutionContext;
    const errors: string[] = [];
    function fin(completion: PlainCompletion<AbstractModuleRecord>) {
      let async = false;
      if (surroundingAgent.runningExecutionContext !== executionContext) {
        async = true;
        surroundingAgent.executionContextStack.push(executionContext);
      }
      FinishLoadingImportedModule(referrer, moduleRequest, payload, completion);
      if (async) surroundingAgent.executionContextStack.pop(executionContext);
      runJobQueue();
    }
    function tryNextLoader(loader: ModuleLoader | undefined, restLoaders: readonly ModuleLoader[]): void {
      if (!loader) {
        const errorMessage = errors.map((error) => `\n    - ${error}`).join('');
        fin((executionContext.Realm as ManagedRealm).scope(() => Throw.SyntaxError('No module loader can load this module request.$1', errorMessage)));
        return;
      }
      loader(referrer, moduleRequest, hostDefined, (completion): void => {
        if (!completion && !restLoaders.length) {
          completion = Throw.Error('Cannot load module $1', moduleRequest.Specifier);
        }
        if (!completion) {
          tryNextLoader(restLoaders[0], restLoaders.slice(1));
          return;
        }
        fin(completion);
      }, (error) => {
        errors.push(error);
      });
    }
    tryNextLoader(loaders[0], loaders.slice(1));
  };
}
