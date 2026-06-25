import type { ExecutionContextHostDefined, GCMarker } from '../host-defined/engine.mts';
import { EnsureCompletion, type ReturnCompletion, type ValueCompletion } from '../completion.mts';
import { resume } from '../utils/evaluator.mts';
import { __ts_cast__ } from '../utils/language.mts';
import {
  type YieldEvaluator, NullValue, type FunctionObject, Value, type GeneratorObject, type AsyncGeneratorObject, AbstractModuleRecord, type ScriptRecord, EnvironmentRecord, PrivateEnvironmentRecord, CallSite, PromiseCapabilityRecord, Realm,
  surroundingAgent,
  Assert,
  GetIdentifierReference,
  JSStringValue,
  UndefinedValue,
  type EnvironmentRecordWithThisBinding,
  ObjectValue,
  type EvaluatorNextType,
  type YieldOrAwaitEvaluator,
  type PlainCompletion,
} from '#self';

/** https://tc39.es/ecma262/#running-execution-context */
export function runningExecutionContext() {
  return surroundingAgent.executionContextStack.at(-1)!;
}

/** https://tc39.es/ecma262/#current-realm */
export function currentRealmRecord() {
  return surroundingAgent.executionContextStack.at(-1)!.Realm;
}

/** https://tc39.es/ecma262/#active-function-object */
export function activeFunctionObject() {
  return surroundingAgent.executionContextStack.at(-1)!.Function;
}

/** https://tc39.es/ecma262/#sec-execution-contexts */
export class ExecutionContext {
  // Table 20: State Components for All Execution Contexts
  // https://tc39.es/ecma262/#table-state-components-for-all-execution-contexts
  CodeEvaluationState?: YieldOrAwaitEvaluator;

  Function: NullValue | FunctionObject = Value.null;

  ScriptOrModule: AbstractModuleRecord | ScriptRecord | NullValue = Value.null;

  Realm!: Realm;

  // Table 21: Additional State Components for ECMAScript Code Execution Contexts
  // https://tc39.es/ecma262/#table-additional-state-components-for-ecmascript-code-execution-contexts
  LexicalEnvironment!: EnvironmentRecord;

  VariableEnvironment!: EnvironmentRecord;

  PrivateEnvironment: PrivateEnvironmentRecord | null = null;

  // Table 22: Additional State Components for Generator Execution Contexts
  // https://tc39.es/ecma262/#table-additional-state-components-for-generator-execution-contexts
  Generator?: GeneratorObject | AsyncGeneratorObject;

  // NON-SPEC
  HostDefined?: ExecutionContextHostDefined;

  callSite = new CallSite(this);

  promiseCapability?: PromiseCapabilityRecord;

  poppedForTailCall = false;


  copy() {
    const e = new ExecutionContext();
    e.CodeEvaluationState = this.CodeEvaluationState;
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

/** https://tc39.es/ecma262/#sec-getactivescriptormodule */
export function GetActiveScriptOrModule() {
  for (let i = surroundingAgent.executionContextStack.length - 1; i >= 0; i -= 1) {
    const e = surroundingAgent.executionContextStack[i];
    if (e.ScriptOrModule !== Value.null) {
      return e.ScriptOrModule;
    }
  }
  return Value.null;
}

/** https://tc39.es/ecma262/#sec-resolvebinding */
export function ResolveBinding(name: JSStringValue, env?: EnvironmentRecord | UndefinedValue | NullValue, strict?: boolean) {
  // 1. If env is not present or if env is undefined, then
  if (env === undefined || env === Value.undefined) {
    // a. Set env to the running execution context's LexicalEnvironment.
    env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  }
  // 2. Assert: env is an Environment Record.
  Assert(env instanceof EnvironmentRecord);
  // 3. If the code matching the syntactic production that is being evaluated is contained in strict mode code, let strict be true; else let strict be false.
  // 4. Return ? GetIdentifierReference(env, name, strict).
  return GetIdentifierReference(env, name, strict ? Value.true : Value.false);
}

/** https://tc39.es/ecma262/#sec-getthisenvironment */
export function GetThisEnvironment(): EnvironmentRecordWithThisBinding {
  // 1. Let env be the running execution context's LexicalEnvironment.
  let env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 2. Repeat,
  while (true) {
    __ts_cast__<EnvironmentRecord>(env);
    // a. Let exists be env.HasThisBinding().
    const exists = env.HasThisBinding();
    // b. If exists is true, return envRec.
    if (exists === Value.true) {
      return env as EnvironmentRecordWithThisBinding;
    }
    // c. Let outer be env.[[OuterEnv]].
    const outer = env.OuterEnv;
    // d. Assert: outer is not null.
    Assert(outer !== null);
    // e. Set env to outer.
    env = outer;
  }
}

/** https://tc39.es/ecma262/#sec-resolvethisbinding */
export function ResolveThisBinding() {
  const envRec = GetThisEnvironment();
  return envRec.GetThisBinding();
}

/** https://tc39.es/ecma262/#sec-getnewtarget */
export function GetNewTarget(): ObjectValue | UndefinedValue {
  const envRec = GetThisEnvironment();
  Assert('NewTarget' in envRec);
  return envRec.NewTarget;
}

/** https://tc39.es/ecma262/#sec-getglobalobject */
export function GetGlobalObject() {
  const currentRealm = surroundingAgent.currentRealmRecord;
  return currentRealm.GlobalObject;
}

/** https://tc39.es/ecma262/#sec-runsuspendedcontext */
// _resumeType is for assertion.
export function RunSuspendedContext(context: ExecutionContext, completionRecord: ValueCompletion | PlainCompletion<void>, _resumeType: 'await-resume'): YieldOrAwaitEvaluator;
export function RunSuspendedContext(context: ExecutionContext, completionRecord: ValueCompletion | ReturnCompletion, _resumeType: 'generator-resume' | 'async-generator-resume'): YieldEvaluator;
export function* RunSuspendedContext(
  context: ExecutionContext,
  completionRecord: ValueCompletion | PlainCompletion<void> | ReturnCompletion,
  _resumeType: Exclude<EvaluatorNextType['type'], 'debugger-resume'>,
): YieldOrAwaitEvaluator {
  const callerContext = surroundingAgent.runningExecutionContext;
  surroundingAgent.executionContextStack.push(context);
  const result = EnsureCompletion(yield* resume(context, { type: _resumeType, value: completionRecord } as EvaluatorNextType));
  Assert(surroundingAgent.runningExecutionContext === callerContext);
  return result;
}
