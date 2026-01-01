import {
  ContainsArguments,
  DeclarativeEnvironmentRecord,
  DynamicParsedCodeRecord,
  EnsureCompletion,
  EnvironmentRecord,
  EvalDeclarationInstantiation,
  Evaluate,
  ExecutionContext,
  FunctionEnvironmentRecord, GetThisEnvironment, IsStrict, ManagedRealm, NormalCompletion, Q, surroundingAgent, ThrowCompletion, Value, wrappedParse, type PlainCompletion, type ValueEvaluator,
} from '#self';

const cascadeStack = new WeakMap<EnvironmentRecord, EnvironmentRecord>();
// This is modified based on PerformEval, used internally for devtools console.
export function* performDevtoolsEval(source: string, evalRealm: ManagedRealm, strictCaller: boolean, doNotTrack: boolean): ValueEvaluator {
  let inFunction = false;
  let inMethod = false;
  let inDerivedConstructor = false;
  let inClassFieldInitializer = false;
  let scriptContext;
  if (!surroundingAgent.runningExecutionContext?.LexicalEnvironment) {
    // top level devtools eval
    const globalEnv = evalRealm.GlobalEnv;
    scriptContext = new ExecutionContext();
    scriptContext.Function = Value.null;
    scriptContext.Realm = evalRealm;
    // scriptContext.ScriptOrModule = scriptRecord;
    scriptContext.VariableEnvironment = globalEnv;
    if (!cascadeStack.has(globalEnv)) {
      cascadeStack.set(globalEnv, new DeclarativeEnvironmentRecord(globalEnv));
    }
    scriptContext.LexicalEnvironment = cascadeStack.get(evalRealm.GlobalEnv)!;
    scriptContext.PrivateEnvironment = Value.null;
    // scriptContext.HostDefined = scriptRecord.HostDefined;
    surroundingAgent.executionContextStack.push(scriptContext);
  }

  const thisEnv = GetThisEnvironment();
  if (thisEnv instanceof FunctionEnvironmentRecord) {
    const F = thisEnv.FunctionObject;
    inFunction = true;
    inMethod = thisEnv.HasSuperBinding() === Value.true;
    if (F.ConstructorKind === 'derived') {
      inDerivedConstructor = true;
    }
    const classFieldInitializerName = F.ClassFieldInitializerName;
    if (classFieldInitializerName !== undefined) {
      inClassFieldInitializer = true;
    }
  }
  const script = wrappedParse({ source, allowAllPrivateNames: true }, (parser) => parser.scope.with({
    strict: strictCaller,
    newTarget: inFunction,
    superProperty: inMethod,
    superCall: inDerivedConstructor,
    private: true,
  }, () => parser.parseScript()));
  if (Array.isArray(script)) {
    if (scriptContext) {
      surroundingAgent.executionContextStack.pop(scriptContext);
    }
    return ThrowCompletion(script[0]);
  }
  if (!script.ScriptBody) {
    if (scriptContext) {
      surroundingAgent.executionContextStack.pop(scriptContext);
    }
    return Value.undefined;
  }

  const body = script.ScriptBody;
  if (inClassFieldInitializer && ContainsArguments(body)) {
    return surroundingAgent.Throw('SyntaxError', 'UnexpectedToken');
  }

  const scriptId = doNotTrack ? undefined : surroundingAgent.addDynamicParsedSource(surroundingAgent.currentRealmRecord, source, script);
  if (!doNotTrack) {
    (surroundingAgent.parsedSources.get(scriptId!) as DynamicParsedCodeRecord).HostDefined.isInspectorEval = true;
    if (scriptContext) {
      scriptContext.HostDefined ??= {};
      scriptContext.HostDefined.scriptId = scriptId;
    }
  }

  let strictEval;
  if (strictCaller === true) {
    strictEval = true;
  } else {
    strictEval = IsStrict(script);
  }
  const runningContext = surroundingAgent.runningExecutionContext;
  let parentLexicalEnvironment;
  if (cascadeStack.has(runningContext.LexicalEnvironment)) {
    parentLexicalEnvironment = cascadeStack.get(runningContext.LexicalEnvironment)!;
  } else {
    parentLexicalEnvironment = runningContext.LexicalEnvironment;
  }
  const lexEnv = new DeclarativeEnvironmentRecord(parentLexicalEnvironment);
  cascadeStack.set(runningContext.LexicalEnvironment, lexEnv);
  let varEnv;
  const privateEnv = runningContext.PrivateEnvironment;
  varEnv = runningContext.VariableEnvironment;
  if (strictEval === true) {
    varEnv = lexEnv;
  }
  const evalContext = new ExecutionContext();
  evalContext.HostDefined ??= {};
  evalContext.HostDefined.scriptId = scriptId;
  evalContext.Function = Value.null;
  evalContext.Realm = evalRealm;
  evalContext.ScriptOrModule = runningContext.ScriptOrModule;
  evalContext.VariableEnvironment = varEnv;
  evalContext.LexicalEnvironment = lexEnv;
  evalContext.PrivateEnvironment = privateEnv;
  surroundingAgent.executionContextStack.push(evalContext);
  let result: PlainCompletion<void | Value> = EnsureCompletion(yield* EvalDeclarationInstantiation(body, varEnv, lexEnv, privateEnv, strictEval));
  if (result.Type === 'normal') {
    result = EnsureCompletion(yield* Evaluate(body));
  }
  if (result.Type === 'normal' && result.Value === undefined) {
    result = NormalCompletion(Value.undefined);
  }
  surroundingAgent.executionContextStack.pop(evalContext);
  if (scriptContext) {
    surroundingAgent.executionContextStack.pop(scriptContext);
  }
  return Q(result)!;
}
