import { Value } from '../value.mts';
import {
  EnsureCompletion,
  NormalCompletion,
  ThrowCompletion,
  Q, X,
  type PlainCompletion,
} from '../completion.mts';
import { GlobalDeclarationInstantiation } from '../runtime-semantics/all.mts';
import {
  Evaluate, type PlainEvaluator, type ValueEvaluator,
} from '../evaluator.mts';
import { kInternal } from '../helpers.mts';
import {
  AbstractModuleRecord, CyclicModuleRecord, ObjectValue, runJobQueue, type ValueCompletion, type ModuleRecordHostDefined, type ParseScriptHostDefined, type ScriptRecord,
  ManagedRealm,
  SourceTextModuleRecord,
  type ModuleRequestRecord,
  Realm,
} from '../index.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { PromiseObject } from '../intrinsics/Promise.mts';
import type { FinalizationRegistryObject } from '../intrinsics/FinalizationRegistry.mts';
import type { ShadowRealmObject } from '../intrinsics/ShadowRealm.mts';
import { ExecutionContext } from '../execution-context/ExecutionContext.mts';
import type { Agent } from '../execution-context/Agent.mts';
import {
  Assert,
  FinishLoadingImportedModule,
  type FunctionObject,
  GraphLoadingState,
  PromiseCapabilityRecord,
} from '#self';

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
  {
    name: 'Promise#allKeyed',
    flag: 'promise.allkeyed',
    url: 'https://github.com/tc39/proposal-await-dictionary',
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

export class ExecutionContextStack extends Array<ExecutionContext> {
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

// NON-SPEC, only used in the inspector
export class DynamicParsedCodeRecord {
  constructor(public Realm: Realm, sourceText: string | ParseNode.Script | ParseNode.Expression) {
    this.ECMAScriptCode = typeof sourceText === 'string' ? { sourceText } : sourceText;
  }

  public HostDefined = {
    scriptId: undefined as string | undefined,
    specifier: undefined,
    isInspectorEval: false,
  };

  public ECMAScriptCode: { sourceText: string } | ParseNode.Script | ParseNode.Expression;
}

export let surroundingAgent: Agent;
export function setSurroundingAgent(a: Agent) {
  surroundingAgent = a;
}

export interface ExecutionContextHostDefined {
  readonly [kInternal]?: ParseScriptHostDefined[typeof kInternal];
  scriptId?: string;
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

export type GCMarker = (value: unknown) => void;
export interface Markable {
  mark(marker: GCMarker): void;
}
