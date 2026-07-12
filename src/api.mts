import { ObjectValue, Value, type PropertyKeyValue } from './value.mts';
import type { GCTrace } from './gc.mts';
import {
  ScriptEvaluation,
} from './host-defined/engine.mts';
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
  CyclicModuleRecord, SyntheticModuleRecord, type ModuleRecordHostDefined, type ModuleRecordHostDefinedPublic,
} from './modules.mts';
import type { PromiseObject } from './intrinsics/Promise.mts';
import type { ParseNode } from './parser/ParseNode.mts';
import type { ModuleCache } from './utils/module.mts';
import {
  surroundingAgent,
  CreateIntrinsics,
  SetDefaultGlobalBindings,
  OrdinaryObjectCreate,
  Assert,
  CreateTextModule,
  PerformPromiseThen,
  CreateBuiltinFunction,
  AllocateArrayBuffer,
  skipDebugger,
  CreateBytesModule,
  ValueOfNormalCompletion,
  type ResumeEvaluateOptions,
  Realm,
  GlobalEnvironmentRecord, type Intrinsics,
} from '#self';

export interface ManagedRealmHostDefined {
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

  override mark(trace: GCTrace): void {
    super.mark(trace);
    trace.strong('topContext', this.topContext, 'internal-slot');
  }

  /**
   * Push this realm's top context (if it is not currently) as the running execution context.
   *
   * Callers must ensure to call the return value after the work is done.
   */
  pushTopContext(): (() => void) | undefined {
    if (surroundingAgent.runningExecutionContext !== this.topContext) {
      surroundingAgent.executionContextStack.push(this.topContext);
      return () => surroundingAgent.executionContextStack.pop(this.topContext);
    }
    return undefined;
  }

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

    surroundingAgent.registerRealm(this);
    surroundingAgent.hostDefinedOptions.onRealmCreated?.(this);
  }

  compileScript(sourceText: string, hostDefined?: ParseScriptHostDefined): PlainCompletion<ScriptRecord> {
    const pop = this.pushTopContext();
    const s = ParseScript(sourceText, this, hostDefined);
    pop?.();
    if (Array.isArray(s)) {
      return ThrowCompletion(s[0]);
    }
    return NormalCompletion(s);
  }

  compileModule(sourceText: string, hostDefined?: ModuleRecordHostDefined) {
    const pop = this.pushTopContext();
    const s = ParseModule(sourceText, this, hostDefined);
    pop?.();
    if (Array.isArray(s)) {
      return ThrowCompletion(s[0]);
    }
    return NormalCompletion(s);
  }

  /**
   * Evaluate a script.
   * @param callback will be called after the evaluation is finished. callback may be called synchronously.
   * When the callback is called, any execution context pushed for the evaluation will have been popped. (safe to run `runJobQueue`).
   */
  evaluateScript(
    sourceText: string | ScriptRecord,
    scriptOptions: ParseScriptHostDefined = {},
    callback: (completion: NormalCompletion<Value> | ThrowCompletion) => void,
    evaluationOptions?: ResumeEvaluateOptions | false,
  ): void {
    if (typeof sourceText === 'string') {
      const completion = this.compileScript(sourceText, scriptOptions);
      if (completion instanceof ThrowCompletion) {
        callback(completion);
        return;
      }
      sourceText = ValueOfNormalCompletion(completion);
    }
    if (!sourceText) throw new TypeError('sourceText is null or undefined');
    surroundingAgent.evaluate(ScriptEvaluation(sourceText), callback, evaluationOptions);
  }

  /**
   * Evaluate a script (skip the debugger).
   */
  evaluateScriptSkipDebugger(sourceText: string | ScriptRecord, scriptOptions: ParseScriptHostDefined = {}): ValueCompletion {
    let completion;
    this.evaluateScript(sourceText, scriptOptions, (c) => {
      completion = c;
    }, { noBreakpoint: true });
    if (!completion) throw new Assert.Error('Expect evaluation completes synchronously');
    return completion;
  }

  /**
   * Evaluate a module.
   * @param callback will be called after the evaluation is finished. callback may be called synchronously.
   * callback will be called **with or without an execution context**.
   */
  evaluateModule<T extends CyclicModuleRecord>(sourceText: string | T, specifier: string | undefined, finish: (completion: ValueCompletion<PromiseObject>) => void) {
    if (sourceText === undefined || sourceText === null) throw new TypeError('sourceText must be a string or a ModuleRecord');
    const moduleCompletion = typeof sourceText === 'string' ? this.compileModule(sourceText, { specifier }) : sourceText;

    if (this.HostDefined.resolverCache && typeof specifier === 'string') {
      const key = this.HostDefined.resolverCache.toCacheKey({ Specifier: specifier, Attributes: [] });
      this.HostDefined.resolverCache.set(key, moduleCompletion);
    }

    if (moduleCompletion instanceof ThrowCompletion) {
      finish(moduleCompletion);
      return;
    }
    const module = X(moduleCompletion);

    const pop = this.pushTopContext();
    PerformPromiseThen(module.LoadRequestedModules(), CreateBuiltinFunction.from({
      steps: function* linkAndEvaluate() {
        const link = module.Link();
        if (link instanceof ThrowCompletion) {
          finish(link);
          return Value.undefined;
        }
        finish(yield* module.Evaluate());
        return Value.undefined;
      },
      captures: () => ({ module }),
    }), CreateBuiltinFunction.from({
      steps: (err = Value.undefined) => {
        finish(ThrowCompletion(err));
      },
      captures: null,
    }));
    pop?.();
    surroundingAgent.eventLoop.runOnce();
  }

  createJSONModule(sourceText: string): PlainCompletion<SyntheticModuleRecord> {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const pop = this.pushTopContext();
    const module = ParseJSONModule(Value(sourceText));
    pop?.();
    return module;
  }

  createTextModule(sourceText: string): PlainCompletion<SyntheticModuleRecord> {
    if (typeof sourceText !== 'string') {
      throw new TypeError('sourceText must be a string');
    }
    const pop = this.pushTopContext();
    const module = CreateTextModule(Value(sourceText));
    pop?.();
    return module;
  }

  createBytesModule(content: Uint8Array): PlainCompletion<SyntheticModuleRecord> {
    if (!(content instanceof Uint8Array)) {
      throw new TypeError('content must be a Uint8Array');
    }
    const pop = this.pushTopContext();
    const arrayBuffer = Q(skipDebugger(AllocateArrayBuffer(surroundingAgent.intrinsic('%ArrayBuffer%'), content.buffer.byteLength)));
    const module = CreateBytesModule(arrayBuffer);
    pop?.();
    return module;
  }
}
