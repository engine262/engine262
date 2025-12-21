import { NullValue, Value } from '../value.mts';
import {
  EnsureCompletion,
  NormalCompletion,
  ThrowCompletion,
  Q, X,
  type PlainCompletion,
} from '../completion.mts';
import {
  IsCallable,
  Call, Construct, Assert,
  GetActiveScriptOrModule,
  CleanupFinalizationRegistry,
  FinishLoadingImportedModule,
  Realm,
  type FunctionObject,
  GraphLoadingState,
  PromiseCapabilityRecord,
} from '../abstract-ops/all.mts';
import { GlobalDeclarationInstantiation } from '../runtime-semantics/all.mts';
import {
  Evaluate, type PlainEvaluator, type ValueEvaluator, type YieldEvaluator,
} from '../evaluator.mts';
import { CallSite, kAsyncContext, kInternal } from '../helpers.mts';
import {
  AbstractModuleRecord, CyclicModuleRecord, EnvironmentRecord, ObjectValue, PrivateEnvironmentRecord, runJobQueue, skipDebugger, type Arguments, type AsyncGeneratorObject, type ErrorType, type ValueCompletion, type GeneratorObject, type Intrinsics, type ModuleRecordHostDefined, type ParseScriptHostDefined, type ScriptRecord,
  ManagedRealm,
  SourceTextModuleRecord,
  type ModuleRequestRecord,
  Throw,
} from '../index.mts';
import * as messages from '../messages.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { PromiseObject } from '../intrinsics/Promise.mts';
import type { FinalizationRegistryObject } from '../intrinsics/FinalizationRegistry.mts';
import type { ShadowRealmObject } from '../intrinsics/ShadowRealm.mts';
import { shouldStepOnNode } from './debugger-util.mts';

export interface Engine262Feature {
  name: string;
  flag: string;
  url: string;
}

// unflag a feature when it reaches stage 3.
export const FEATURES = ([
  // stage 3, but too big
  {
    name: 'Decorators',
    flag: 'decorators',
    url: 'https://github.com/tc39/proposal-decorators',
  },
  {
    name: 'Skip bugfix for field initializers in decorator',
    flag: 'decorators.no-bugfix.1',
    url: '',
  },
  // stage 2.7
  {
    name: 'Iterator#join',
    flag: 'iterator.join',
    url: 'https://github.com/tc39/proposal-iterator-join',
  },
  // stage 2
  {
    name: 'FinalizationRegistry#cleanupSome',
    flag: 'cleanup-some',
    url: 'https://github.com/tc39/proposal-cleanup-some',
  },
]) as const satisfies Engine262Feature[];
Object.freeze(FEATURES);
FEATURES.forEach(Object.freeze);
export type Feature = typeof FEATURES[number]['flag'];

class ExecutionContextStack extends Array<ExecutionContext> {
  // This ensures that only the length taking overload is supported.
  // This is necessary to support `ArraySpeciesCreate`, which invokes
  // the constructor with argument `length`:
  constructor(length = 0) {
    super(+length);
  }

  // @ts-expect-error
  override pop(ctx: ExecutionContext) {
    if (!ctx.poppedForTailCall) {
      const popped = super.pop();
      Assert(popped === ctx);
    }
  }
}

let agentSignifier = 0;
export interface HostHooks {
  HostInitializeShadowRealm?(realmRec: Realm, innerContext: ExecutionContext, O: ShadowRealmObject): PlainEvaluator | PlainCompletion<void>;
  HostEnsureCanCompileStrings?(calleeRealm: Realm, parameterStrings: readonly string[], bodyString: string, direct: boolean): PlainEvaluator | PlainCompletion<void>;
}
export interface AgentHostDefined {
  hostHooks?: HostHooks;
  hasSourceTextAvailable?(f: FunctionObject): void;
  ensureCanCompileStrings?(callerRealm: Realm, calleeRealm: Realm): PlainCompletion<void>;
  cleanupFinalizationRegistry?(FinalizationRegistry: FinalizationRegistryObject): PlainCompletion<void>;
  features?: readonly string[];
  supportedImportAttributes?: readonly string[];
  loadImportedModule?(referrer: AbstractModuleRecord | ScriptRecord | Realm, specifier: string, attributes: Map<string, string>, hostDefined: ModuleRecordHostDefined | undefined, finish: (res: PlainCompletion<AbstractModuleRecord>) => void): void;
  onDebugger?(): void;
  onRealmCreated?(realm: ManagedRealm): void;
  onScriptParsed?(script: ScriptRecord | SourceTextModuleRecord | DynamicParsedCodeRecord, scriptId: string): void;
  onNodeEvaluation?(node: ParseNode, realm: Realm): void;

  errorStackAttachNativeStack?: boolean;
}

export interface ResumeEvaluateOptions {
  noBreakpoint?: boolean;
  pauseAt?: 'step-over' | 'step-in' | 'step-out';
  debuggerStatementCompletion?: ValueCompletion;
}
export interface Breakpoint {
  node: ParseNode;
  /** true if continueToLocation, false if regular breakpoint */
  once: boolean;
  /** code to evaluate, pause iff condition evaluates to truthy */
  condition: ParseNode.ScriptBody | undefined;
}

// NON-SPEC, only used in the inspector
export class DynamicParsedCodeRecord {
  constructor(public Realm: Realm, sourceText: string) {
    this.ECMAScriptCode.sourceText = sourceText;
  }

  public HostDefined = {
    scriptId: undefined as string | undefined,
    specifier: undefined,
  };

  public ECMAScriptCode = {
    sourceText: '',
  };
}

/** https://tc39.es/ecma262/#sec-agents */
export class Agent {
  AgentRecord;

  // #execution-context-stack
  executionContextStack = new ExecutionContextStack();

  // NON-SPEC
  readonly jobQueue: Job[] = [];

  scheduledForCleanup = new Set();

  hostDefinedOptions: AgentHostDefined;

  constructor(options: AgentHostDefined = {}) {
    // #table-agent-record
    const Signifier = agentSignifier;
    agentSignifier += 1;
    this.AgentRecord = {
      LittleEndian: Value.true,
      CanBlock: Value.true,
      Signifier,
      IsLockFree1: Value.true,
      IsLockFree2: Value.true,
      CandidateExecution: undefined,
      KeptAlive: new Set<Value>(),
      ModuleAsyncEvaluationCount: 0,
    };

    this.hostDefinedOptions = {
      ...options,
      features: options.features,
    };
  }

  // #running-execution-context
  get runningExecutionContext() {
    return this.executionContextStack[this.executionContextStack.length - 1];
  }

  // #current-realm
  get currentRealmRecord() {
    return this.runningExecutionContext.Realm;
  }

  // #active-function-object
  get activeFunctionObject() {
    return this.runningExecutionContext.Function;
  }

  // Get an intrinsic by name for the current realm
  intrinsic<const T extends keyof Intrinsics>(name: T): Intrinsics[T] {
    return this.currentRealmRecord.Intrinsics[name];
  }

  // Generate a throw completion using message templates
  /** @deprecated Use Throw */
  Throw<K extends keyof typeof messages>(type: ErrorType | Value, template: K, ...templateArgs: Parameters<typeof messages[K]>): ThrowCompletion {
    if (type instanceof Value) {
      return ThrowCompletion(type);
    }
    return Throw(type, template, ...templateArgs);
  }

  queueJob(queueName: string, job: () => void) {
    const callerContext = this.runningExecutionContext;
    const callerRealm = callerContext.Realm;
    const callerScriptOrModule = GetActiveScriptOrModule();
    const pending: Job = {
      queueName,
      job,
      callerRealm,
      callerScriptOrModule,
    };
    this.jobQueue.push(pending);
  }

  // NON-SPEC: Check if a feature is enabled in this agent.
  feature(name: Feature): boolean {
    return !!this.hostDefinedOptions.features?.includes(name);
  }

  // NON-SPEC
  mark(m: GCMarker) {
    this.AgentRecord.KeptAlive.forEach(m);
    this.executionContextStack.forEach(m);
    this.jobQueue.forEach((j) => {
      m(j.callerRealm);
      m(j.callerScriptOrModule);
    });
  }

  // NON-SPEC
  // #region Step-by-step evaluation
  #pausedEvaluator?: ValueEvaluator;

  #onEvaluatorFin?: (completion: NormalCompletion<Value> | ThrowCompletion) => void;

  // NON-SPEC
  /** This function will synchronously return a completion if this is a nested evaluation and debugger cannot be triggered. */
  evaluate<T extends Value>(evaluator: ValueEvaluator<T>, onFinished: (completion: NormalCompletion<T> | ThrowCompletion) => void) {
    if (this.#pausedEvaluator) {
      const result = EnsureCompletion(skipDebugger(evaluator));
      // only the top evaluator can be evaluted step by step.
      onFinished(result);
      return result;
    }
    this.#pausedEvaluator = evaluator;
    this.#onEvaluatorFin = onFinished as (completion: NormalCompletion<Value> | ThrowCompletion) => void;
    return undefined;
  }

  resumeEvaluate(options?: ResumeEvaluateOptions): IteratorResult<void, ValueCompletion> {
    const { noBreakpoint } = options || {};
    if (!this.#pausedEvaluator) {
      throw new Error('No paused evaluator');
    }
    let nextLocation;
    if (options?.pauseAt === 'step-over') {
      nextLocation = this.runningExecutionContext.callSite.nextNode;
    } else if (options?.pauseAt === 'step-out') {
      nextLocation = this.executionContextStack[this.executionContextStack.length - 2].callSite.lastCallNode;
    }
    let debuggerStatementCompletion = options?.debuggerStatementCompletion;
    while (true) {
      const state = this.#pausedEvaluator.next({ type: 'debugger-resume', value: debuggerStatementCompletion });
      debuggerStatementCompletion = undefined;

      if (!noBreakpoint && this.hostDefinedOptions.onDebugger && !this.debugger_isPreviewing && !state.done) {
        if (state.value.type === 'debugger') {
          this.hostDefinedOptions.onDebugger();
          return { done: false, value: undefined };
        } else if (state.value.type === 'potential-debugger') {
          if (options?.pauseAt === 'step-in' && shouldStepOnNode()) {
            this.hostDefinedOptions.onDebugger();
            return { done: false, value: undefined };
          }
          const callSite = surroundingAgent.runningExecutionContext.callSite;
          if (nextLocation && (callSite.lastNode === nextLocation || callSite.lastCallNode === nextLocation)) {
            this.hostDefinedOptions.onDebugger();
            return { done: false, value: undefined };
          }
        }
      }

      if (state.done) {
        this.#pausedEvaluator = undefined;
        this.#onEvaluatorFin!(EnsureCompletion(state.value));
        this.#onEvaluatorFin = undefined;
        return state;
      }
    }
  }
  // #endregion

  // NON-SPEC
  // #region parsed scripts/modules
  #script_id = 0;

  parsedSources = new Map<string, ScriptRecord | SourceTextModuleRecord | DynamicParsedCodeRecord>();

  addParsedSource(source: ScriptRecord | SourceTextModuleRecord) {
    const id = `${this.#script_id}`;
    if (source.HostDefined) {
      source.HostDefined.scriptId = id;
    }
    this.hostDefinedOptions.onScriptParsed?.(source, id);
    this.parsedSources.set(id, source);
    this.#script_id += 1;
  }

  #dynamicParsedSourceIds = new Map<string, string>();

  addDynamicParsedSource(realm: Realm, sourceText: string): string | undefined {
    if (this.debugger_isPreviewing) {
      return undefined;
    }
    if (this.#dynamicParsedSourceIds.has(sourceText)) {
      return this.#dynamicParsedSourceIds.get(sourceText);
    }
    const id = `${this.#script_id}`;
    const source = new DynamicParsedCodeRecord(realm, sourceText);
    source.HostDefined.scriptId = id;
    this.hostDefinedOptions.onScriptParsed?.(source, id);
    this.parsedSources.set(id, source);
    this.#script_id += 1;
    this.#dynamicParsedSourceIds.set(sourceText, id);
    return id;
  }
  // #endregion

  #breakpoints: Set<Breakpoint> = new Set();

  addBreakpoint(breakpoint: Breakpoint) {
    this.#breakpoints.add(breakpoint);
  }

  // #region side-effect free evaluator
  #debugger_previewing = false;

  #debugger_objectsCreatedDuringPreview = new Set<ObjectValue>();

  get debugger_isPreviewing() {
    return this.#debugger_previewing;
  }

  get debugger_cannotPreview() {
    if (this.#debugger_previewing) {
      return ThrowCompletion(X(Construct(this.currentRealmRecord.Intrinsics['%EvalError%'], [Value('Preview evaluator cannot evaluate side-effecting code')])));
    }
    return undefined;
  }

  debugger_tryTouchDuringPreview(object: ObjectValue) {
    if (this.#debugger_previewing && !this.#debugger_objectsCreatedDuringPreview.has(object)) {
      return this.debugger_cannotPreview;
    }
    return undefined;
  }

  debugger_markObjectCreated(object: ObjectValue) {
    if (!this.#debugger_previewing) {
      return;
    }
    this.#debugger_objectsCreatedDuringPreview.add(object);
  }

  debugger_scopePreview(): Disposable | null

  debugger_scopePreview<T>(cb: () => T): T

  debugger_scopePreview<T>(cb?: () => T): T | Disposable | null {
    if (!cb) {
      const old = this.#debugger_previewing;
      this.#debugger_previewing = true;
      return {
        [Symbol.dispose]: () => {
          this.#debugger_previewing = old;
          this.#debugger_objectsCreatedDuringPreview.clear();
        },
      };
    } else {
      const old = this.#debugger_previewing;
      this.#debugger_previewing = true;
      try {
        const res = cb();
        return res;
      } finally {
        this.#debugger_previewing = old;
        if (!old) {
          this.#debugger_objectsCreatedDuringPreview.clear();
        }
      }
    }
  }
  // #endregion
}

// https://tc39.es/ecma262/#sec-IncrementModuleAsyncEvaluationCount
export function IncrementModuleAsyncEvaluationCount() {
  const AR = surroundingAgent.AgentRecord;
  const count = AR.ModuleAsyncEvaluationCount;
  AR.ModuleAsyncEvaluationCount = count + 1;
  return count;
}

export let surroundingAgent: Agent;
export function setSurroundingAgent(a: Agent) {
  surroundingAgent = a;
}

export interface ExecutionContextHostDefined {
  readonly [kInternal]?: ParseScriptHostDefined[typeof kInternal];
  scriptId?: string;
}

/** https://tc39.es/ecma262/#sec-execution-contexts */
export class ExecutionContext {
  codeEvaluationState?: YieldEvaluator;

  Function: NullValue | FunctionObject = Value.null;

  Generator?: GeneratorObject | AsyncGeneratorObject;

  ScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue = Value.null;

  VariableEnvironment!: EnvironmentRecord;

  LexicalEnvironment!: EnvironmentRecord;

  PrivateEnvironment: PrivateEnvironmentRecord | NullValue = Value.null;

  HostDefined?: ExecutionContextHostDefined;

  // NON-SPEC
  callSite = new CallSite(this);

  promiseCapability?: PromiseCapabilityRecord;

  poppedForTailCall = false;

  Realm!: Realm;

  copy() {
    const e = new ExecutionContext();
    e.codeEvaluationState = this.codeEvaluationState;
    e.Function = this.Function;
    e.Realm = this.Realm;
    e.ScriptOrModule = this.ScriptOrModule;
    e.VariableEnvironment = this.VariableEnvironment;
    e.LexicalEnvironment = this.LexicalEnvironment;
    e.PrivateEnvironment = this.PrivateEnvironment;
    e.HostDefined = this.HostDefined;

    e.callSite = this.callSite.clone(e);
    e.promiseCapability = this.promiseCapability;
    return e;
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Function);
    m(this.Realm);
    m(this.ScriptOrModule);
    m(this.VariableEnvironment);
    m(this.LexicalEnvironment);
    m(this.PrivateEnvironment);
    m(this.promiseCapability);
  }
}

/** https://tc39.es/ecma262/#sec-runtime-semantics-scriptevaluation */
export function* ScriptEvaluation(scriptRecord: ScriptRecord): ValueEvaluator {
  const globalEnv = scriptRecord.Realm.GlobalEnv;
  const scriptContext = new ExecutionContext();
  scriptContext.Function = Value.null;
  scriptContext.Realm = scriptRecord.Realm;
  scriptContext.ScriptOrModule = scriptRecord;
  scriptContext.VariableEnvironment = globalEnv;
  scriptContext.LexicalEnvironment = globalEnv;
  scriptContext.PrivateEnvironment = Value.null;
  if (scriptRecord.HostDefined[kInternal]) {
    scriptContext.HostDefined = {
      [kInternal]: scriptRecord.HostDefined[kInternal],
    };
  }
  // Suspend runningExecutionContext
  surroundingAgent.executionContextStack.push(scriptContext);
  const scriptBody = scriptRecord.ECMAScriptCode;
  let result: NormalCompletion<void | Value> | ThrowCompletion = EnsureCompletion(yield* GlobalDeclarationInstantiation(scriptBody, globalEnv));

  if (result.Type === 'normal') {
    result = EnsureCompletion(yield* (Evaluate(scriptBody))) as NormalCompletion<void | Value>;

    if (result.Type === 'normal' && !result.Value) {
      result = NormalCompletion(Value.undefined);
    }
  }

  // Suspend scriptCtx
  surroundingAgent.executionContextStack.pop(scriptContext);
  // Resume(surroundingAgent.runningExecutionContext);

  return result as ValueCompletion;
}

/** https://tc39.es/ecma262/#sec-hostenqueuepromisejob */
export function HostEnqueuePromiseJob(job: () => void, _realm: Realm | NullValue) {
  if (surroundingAgent.debugger_isPreviewing) {
    return;
  }
  surroundingAgent.queueJob('PromiseJobs', job);
}

/** https://tc39.es/ecma262/#sec-agentsignifier */
export function AgentSignifier() {
  // 1. Let AR be the Agent Record of the surrounding agent.
  const AR = surroundingAgent.AgentRecord;
  // 2. Return AR.[[Signifier]].
  return AR.Signifier;
}

export function* HostEnsureCanCompileStrings(calleeRealm: Realm, parameterStrings: readonly string[], bodyString: string, direct: boolean): PlainEvaluator {
  const completion = surroundingAgent.hostDefinedOptions.hostHooks?.HostEnsureCanCompileStrings?.(calleeRealm, parameterStrings, bodyString, direct);
  if (!completion) {
    return NormalCompletion(undefined);
  }
  if ('next' in completion) {
    Q(yield* completion);
  } else {
    Q(completion);
  }
}

export function HostPromiseRejectionTracker(promise: PromiseObject, operation: 'reject' | 'handle') {
  if (surroundingAgent.debugger_isPreviewing) {
    return;
  }
  const realm = surroundingAgent.currentRealmRecord;
  if (realm && realm.HostDefined.promiseRejectionTracker) {
    X(realm.HostDefined.promiseRejectionTracker(promise, operation));
  }
}

export function HostHasSourceTextAvailable(func: FunctionObject) {
  if (surroundingAgent.hostDefinedOptions.hasSourceTextAvailable) {
    return X(surroundingAgent.hostDefinedOptions.hasSourceTextAvailable(func));
  }
  return Value.true;
}

export function HostGetSupportedImportAttributes(): readonly string[] {
  if (surroundingAgent.hostDefinedOptions.supportedImportAttributes) {
    return surroundingAgent.hostDefinedOptions.supportedImportAttributes;
  }
  return [];
}

// #sec-HostLoadImportedModule
export function HostLoadImportedModule(referrer: CyclicModuleRecord | ScriptRecord | Realm, moduleRequest: ModuleRequestRecord, hostDefined: ModuleRecordHostDefined | undefined, payload: GraphLoadingState | PromiseCapabilityRecord) {
  if (surroundingAgent.hostDefinedOptions.loadImportedModule) {
    const executionContext = surroundingAgent.runningExecutionContext;
    let result: PlainCompletion<AbstractModuleRecord> | undefined;
    let sync = true;
    const attributes = new Map(moduleRequest.Attributes.map(({ Key, Value }) => [Key.stringValue(), Value.stringValue()]));
    surroundingAgent.hostDefinedOptions.loadImportedModule(referrer, moduleRequest.Specifier.stringValue(), attributes, hostDefined, (res) => {
      result = res;
      if (!sync) {
        // If this callback has been called asynchronously, restore the correct execution context and enqueue a job.
        surroundingAgent.executionContextStack.push(executionContext);
        surroundingAgent.queueJob('FinishLoadingImportedModule', () => {
          result = EnsureCompletion(result);
          Assert(!!result && (result.Type === 'normal' || result.Type === 'throw'));
          FinishLoadingImportedModule(referrer, moduleRequest, result, payload);
        });
        surroundingAgent.executionContextStack.pop(executionContext);
        runJobQueue();
      }
    });
    sync = false;
    if (result !== undefined) {
      result = EnsureCompletion(result);
      Assert(result.Type === 'normal' || result.Type === 'throw');
      FinishLoadingImportedModule(referrer, moduleRequest, result, payload);
    }
  } else {
    FinishLoadingImportedModule(referrer, moduleRequest, surroundingAgent.Throw('Error', 'CouldNotResolveModule', moduleRequest.Specifier), payload);
  }
}

/** https://tc39.es/ecma262/#sec-hostgetimportmetaproperties */
export function HostGetImportMetaProperties(moduleRecord: AbstractModuleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.getImportMetaProperties) {
    return X(realm.HostDefined.getImportMetaProperties(moduleRecord.HostDefined.public));
  }
  return [];
}

/** https://tc39.es/ecma262/#sec-hostfinalizeimportmeta */
export function HostFinalizeImportMeta(importMeta: ObjectValue, moduleRecord: AbstractModuleRecord) {
  const realm = surroundingAgent.currentRealmRecord;
  if (realm.HostDefined.finalizeImportMeta) {
    return X(realm.HostDefined.finalizeImportMeta(importMeta, moduleRecord.HostDefined.public));
  }
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-host-cleanup-finalization-registry */
export function HostEnqueueFinalizationRegistryCleanupJob(fg: FinalizationRegistryObject): PlainCompletion<void> {
  if (surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry !== undefined) {
    Q(surroundingAgent.hostDefinedOptions.cleanupFinalizationRegistry(fg));
  } else {
    if (!surroundingAgent.scheduledForCleanup.has(fg)) {
      surroundingAgent.scheduledForCleanup.add(fg);
      surroundingAgent.queueJob('FinalizationCleanup', () => {
        surroundingAgent.scheduledForCleanup.delete(fg);
        // TODO: remove skipDebugger
        skipDebugger(CleanupFinalizationRegistry(fg));
      });
    }
  }
  return NormalCompletion(undefined);
}

export interface JobCallbackRecord {
  Callback: FunctionObject & { [kAsyncContext]?: ExecutionContext; };
  HostDefined: undefined;
}
/** https://tc39.es/ecma262/#sec-hostmakejobcallback */
export function HostMakeJobCallback(callback: FunctionObject): JobCallbackRecord {
  // 1. Assert: IsCallable(callback) is true.
  Assert(IsCallable(callback));
  // 2. Return the JobCallback Record { [[Callback]]: callback, [[HostDefined]]: empty }.
  return { Callback: callback, HostDefined: undefined };
}

/** https://tc39.es/ecma262/#sec-hostcalljobcallback */
export function* HostCallJobCallback(jobCallback: JobCallbackRecord, V: Value, argumentsList: Arguments): ValueEvaluator {
  // 1. Assert: IsCallable(jobCallback.[[Callback]]) is true.
  Assert(IsCallable(jobCallback.Callback));
  // 1. Return ? Call(jobCallback.[[Callback]], V, argumentsList).
  return Q(yield* Call(jobCallback.Callback, V, argumentsList));
}
export type GCMarker = (value: unknown) => void;
export interface Markable {
  mark(marker: GCMarker): void;
}
export interface Job {
  readonly queueName: string;
  readonly job: () => void;
  readonly callerRealm: Realm;
  readonly callerScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue;
}
