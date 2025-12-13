import { ObjectValue, Value, type PropertyKeyValue } from './value.mts';
import {
  surroundingAgent,
  ExecutionContext,
  HostEnqueueFinalizationRegistryCleanupJob,
  ScriptEvaluation,
  type Markable,
  AgentSignifier,
} from './host-defined/engine.mts';
import {
  X,
  ThrowCompletion,
  AbruptCompletion,
  type PlainCompletion,
  type ValueCompletion,
  NormalCompletion,
  Q,
} from './completion.mts';
import {
  Realm,
  ClearKeptObjects,
  CreateIntrinsics,
  SetDefaultGlobalBindings,
  OrdinaryObjectCreate,
  Assert,
} from './abstract-ops/all.mts';
import {
  ParseScript,
  ParseModule,
  ParseJSONModule,
  ScriptRecord,
  type ParseScriptHostDefined,
} from './parse.mts';
import {
  AbstractModuleRecord, ModuleRecord, SourceTextModuleRecord, type ModuleRecordHostDefined, type ModuleRecordHostDefinedPublic,
} from './modules.mts';
import { isWeakRef, type WeakRefObject } from './intrinsics/WeakRef.mts';
import { isFinalizationRegistryObject, type FinalizationRegistryObject } from './intrinsics/FinalizationRegistry.mts';
import { isWeakMapObject, type WeakMapObject } from './intrinsics/WeakMap.mts';
import { isWeakSetObject, type WeakSetObject } from './intrinsics/WeakSet.mts';
import type { PromiseObject } from './intrinsics/Promise.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import {
  EnsureCompletion, GetModuleNamespace, GlobalEnvironmentRecord, type Intrinsics,
  type ValueEvaluator,
} from '#self';

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

export interface ManagedRealmHostDefined {
  promiseRejectionTracker?(promise: PromiseObject, operation: 'reject' | 'handle'): void;
  getImportMetaProperties?(module: ModuleRecordHostDefinedPublic): readonly { readonly Key: PropertyKeyValue, readonly Value: Value }[];
  finalizeImportMeta?(meta: ObjectValue, module: ModuleRecordHostDefinedPublic): PlainCompletion<void>;
  resolverCache?: Map<string, AbstractModuleRecord>;

  randomSeed?(): string;
  attachingInspector?: unknown;
  attachingInspectorReportError?(realm: Realm, error: Value): void;
  /**
   * See https://tc39.es/ecma262/#sec-HostLoadImportedModule
   * In case of
   *  <button type="button" onclick="import('./foo.mjs')">Click me</button>
   * and
   *  new ShadowRealm().importValue('./foo.mjs', 'default')
   * a Realm instead of a ModuleRecord or ScriptRecord is passed as the referrer.
   */
  specifier?: string | undefined;
  /** The name displayed in the inspector. */
  name?: string | undefined;
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
  constructor(HostDefined: ManagedRealmHostDefined = {}, customizations?: (record: Realm) => [global: ObjectValue | undefined, thisValue: ObjectValue | undefined]) {
    super();
    this.Intrinsics = CreateIntrinsics(this);
    this.AgentSignifier = AgentSignifier();
    this.TemplateMap = [];
    let [global, thisValue] = customizations?.(this) || [];
    if (!global) {
      global = OrdinaryObjectCreate(this.Intrinsics['%Object.prototype%']);
    } else {
      Assert(global instanceof ObjectValue);
    }
    if (!thisValue) {
      thisValue = global;
    } else {
      Assert(thisValue instanceof ObjectValue);
    }
    this.GlobalObject = global;
    this.GlobalEnv = new GlobalEnvironmentRecord(global, thisValue);
    SetDefaultGlobalBindings(this);
    const newContext = new ExecutionContext();
    newContext.Function = Value.null;
    newContext.Realm = this;
    newContext.ScriptOrModule = Value.null;
    this.HostDefined = HostDefined;
    this.topContext = newContext;

    surroundingAgent.hostDefinedOptions.onRealmCreated?.(this);
  }

  scope(inspectorPreview?: boolean): Disposable | null;

  scope<T>(cb: () => T, inspectorPreview?: boolean): T

  scope<T>(arg0?: (() => T) | boolean, arg2?: boolean): T | Disposable | null {
    if (typeof arg0 !== 'function') {
      const inspectorPreview = arg0;
      if (this.active) {
        return null;
      }
      this.active = true;
      surroundingAgent.executionContextStack.push(this.topContext);
      using _ = inspectorPreview ? surroundingAgent.debugger_scopePreview() : null;
      return {
        [Symbol.dispose]: () => {
          surroundingAgent.executionContextStack.pop(this.topContext);
          this.active = false;
        },
      };
    } else {
      const callback = arg0;
      if (this.active) {
        return arg0();
      }
      this.active = true;
      surroundingAgent.executionContextStack.push(this.topContext);
      const result = arg2 ? surroundingAgent.debugger_scopePreview(callback) : callback();
      surroundingAgent.executionContextStack.pop(this.topContext);
      this.active = false;
      return result;
    }
  }

  compileScript(sourceText: string, hostDefined?: ParseScriptHostDefined): PlainCompletion<ScriptRecord> {
    return this.scope(() => {
      const s = ParseScript(sourceText, this, hostDefined);
      if (Array.isArray(s)) {
        return ThrowCompletion(s[0]);
      }
      return NormalCompletion(s);
    });
  }

  compileModule(sourceText: string, hostDefined?: ModuleRecordHostDefined) {
    return this.scope(() => {
      const s = ParseModule(sourceText, this, {
        SourceTextModuleRecord: ManagedSourceTextModuleRecord,
        ...hostDefined,
      });
      if (Array.isArray(s)) {
        return ThrowCompletion(s[0]);
      }
      return NormalCompletion(s);
    });
  }

  /**
   * Call surroundingAgent.resumeEvaluate() to continue evaluation.
   *
   * This function will synchronously return a completion if this is a nested evaluation and debugger cannot be triggered.
   */
  evaluate(sourceText: ScriptRecord | ModuleRecord | ValueEvaluator, callback: (completion: NormalCompletion<Value> | ThrowCompletion) => void) {
    if (!sourceText) {
      throw new TypeError('sourceText is null or undefined');
    }
    let result: ValueCompletion | undefined;

    if (sourceText instanceof ModuleRecord) {
      const old = this.active;
      this.active = true;
      surroundingAgent.executionContextStack.push(this.topContext);

      const loadModuleCompletion = sourceText.LoadRequestedModules();
      const link = ((): PlainCompletion<void> => {
        if (loadModuleCompletion.PromiseState === 'rejected') {
          Q(ThrowCompletion(loadModuleCompletion.PromiseResult!));
        } else if (loadModuleCompletion.PromiseState === 'pending') {
          throw new Error('Internal error: .LoadRequestedModules() returned a pending promise');
        }
        Q(sourceText.Link());
      })();
      if (link instanceof ThrowCompletion) {
        callback(link);
        return link;
      }
      surroundingAgent.evaluate(sourceText.Evaluate(), (completion) => {
        if (completion instanceof NormalCompletion && completion.Value.PromiseState === 'fulfilled') {
          result = GetModuleNamespace(sourceText, 'evaluation');
        } else {
          result = completion;
        }
        this.active = old;
        surroundingAgent.executionContextStack.pop(this.topContext);
        callback(EnsureCompletion(result));
      });
      return result;
    } else if (sourceText instanceof ScriptRecord) {
      const old = this.active;
      this.active = true;
      surroundingAgent.executionContextStack.push(this.topContext);

      surroundingAgent.evaluate(ScriptEvaluation(sourceText), (completion) => {
        this.active = old;
        surroundingAgent.executionContextStack.pop(this.topContext);
        result = completion;
        callback(completion);
      });
      return result;
    } else {
      // this path only called by the inspector
      Assert(!!surroundingAgent.hostDefinedOptions.onDebugger);
      let emptyExecutionStack = false;
      if (!surroundingAgent.runningExecutionContext) {
        emptyExecutionStack = true;
        this.active = true;
        surroundingAgent.executionContextStack.push(this.topContext);
      }
      surroundingAgent.evaluate(sourceText, (completion) => {
        result = completion;
        if (emptyExecutionStack) {
          this.active = false;
          surroundingAgent.executionContextStack.pop(this.topContext);
        }
        callback(completion);
      });
      return result;
    }
  }

  evaluateScript(sourceText: string | ScriptRecord, { specifier, doNotTrackScriptId }: { specifier?: string, doNotTrackScriptId?: boolean } = {}): ValueCompletion {
    if (sourceText === undefined || sourceText === null) {
      throw new TypeError('sourceText must be a string or a ScriptRecord');
    }
    if (typeof sourceText === 'string') {
      sourceText = Q(this.compileScript(sourceText, { specifier, doNotTrackScriptId }));
    }

    let completion;
    completion = this.evaluate(sourceText, (c) => {
      completion = c;
    });
    if (!completion) {
      surroundingAgent.resumeEvaluate({
        noBreakpoint: true,
      });
    }
    if (!completion) {
      throw new Assert.Error('Expect evaluation completes synchronously');
    }
    if (!(completion instanceof AbruptCompletion)) {
      runJobQueue();
    }

    return completion;
  }

  evaluateModule(sourceText: string, specifier: string): PlainCompletion<SourceTextModuleRecord>

  evaluateModule<T extends ModuleRecord>(sourceText: T, specifier: string): PlainCompletion<T>

  evaluateModule(sourceText: string | ModuleRecord, specifier: string): PlainCompletion<ModuleRecord> {
    if (sourceText === undefined || sourceText === null) {
      throw new TypeError('sourceText must be a string or a ModuleRecord');
    }
    if (typeof sourceText === 'string') {
      sourceText = Q(this.compileModule(sourceText, { specifier }));
    }

    let completion;
    completion = this.evaluate(sourceText, (c) => {
      completion = c;
      if (!(completion instanceof AbruptCompletion)) {
        runJobQueue();
      }
    });
    if (!completion) {
      surroundingAgent.resumeEvaluate({
        noBreakpoint: true,
      });
    }

    return sourceText;
  }

  /**
   * @deprecated use compileModule
   */
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
  override* Evaluate() {
    const r = yield* super.Evaluate();
    runJobQueue();
    return r;
  }
}
