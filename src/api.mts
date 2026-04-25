import { ObjectValue, Value, type PropertyKeyValue } from './value.mts';
import {
  surroundingAgent,
  ScriptEvaluation,
  type Markable,
} from './host-defined/engine.mts';
import { HostEnqueueFinalizationRegistryCleanupJob } from './execution-context/WeakReference.mts';
import { AgentSignifier } from './execution-context/Agent.mts';
import { ExecutionContext } from './execution-context/ExecutionContext.mts';
import {
  X,
  ThrowCompletion,
  type PlainCompletion,
  type ValueCompletion,
  NormalCompletion,
  Q,
} from './completion.mts';
import {
  ParseScript,
  ParseModule,
  ParseJSONModule,
  ScriptRecord,
  type ParseScriptHostDefined,
} from './parse.mts';
import {
  AbstractModuleRecord,
  ModuleRecord, SourceTextModuleRecord, type ModuleRecordHostDefined, type ModuleRecordHostDefinedPublic,
} from './modules.mts';
import { isWeakRef, type WeakRefObject } from './intrinsics/WeakRef.mts';
import { isFinalizationRegistryObject, type FinalizationRegistryObject } from './intrinsics/FinalizationRegistry.mts';
import { isWeakMapObject, type WeakMapObject } from './intrinsics/WeakMap.mts';
import { isWeakSetObject, type WeakSetObject } from './intrinsics/WeakSet.mts';
import type { PromiseObject } from './intrinsics/Promise.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import type { ModuleCache } from './utils/module.mts';
import {
  ClearKeptObjects,
  CreateIntrinsics,
  SetDefaultGlobalBindings,
  OrdinaryObjectCreate,
  Assert,
  CreateTextModule,
  PerformPromiseThen,
  CreateBuiltinFunction,
  ValueOfNormalCompletion,
} from '#self';
import {
  Realm,
  GlobalEnvironmentRecord, type Intrinsics,
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
    let c;
    surroundingAgent.evaluate((function* job(): ValueEvaluator {
      Q(yield* abstractClosure());
      return Value.undefined;
    }()), (completion) => {
      c = completion;
    });
    if (!c) {
      surroundingAgent.resumeEvaluate();
    }
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
  resolverCache?: ModuleCache;

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

  evaluateScript(sourceText: string | ScriptRecord, options: { specifier?: string, doNotTrackScriptId?: boolean } = {}, callback: (completion: NormalCompletion<Value> | ThrowCompletion) => void) {
    if (sourceText === undefined || sourceText === null) throw new TypeError('sourceText must be a string or a ScriptRecord');
    if (typeof sourceText === 'string') sourceText = Q(this.compileScript(sourceText, options));
    if (!sourceText) throw new TypeError('sourceText is null or undefined');
    using _ = this.scope();
    let result: ValueCompletion | undefined;
    surroundingAgent.evaluate(ScriptEvaluation(sourceText), (completion) => {
      result = completion;
      callback(completion);
    });
    return result;
  }

  /**
   * Evaluate a script (skip the debugger).
   */
  evaluateScriptSkipDebugger(sourceText: string | ScriptRecord, options: { specifier?: string, doNotTrackScriptId?: boolean } = {}): ValueCompletion {
    let completion = this.evaluateScript(sourceText, options, (c) => {
      completion = c;
    });
    if (!completion) surroundingAgent.resumeEvaluate({ noBreakpoint: true });
    if (!completion) throw new Assert.Error('Expect evaluation completes synchronously');
    runJobQueue();

    return completion;
  }


  evaluateModule<T extends ModuleRecord>(sourceText: string | T, specifier: string | undefined, finish: (completion: ValueCompletion<PromiseObject>) => void) {
    using _ = this.scope();
    if (sourceText === undefined || sourceText === null) throw new TypeError('sourceText must be a string or a ModuleRecord');
    const moduleCompletion = typeof sourceText === 'string' ? this.compileModule(sourceText, { specifier }) as PlainCompletion<AbstractModuleRecord> : sourceText;

    if (this.HostDefined.resolverCache && typeof specifier === 'string') {
      const key = this.HostDefined.resolverCache.toCacheKey(specifier, 'js', {});
      this.HostDefined.resolverCache.set(key, moduleCompletion);
    }

    if (moduleCompletion instanceof ThrowCompletion) {
      finish(moduleCompletion);
      return;
    }
    const module = ValueOfNormalCompletion(moduleCompletion);

    PerformPromiseThen(module.LoadRequestedModules(), CreateBuiltinFunction.from(function* linkAndEvaluate() {
      const link = module.Link();
      if (link instanceof ThrowCompletion) {
        finish(link);
        return Value.undefined;
      }
      finish(yield* module.Evaluate());
      return Value.undefined;
    }), CreateBuiltinFunction.from((err = Value.undefined) => {
      finish(ThrowCompletion(err));
    }));
    runJobQueue();
  }

  createJSONModule(sourceText: string) {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const module = this.scope(() => ParseJSONModule(Value(sourceText)));
    return module;
  }

  createTextModule(sourceText: string) {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const module = this.scope(() => CreateTextModule(Value(sourceText)));
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
