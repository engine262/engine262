import fs from 'node:fs';
import { loadImportedModule, loadImportedModuleSync } from '../lib-src/node/module.mts';
import { supportColor, type SkipReason } from './tui.mts';
import {
  Agent, ManagedRealm, type OrdinaryObject, OrdinaryObjectCreate, createTest262Intrinsics,
  ModuleCache,
} from '#self';

export interface Attrs {
  description: string;
  features?: string[];
  includes: string[];
  flags: {
    async?: boolean;
    module?: boolean;
    onlyStrict?: boolean;
    noStrict?: boolean;
    raw?: boolean;
  };
  negative: {
    type: string;
    phase: string;
  };
}

export class Test {
  constructor(file: string, specifier: string, engineFeatures: readonly string[], attrs: Attrs, currentRunFlags: string, contents: string) {
    this.file = file;
    this.specifier = specifier;
    this.engineFeatures = engineFeatures;
    this.attrs = attrs;
    this.content = contents;
    this.currentTestFlag = currentRunFlags;
  }

  asyncModuleLoader = false;

  startTime: number | null = null;

  endTime: number | null = null;

  getRuntimeSeconds(): number {
    if (this.startTime === null || this.endTime) {
      return 0;
    }
    return ~~((Date.now() - this.startTime) / 1000);
  }

  id = Math.random();

  file: string;

  specifier: string;

  attrs: Attrs;

  engineFeatures: readonly string[];

  content: string;

  currentTestFlag: string;

  status: 'pending' | 'skipped' | 'running' | 'passed' | 'failed' = 'pending';

  skipReason: SkipReason | null = null;

  skipFeature: string | null = null;

  withDifferentTestFlag(newFlag: string, newContent = this.content) {
    return new Test(this.file, this.specifier, this.engineFeatures, this.attrs, newFlag, newContent);
  }

  withAsyncModuleLoader() {
    const test = this.withDifferentTestFlag(this.currentTestFlag ? `${this.currentTestFlag},async-loader` : 'async-loader');
    test.asyncModuleLoader = true;
    return test;
  }
}

export type SupervisorToWorker = Exclude<Test, 'withDifferentTestFlag'>

export type LogDetail = {
  message: string;
  stack: Stack[];
}

export type WorkerToSupervisor_Log = {
  status: 'LOG';
  file: undefined | string;
  testId: undefined | number;
} & LogDetail;

export type WorkerToSupervisor_Running = {
  status: 'RUNNING';
  testId: number;
};

export type WorkerToSupervisor_Pass = {
  status: 'PASS';
  file: string;
  flags: string;
  testId: number;
};

export interface Stack {
  specifier?: string | null | undefined;
  source?: string;
  line: number;
  column: number;
}

export type WorkerToSupervisor_Failed = {
  status: 'FAIL';
  file: string;
  flags: string;
  testId: number;
  description: string;
} & LogDetail;

export type WorkerToSupervisor =
  | WorkerToSupervisor_Log
  | WorkerToSupervisor_Running
  | WorkerToSupervisor_Pass
  | WorkerToSupervisor_Failed

export function readList(path: string | URL) {
  const source = fs.readFileSync(path, 'utf8');
  return source
    .split('\n')
    .filter((line) => line && !line.startsWith('#') && !line.startsWith(';'))
    .map((line) => line.split('#')[0].split(';')[0].trim());
}

export interface CreateAgentOptions {
  features?: readonly string[];
  asyncModuleLoader?: boolean;
}

export function createAgent({ features = [], asyncModuleLoader = false }: CreateAgentOptions) {
  const agent = new Agent({
    features,
    supportedImportAttributes: ['type'],
    loadImportedModule: asyncModuleLoader ? loadImportedModule : loadImportedModuleSync,
    onDebugger() {
      // attach an empty debugger to make sure our debugger infrastructure does not break the engine
      agent.resumeEvaluate({ noBreakpoint: true });
    },
  });
  return agent;
}

export interface Test262CreateRealm {
  realm: ManagedRealm;
  $262: OrdinaryObject;
  resolverCache: ModuleCache;
}
export interface CreateRealmOptions {
  printCompatMode?: boolean;
  specifier?: string;
  log?: (...val: unknown[]) => void;
}

// eslint-disable-next-line no-console
export function createRealm({ printCompatMode = false, specifier, log = console.log }: CreateRealmOptions = {}): Test262CreateRealm {
  const resolverCache = new ModuleCache();

  const realm = new ManagedRealm({
    resolverCache,
    specifier,
  });

  return realm.scope(() => {
    const $262 = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
    createTest262Intrinsics(realm, printCompatMode, log);
    return {
      realm,
      $262,
      resolverCache,
    };
  });
}

export function fatal_exit(message: string): never {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(1);
}

export function link(text: string, url: string | URL) {
  if (supportColor) {
    const OSC = '\u001B]';
    const BEL = '\u0007';
    return `${OSC}8;;${url}${BEL}${text}${OSC}8;;${BEL}`;
  } else {
    return text;
  }
}
