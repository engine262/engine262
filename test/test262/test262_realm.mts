/* eslint-disable @typescript-eslint/no-explicit-any */
import { loadImportedModuleSync } from '../../lib-src/node/module.mts';
import {
  OrdinaryObjectCreate,
  ManagedRealm,
  Agent,
  type OrdinaryObject,
  SourceTextModuleRecord,
  createTest262Intrinsics,
} from '#self';

export interface CreateAgentOptions {
  features?: readonly string[];
}

export const createAgent = ({ features = [] }: CreateAgentOptions) => {
  const agent = new Agent({
    features,
    supportedImportAttributes: ['type'],
    loadImportedModule: loadImportedModuleSync,
    onDebugger() {
      // attach an empty debugger to make sure our debugger infrastructure does not break the engine
      agent.resumeEvaluate({ noBreakpoint: true });
    },
  });
  return agent;
};

export interface Test262CreateRealm {
  realm: ManagedRealm;
  $262: OrdinaryObject;
  resolverCache: Map<string, SourceTextModuleRecord>;
  setPrintHandle: (f: ((val: string) => void) | undefined) => void;
}
export interface CreateRealmOptions {
  printCompatMode?: boolean;
}

export function createRealm({ printCompatMode = false }: CreateRealmOptions = {}): Test262CreateRealm {
  const resolverCache = new Map();

  const realm = new ManagedRealm({
    resolverCache,
  });

  return realm.scope(() => {
    const $262 = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
    const { setPrintHandle } = createTest262Intrinsics(realm, printCompatMode);
    return {
      realm,
      $262,
      resolverCache,
      setPrintHandle,
    };
  });
}
