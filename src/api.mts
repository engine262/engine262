import { ObjectValue, Value, type PropertyKeyValue } from './value.mts';
import {
  surroundingAgent,
  ExecutionContext,
  HostEnqueueFinalizationRegistryCleanupJob,
  ScriptEvaluation,
  type Markable,
  AgentSignifier,
} from './engine.mts';
import {
  X,
  ThrowCompletion,
  AbruptCompletion,
  EnsureCompletion,
  type PlainCompletion,
  type ExpressionCompletion,
} from './completion.mts';
import {
  Realm,
  ClearKeptObjects,
  CreateIntrinsics,
  SetDefaultGlobalBindings,
  OrdinaryObjectCreate,
} from './abstract-ops/all.mts';
import {
  ParseScript,
  ParseModule,
  ParseJSONModule,
  type ParseScriptHostDefined,
} from './parse.mts';
import { AbstractModuleRecord, SourceTextModuleRecord, type ModuleRecordHostDefinedPublic } from './modules.mts';
import * as messages from './messages.mts';
import { isWeakRef, type WeakRefObject } from './intrinsics/WeakRef.mts';
import { isFinalizationRegistryObject, type FinalizationRegistryObject } from './intrinsics/FinalizationRegistry.mts';
import { isWeakMapObject, type WeakMapObject } from './intrinsics/WeakMap.mts';
import { isWeakSetObject, type WeakSetObject } from './intrinsics/WeakSet.mts';
import type { PromiseObject } from './intrinsics/Promise.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import { GlobalEnvironmentRecord, type Intrinsics } from '#self';

export * from './value.mts';
export * from './engine.mts';
export * from './completion.mts';
export * from './abstract-ops/all.mts';
export * from './static-semantics/all.mts';
export * from './runtime-semantics/all.mts';
export * from './environment.mts';
export * from './parse.mts';
export * from './modules.mts';
export * from './inspect.mts';
export * from './api-types.mts';

export type ErrorType = 'AggregateError' | 'TypeError' | 'Error' | 'SyntaxError' | 'RangeError' | 'ReferenceError' | 'URIError';
export function Throw<K extends keyof typeof messages>(type: ErrorType | Value, template: K, ...templateArgs: Parameters<typeof messages[K]>): ThrowCompletion {
  return surroundingAgent.Throw(type, template, ...templateArgs);
}

/** https://tc39.es/ecma262/#sec-weakref-execution */
export function gc() {
  // At any time, if a set of objects S is not live, an ECMAScript implementation may perform the following steps atomically:
  // 1. For each obj of S, do
  //   a. For each WeakRef ref such that ref.[[WeakRefTarget]] is obj,
  //     i. Set ref.[[WeakRefTarget]] to empty.
  //   b. For each FinalizationRegistry fg such that fg.[[Cells]] contains cell, and cell.[[WeakRefTarget]] is obj,
  //     i. Set cell.[[WeakRefTarget]] to empty.
  //     ii. Optionally, perform ! HostEnqueueFinalizationRegistryCleanupJob(fg).
  //   c. For each WeakMap map such that map.WeakMapData contains a record r such that r.Key is obj,
  //     i. Set r.[[Key]] to empty.
  //     ii. Set r.[[Value]] to empty.
  //   d. For each WeakSet set such that set.[[WeakSetData]] contains obj,
  //     i. Replace the element of set whose value is obj with an element whose value is empty.

  const marked = new Set<unknown>();
  const weakrefs = new Set<WeakRefObject>();
  const fgs = new Set<FinalizationRegistryObject>();
  const weakmaps = new Set<WeakMapObject>();
  const weaksets = new Set<WeakSetObject>();
  const ephemeronQueue: WeakMapObject['WeakMapData'][number][] = [];

  const markCb = (O: unknown) => {
    if (typeof O !== 'object' || O === null) {
      return;
    }

    if (marked.has(O)) {
      return;
    }
    marked.add(O);

    if (isWeakRef(O)) {
      weakrefs.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
    } else if (isFinalizationRegistryObject(O)) {
      fgs.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
      O.Cells.forEach((cell) => {
        markCb(cell.HeldValue);
      });
    } else if (isWeakMapObject(O)) {
      weakmaps.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
      O.WeakMapData.forEach((r) => {
        ephemeronQueue.push(r);
      });
    } else if (isWeakSetObject(O)) {
      weaksets.add(O);
      markCb(O.properties);
      markCb(O.Prototype);
    } else if ('mark' in O) {
      (O as Markable).mark(markCb);
    }
  };

  markCb(surroundingAgent);

  while (ephemeronQueue.length > 0) {
    const item = ephemeronQueue.shift()!;
    if (marked.has(item.Key)) {
      markCb(item.Value);
    }
  }

  weakrefs.forEach((ref) => {
    if (!marked.has(ref.WeakRefTarget)) {
      ref.WeakRefTarget = undefined;
    }
  });

  fgs.forEach((fg) => {
    let dirty = false;
    fg.Cells.forEach((cell) => {
      if (!marked.has(cell.WeakRefTarget)) {
        cell.WeakRefTarget = undefined;
        dirty = true;
      }
    });
    if (dirty) {
      X(HostEnqueueFinalizationRegistryCleanupJob(fg));
    }
  });

  weakmaps.forEach((map) => {
    map.WeakMapData.forEach((r) => {
      if (!marked.has(r.Key)) {
        r.Key = undefined;
        r.Value = undefined;
      }
    });
  });

  weaksets.forEach((set) => {
    set.WeakSetData.forEach((obj, i) => {
      if (!marked.has(obj)) {
        set.WeakSetData[i] = undefined;
      }
    });
  });
}

/** https://tc39.es/ecma262/#sec-jobs */
export function runJobQueue() {
  if (surroundingAgent.executionContextStack.some((e) => e.ScriptOrModule !== Value.null)) {
    return;
  }

  // At some future point in time, when there is no running execution context
  // and the execution context stack is empty, the implementation must:
  while (surroundingAgent.jobQueue.length > 0) { // eslint-disable-line no-constant-condition
    const {
      job: abstractClosure,
      callerRealm,
      callerScriptOrModule,
    } = surroundingAgent.jobQueue.shift()!;

    // 1. Perform any implementation-defined preparation steps.
    const newContext = new ExecutionContext();
    surroundingAgent.executionContextStack.push(newContext);
    newContext.Function = Value.null;
    newContext.Realm = callerRealm;
    newContext.ScriptOrModule = callerScriptOrModule;
    // 2. Call the abstract closure.
    X(abstractClosure());
    // 3. Perform any host-defined cleanup steps, after which the execution context stack must be empty.
    ClearKeptObjects();
    gc();
    surroundingAgent.executionContextStack.pop(newContext);
  }
}

export function evaluateScript(sourceText: string, realm: Realm, hostDefined?: ParseScriptHostDefined): ExpressionCompletion {
  const s = ParseScript(sourceText, realm, hostDefined);
  if (Array.isArray(s)) {
    return ThrowCompletion(s[0]);
  }

  return EnsureCompletion(ScriptEvaluation(s));
}

export interface ManagedRealmHostDefined {
  promiseRejectionTracker?(promise: PromiseObject, operation: 'reject' | 'handle'): void;
  getImportMetaProperties?(module: ModuleRecordHostDefinedPublic): readonly { readonly Key: PropertyKeyValue, readonly Value: Value }[];
  finalizeImportMeta?(meta: ObjectValue, module: ModuleRecordHostDefinedPublic): PlainCompletion<void>;
  resolverCache?: Map<string, AbstractModuleRecord>;

  randomSeed?(): string
}
export class ManagedRealm extends Realm {
  override TemplateMap: { Site: ParseNode.TemplateLiteral; Array: ObjectValue; }[];

  override AgentSignifier: unknown;

  override Intrinsics: Intrinsics;

  override randomState: BigUint64Array<ArrayBufferLike> | undefined;

  override GlobalObject: ObjectValue;

  override GlobalEnv: GlobalEnvironmentRecord;

  override HostDefined: ManagedRealmHostDefined;

  topContext: ExecutionContext;

  active = false;

  /** https://tc39.es/ecma262/#sec-initializehostdefinedrealm */
  constructor(HostDefined: ManagedRealmHostDefined = {}) {
    super();
    this.Intrinsics = CreateIntrinsics(this);
    this.AgentSignifier = AgentSignifier();
    this.TemplateMap = [];
    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = this;
    newContext.ScriptOrModule = Value.null;
    surroundingAgent.executionContextStack.push(newContext);
    // TODO: a host hook for exotic global object
    const global = OrdinaryObjectCreate(this.Intrinsics['%Object.prototype%']);
    // TODO: a host hook for global "this" binding
    const thisValue = global;
    this.GlobalObject = global;
    this.GlobalEnv = new GlobalEnvironmentRecord(global, thisValue);
    SetDefaultGlobalBindings(this);

    // misc
    surroundingAgent.executionContextStack.pop(newContext);
    this.HostDefined = HostDefined;
    this.topContext = newContext;
  }

  scope<T>(cb: () => T, inspectorPreview = false) {
    if (this.active) {
      return cb();
    }
    this.active = true;
    surroundingAgent.executionContextStack.push(this.topContext);
    const r = inspectorPreview ? surroundingAgent.debugger_scopePreview(cb) : cb();
    surroundingAgent.executionContextStack.pop(this.topContext);
    this.active = false;
    return r;
  }

  evaluateScript(sourceText: string, { specifier, inspectorPreview }: { specifier?: string, inspectorPreview?: boolean } = {}): ExpressionCompletion {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }

    const res = this.scope(() => {
      const realm = surroundingAgent.currentRealmRecord;
      return evaluateScript(sourceText, realm, {
        specifier,
        public: { specifier },
      });
    }, inspectorPreview);

    if (!(res instanceof AbruptCompletion)) {
      runJobQueue();
    }

    return res;
  }

  createSourceTextModule(specifier: string, sourceText: string): PlainCompletion<SourceTextModuleRecord> {
    if (typeof specifier !== 'string') {
      throw new TypeError('specifier must be a string');
    }
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const module = this.scope(() => ParseModule(sourceText, this, {
      specifier,
      SourceTextModuleRecord: ManagedSourceTextModuleRecord,
    }));
    if (Array.isArray(module)) {
      return ThrowCompletion(module[0]);
    }
    return module;
  }

  createJSONModule(specifier: string, sourceText: string) {
    if (typeof specifier !== 'string') {
      throw new TypeError('specifier must be a string');
    }
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const module = this.scope(() => ParseJSONModule(Value(sourceText), this, {
      specifier,
    }));
    return module;
  }
}

class ManagedSourceTextModuleRecord extends SourceTextModuleRecord {
  override Evaluate() {
    const r = super.Evaluate();
    if (!(r instanceof AbruptCompletion)) {
      runJobQueue();
    }
    return r;
  }
}
