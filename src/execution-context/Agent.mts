import type { Protocol } from 'devtools-protocol';
import { shouldStepOnNode } from '../host-defined/debugger-util.mts';
import {
} from '../host-defined/engine.mts';
import * as messages from '../messages.mts';
import { isArray } from '../helpers.mts';
import {
  ObjectValue, SymbolValue, type Job, type Intrinsics, type ErrorType, Value, ThrowCompletion, Throw, GetActiveScriptOrModule, type ValueEvaluator, NormalCompletion, EnsureCompletion, skipDebugger, type ValueCompletion, type ScriptRecord, SourceTextModuleRecord, Realm, X, Construct,
  ExecutionContextStack,
  type AgentHostDefined,
  DynamicParsedCodeRecord,
  surroundingAgent,
  type Feature,
  type GCMarker,
  type ResumeEvaluateOptions,
  type ParseNode,
  getBreakpointCandidates,
} from '#self';

let agentSignifier = 0;

/** https://tc39.es/ecma262/#table-agent-record */
export interface AgentRecord {
  readonly LittleEndian: boolean;
  CanBlock: boolean;
  readonly Signifier: number;
  readonly IsLockFree1: boolean;
  readonly IsLockFree2: boolean;
  readonly IsLockFree8: boolean;
  // unsupported
  CandidateExecution: never;
  KeptAlive: Set<ObjectValue | SymbolValue>;
  ModuleAsyncEvaluationCount: number;
}

/** https://tc39.es/ecma262/#sec-agents */
export class Agent {
  readonly AgentRecord: AgentRecord;

  executionContextStack = new ExecutionContextStack();

  // NON-SPEC
  readonly jobQueue: Job[] = [];

  scheduledForCleanup = new Set();

  hostDefinedOptions: AgentHostDefined;

  constructor(options: AgentHostDefined = {}) {
    const Signifier = agentSignifier;
    agentSignifier += 1;
    this.AgentRecord = {
      LittleEndian: true,
      CanBlock: true,
      Signifier,
      IsLockFree1: true,
      IsLockFree2: true,
      IsLockFree8: true,
      CandidateExecution: undefined!,
      KeptAlive: new Set(),
      ModuleAsyncEvaluationCount: 0,
    };

    this.hostDefinedOptions = {
      ...options,
      features: options.features,
    };
  }

  /** https://tc39.es/ecma262/#running-execution-context */
  get runningExecutionContext() {
    return this.executionContextStack[this.executionContextStack.length - 1];
  }

  /** https://tc39.es/ecma262/#current-realm */
  get currentRealmRecord() {
    return this.runningExecutionContext.Realm;
  }

  /** https://tc39.es/ecma262/#active-function-object */
  get activeFunctionObject() {
    return this.runningExecutionContext.Function;
  }

  intrinsic<const T extends keyof Intrinsics>(name: T): Intrinsics[T] {
    return this.currentRealmRecord.Intrinsics[name];
  }

  // Generate a throw completion using message templates
  /** @deprecated Use Throw */
  Throw<K extends keyof typeof messages>(type: ErrorType | Value, template: K, ...templateArgs: Parameters<(typeof messages)[K]>): ThrowCompletion {
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

  addDynamicParsedSource(realm: Realm, sourceText: string, ast?: unknown[] | ParseNode.Expression | ParseNode.Script): string | undefined {
    if (this.debugger_isPreviewing) {
      return undefined;
    }
    if (this.#dynamicParsedSourceIds.has(sourceText)) {
      return this.#dynamicParsedSourceIds.get(sourceText);
    }
    const id = `${this.#script_id}`;
    const source = new DynamicParsedCodeRecord(realm, !ast || isArray(ast) ? sourceText : ast);
    source.HostDefined.scriptId = id;
    this.hostDefinedOptions.onScriptParsed?.(source, id);
    this.parsedSources.set(id, source);
    this.#script_id += 1;
    this.#dynamicParsedSourceIds.set(sourceText, id);
    return id;
  }

  // #endregion

  // #region breakpoint
  breakpointsEnabled = false;

  pauseOnExceptions: undefined | 'caught' | 'uncaught' | 'all';

  #breakpointId = 0;

  #breakpoints = new Map<string, Breakpoint>();

  addBreakpointByUrl(breakpoint: Protocol.Debugger.SetBreakpointByUrlRequest): Protocol.Debugger.SetBreakpointByUrlResponse {
    this.#breakpointId += 1;
    let scriptId;
    if (breakpoint.url) {
      for (const [id, script] of this.parsedSources) {
        if (script.HostDefined?.specifier === breakpoint.url) {
          scriptId = id;
          break;
        }
      }
    }
    if (!scriptId) {
      return { breakpointId: this.#breakpointId.toString(), locations: [] };
    }
    return {
      breakpointId: this.#breakpointId.toString(),
      locations: [getBreakpointCandidates({ scriptId, lineNumber: breakpoint.lineNumber, columnNumber: breakpoint.columnNumber })[0]],
    };
  }

  removeBreakpoint(breakpointId: string) {
    this.#breakpoints.delete(breakpointId);
  }
  // #endregion

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

  debugger_scopePreview(): Disposable | null;

  debugger_scopePreview<T>(cb: () => T): T;

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

interface Breakpoint {
  _: never;
}

/** https://tc39.es/ecma262/#sec-agentsignifier */
export function AgentSignifier() {
  // 1. Let AR be the Agent Record of the surrounding agent.
  const AR = surroundingAgent.AgentRecord;
  // 2. Return AR.[[Signifier]].
  return AR.Signifier;
}

/** https://tc39.es/ecma262/#sec-agentcansuspend */
export function AgentCanSuspend() {
  const AR = surroundingAgent.AgentRecord;
  return AR.CanBlock;
}

// https://tc39.es/ecma262/#sec-IncrementModuleAsyncEvaluationCount
export function IncrementModuleAsyncEvaluationCount() {
  const AR = surroundingAgent.AgentRecord;
  const count = AR.ModuleAsyncEvaluationCount;
  AR.ModuleAsyncEvaluationCount = count + 1;
  return count;
}
