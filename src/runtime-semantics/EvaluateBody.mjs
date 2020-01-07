import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  AsyncFunctionStart,
  Call,
  CreateListIteratorRecord,
  CreateMappedArgumentsObject,
  CreateUnmappedArgumentsObject,
  GeneratorStart,
  NewPromiseCapability,
  OrdinaryCreateFromConstructor,
  AsyncGeneratorStart,
} from '../abstract-ops/all.mjs';
import {
  isArrowFunction,
  isAsyncArrowFunction,
  isAsyncFunctionDeclaration,
  isAsyncFunctionExpression,
  isAsyncGeneratorDeclaration,
  isAsyncGeneratorExpression,
  isBindingIdentifier,
  isForBinding,
  isFunctionDeclaration,
  isFunctionExpression,
  isGeneratorDeclaration,
  isGeneratorExpression,
  isVariableDeclaration,
} from '../ast.mjs';
import {
  BoundNames_Declaration,
  BoundNames_FormalParameters,
  BoundNames_FunctionDeclaration,
  ContainsExpression_FormalParameters,
  IsConstantDeclaration,
  IsSimpleParameterList_FormalParameters,
  LexicallyDeclaredNames_AsyncFunctionBody,
  LexicallyDeclaredNames_ConciseBody,
  LexicallyDeclaredNames_FunctionBody,
  LexicallyDeclaredNames_GeneratorBody,
  LexicallyScopedDeclarations_AsyncFunctionBody,
  LexicallyScopedDeclarations_ConciseBody,
  LexicallyScopedDeclarations_FunctionBody,
  LexicallyScopedDeclarations_GeneratorBody,
  VarDeclaredNames_AsyncFunctionBody,
  VarDeclaredNames_ConciseBody,
  VarDeclaredNames_FunctionBody,
  VarDeclaredNames_GeneratorBody,
  VarScopedDeclarations_AsyncFunctionBody,
  VarScopedDeclarations_ConciseBody,
  VarScopedDeclarations_FunctionBody,
  VarScopedDeclarations_GeneratorBody,
} from '../static-semantics/all.mjs';
import {
  AbruptCompletion,
  Completion,
  NormalCompletion,
  Q,
  ReturnCompletion, X,
} from '../completion.mjs';
import {
  NewDeclarativeEnvironment,
} from '../environment.mjs';
import { OutOfRange } from '../helpers.mjs';
import { Value } from '../value.mjs';
import {
  Evaluate_ExpressionBody,
  Evaluate_FunctionStatementList,
  InstantiateFunctionObject,
  IteratorBindingInitialization_FormalParameters,
} from './all.mjs';

// #sec-functiondeclarationinstantiation
export function* FunctionDeclarationInstantiation(func, argumentsList) {
  // 1. Let calleeContext be the running execution context.
  const calleeContext = surroundingAgent.runningExecutionContext;
  // 2. Let code be func.[[ECMAScriptCode]].
  const code = func.ECMAScriptCode;
  // 3. Let strict be func.[[Strict]].
  const strict = func.Strict;
  // 4. Let formals be func.[[FormalParameters]].
  const formals = func.FormalParameters;
  // 5. Let parameterNames be BoundNames of formals.
  const parameterNames = BoundNames_FormalParameters(formals);
  // 6. If parameterNames has any duplicate entries, let hasDuplicates be true. Otherwise, let hasDuplicates be false.
  const hasDuplicates = parameterNames.some((e) => parameterNames.indexOf(e) !== parameterNames.lastIndexOf(e));
  // 7. Let simpleParameterList be IsSimpleParameterList of formals.
  const simpleParameterList = IsSimpleParameterList_FormalParameters(formals);
  // 8. Let hasParameterExpressions be ContainsExpression of formals.
  const hasParameterExpressions = ContainsExpression_FormalParameters(formals);

  // 9. Let varNames be the VarDeclaredNames of code.
  // 10. Let varDeclarations be the VarScopedDeclarations of code.
  // 11. Let lexicalNames be the LexicallyDeclaredNames of code.
  let varNames;
  let varDeclarations;
  let lexicalNames;

  switch (getFunctionBodyType(code)) {
    case 'FunctionBody':
      varNames = VarDeclaredNames_FunctionBody(code.body.body);
      varDeclarations = VarScopedDeclarations_FunctionBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_FunctionBody(code.body.body);
      break;
    case 'ConciseBody_ExpressionBody':
    case 'ConciseBody_FunctionBody':
    case 'AsyncConciseBody_AsyncFunctionBody':
    case 'AsyncConciseBody_ExpressionBody':
    case 'AsyncGeneratorBody':
      varNames = VarDeclaredNames_ConciseBody(code.body);
      varDeclarations = VarScopedDeclarations_ConciseBody(code.body);
      lexicalNames = LexicallyDeclaredNames_ConciseBody(code.body);
      break;
    case 'GeneratorBody':
      varNames = VarDeclaredNames_GeneratorBody(code.body.body);
      varDeclarations = VarScopedDeclarations_GeneratorBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_GeneratorBody(code.body.body);
      break;
    case 'AsyncFunctionBody':
      varNames = VarDeclaredNames_AsyncFunctionBody(code.body.body);
      varDeclarations = VarScopedDeclarations_AsyncFunctionBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_AsyncFunctionBody(code.body.body);
      break;
    default:
      throw new OutOfRange('FunctionDeclarationInstantiation', code);
  }

  // 12. Let functionNames be a new empty List.
  const functionNames = [];
  // 13. Let functionNames be a new empty List.
  const functionsToInitialize = [];

  // 14. For each d in varDeclarations, in reverse list order, do
  for (const d of [...varDeclarations].reverse()) {
    // a. If d is neither a VariableDeclaration nor a ForBinding nor a BindingIdentifier, then
    if (!isVariableDeclaration(d) && !isForBinding(d) && !isBindingIdentifier(d)) {
      // i. Assert: d is either a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration.
      Assert(isFunctionDeclaration(d) || isGeneratorDeclaration(d)
             || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d));
      // ii. Let fn be the sole element of the BoundNames of d.
      const fn = BoundNames_FunctionDeclaration(d)[0];
      // iii. If fn is not an element of functionNames, then
      if (!functionNames.includes(fn)) {
        // 1. Insert fn as the first element of functionNames.
        functionNames.unshift(fn);
        // 2. NOTE: If there are multiple function declarations for the same name, the last declaration is used.
        // 3. Insert d as the first element of functionsToInitialize.
        functionsToInitialize.unshift(d);
      }
    }
  }

  // 15. Let argumentsObjectNeeded be true.
  let argumentsObjectNeeded = true;
  // If func.[[ThisMode]] is lexical, then
  if (func.ThisMode === 'lexical') {
    // a. NOTE: Arrow functions never have an arguments objects.
    // b. Set argumentsObjectNeeded to false.
    argumentsObjectNeeded = false;
  } else if (parameterNames.includes('arguments')) {
    // a. Set argumentsObjectNeeded to false.
    argumentsObjectNeeded = false;
  } else if (hasParameterExpressions === false) {
    // a. If "arguments" is an element of functionNames or if "arguments" is an element of lexicalNames, then
    if (functionNames.includes('arguments') || lexicalNames.includes('arguments')) {
      // i. Set argumentsObjectNeeded to false.
      argumentsObjectNeeded = false;
    }
  }

  let env;
  let envRec;
  // 19. If strict is true or if hasParameterExpressions is false, then
  if (strict || hasParameterExpressions === false) {
    // a. NOTE: Only a single lexical environment is needed for the parameters and top-level vars.
    // b. Let env be the LexicalEnvironment of calleeContext.
    env = calleeContext.LexicalEnvironment;
    // c. Let envRec be env's EnvironmentRecord.
    envRec = env.EnvironmentRecord;
  } else {
    // a. NOTE: A separate Environment Record is needed to ensure that bindings created by direct eval
    //    calls in the formal parameter list are outside the environment where parameters are declared.
    // b. Let calleeEnv be the LexicalEnvironment of calleeContext.
    const calleeEnv = calleeContext.LexicalEnvironment;
    // c. Let env be NewDeclarativeEnvironment(calleeEnv).
    env = NewDeclarativeEnvironment(calleeEnv);
    // d. Let envRec be env's EnvironmentRecord.
    envRec = env.EnvironmentRecord;
    // e. Assert: The VariableEnvironment of calleeContext is calleeEnv.
    Assert(calleeContext.VariableEnvironment === calleeEnv);
    // f. Set the LexicalEnvironment of calleeContext to env.
    calleeContext.LexicalEnvironment = env;
  }

  // 21. For each String paramName in parameterNames, do
  for (const paramName of parameterNames) {
    // a. Let alreadyDeclared be envRec.HasBinding(paramName).
    const alreadyDeclared = envRec.HasBinding(new Value(paramName));
    // b. NOTE: Early errors ensure that duplicate parameter names can only occur in
    //    non-strict functions that do not have parameter default values or rest parameters.
    // c. If alreadyDeclared is false, then
    if (alreadyDeclared === Value.false) {
      // i. Perform ! envRec.CreateMutableBinding(paramName, false).
      X(envRec.CreateMutableBinding(new Value(paramName), false));
      // ii. If hasDuplicates is true, then
      if (hasDuplicates === true) {
        // 1. Perform ! envRec.InitializeBinding(paramName, undefined).
        X(envRec.InitializeBinding(new Value(paramName), Value.undefined));
      }
    }
  }

  // 22. If argumentsObjectNeeded is true, then
  let parameterBindings;
  if (argumentsObjectNeeded === true) {
    let ao;
    // a. If strict is true or if simpleParameterList is false, then
    if (strict || simpleParameterList === false) {
      // i. Let ao be CreateUnmappedArgumentsObject(argumentsList).
      ao = CreateUnmappedArgumentsObject(argumentsList);
    } else {
      // i. NOTE: mapped argument object is only provided for non-strict functions
      //    that don't have a rest parameter, any parameter default value initializers,
      //    or any destructured parameters.
      // ii. Let ao be CreateMappedArgumentsObject(func, formals, argumentsList, envRec).
      ao = CreateMappedArgumentsObject(func, formals, argumentsList, envRec);
    }
    // c. If strict is true, then
    if (strict) {
      // i. Perform ! envRec.CreateImmutableBinding("arguments", false).
      X(envRec.CreateImmutableBinding(new Value('arguments'), Value.false));
    } else {
      // i. Perform ! envRec.CreateMutableBinding("arguments", false).
      X(envRec.CreateMutableBinding(new Value('arguments'), Value.false));
    }
    // e. Call envRec.InitializeBinding("arguments", ao).
    envRec.InitializeBinding(new Value('arguments'), ao);
    // f. Let parameterBindings be a new List of parameterNames with "arguments" appended.
    parameterBindings = [...parameterNames, 'arguments'];
  } else {
    // a. Let parameterBindings be parameterNames.
    parameterBindings = parameterNames;
  }

  // 24. Let iteratorRecord be CreateListIteratorRecord(argumentsList).
  const iteratorRecord = CreateListIteratorRecord(argumentsList);
  // 25. If hasDuplicates is true, then
  if (hasDuplicates) {
    // a. Perform ? IteratorBindingInitialization for formals with iteratorRecord and undefined as arguments.
    Q(yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, Value.undefined));
  } else {
    // a. Perform ? IteratorBindingInitialization for formals with iteratorRecord and env as arguments.
    Q(yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, env));
  }

  let varEnv;
  let varEnvRec;
  // 27. If hasParameterExpressions is false, then
  if (hasParameterExpressions === false) {
    // a. NOTE: Only a single lexical environment is needed for the parameters and top-level vars.
    // b. Let instantiatedVarNames be a copy of the List parameterBindings.
    const instantiatedVarNames = [...parameterBindings];
    // c. Let instantiatedVarNames be a copy of the List parameterBindings.
    for (const n of varNames) {
      // i. If n is not an element of instantiatedVarNames, then
      if (!instantiatedVarNames.includes(n)) {
        // 1. Append n to instantiatedVarNames.
        instantiatedVarNames.push(n);
        // 2. Perform ! envRec.CreateMutableBinding(n, false).
        X(envRec.CreateMutableBinding(new Value(n), Value.false));
        // 3. Call envRec.InitializeBinding(n, undefined).
        envRec.InitializeBinding(new Value(n), Value.undefined);
      }
    }
    // d. Let varEnv be env.
    varEnv = env;
    // e. Let varEnvRec be envRec.
    varEnvRec = envRec;
  } else {
    // a. NOTE: A separate Environment Record is needed to ensure that closures created by expressions
    //    in the formal parameter list do not have visibility of declarations in the function body.
    // b. Let varEnv be NewDeclarativeEnvironment(env).
    varEnv = NewDeclarativeEnvironment(env);
    // c. Let varEnvRec be varEnv's EnvironmentRecord.
    varEnvRec = varEnv.EnvironmentRecord;
    // d. Set the VariableEnvironment of calleeContext to varEnv.
    calleeContext.VariableEnvironment = varEnv;
    // e. Let instantiatedVarNames be a new empty List.
    const instantiatedVarNames = [];
    // For each n in varNames, do
    for (const n of varNames) {
      // If n is not an element of instantiatedVarNames, then
      if (!instantiatedVarNames.includes(n)) {
        // 1. Append n to instantiatedVarNames.
        instantiatedVarNames.push(n);
        // 2. Perform ! varEnvRec.CreateMutableBinding(n, false).
        X(varEnvRec.CreateMutableBinding(new Value(n), Value.false));
        let initialValue;
        // 3. If n is not an element of parameterBindings or if n is an element of functionNames, let initialValue be undefined.
        if (!parameterBindings.includes(n) || functionNames.includes(n)) {
          initialValue = Value.undefined;
        } else {
          // a. Let initialValue be ! envRec.GetBindingValue(n, false).
          initialValue = X(envRec.GetBindingValue(new Value(n), Value.false));
        }
        // 5. Call varEnvRec.InitializeBinding(n, initialValue).
        varEnvRec.InitializeBinding(new Value(n), initialValue);
        // 6. NOTE: vars whose names are the same as a formal parameter, initially have the same value as the corresponding initialized parameter.
      }
    }
  }

  // 29. NOTE: Annex B.3.3.1 adds additional steps at this point.

  let lexEnv;
  // 30. If strict is false, then
  if (strict === false) {
    // a. Let lexEnv be NewDeclarativeEnvironment(varEnv).
    lexEnv = NewDeclarativeEnvironment(varEnv);
    // b. NOTE: Non-strict functions use a separate lexical Environment Record for top-level lexical declarations
    //    so that a direct eval can determine whether any var scoped declarations introduced by the eval code
    //    conflict with pre-existing top-level lexically scoped declarations. This is not needed for strict functions
    //    because a strict direct eval always places all declarations into a new Environment Record.
  } else {
    // a. Else, let lexEnv be varEnv.
    lexEnv = varEnv;
  }

  // 32. Let lexEnvRec be lexEnv's EnvironmentRecord.
  const lexEnvRec = lexEnv.EnvironmentRecord;
  // 33. Set the LexicalEnvironment of calleeContext to lexEnv.
  calleeContext.LexicalEnvironment = lexEnv;

  // 34. Let lexDeclarations be the LexicallyScopedDeclarations of code.
  let lexDeclarations;
  switch (getFunctionBodyType(code)) {
    case 'FunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_FunctionBody(code.body.body);
      break;
    case 'ConciseBody_ExpressionBody':
    case 'ConciseBody_FunctionBody':
    case 'AsyncConciseBody_ExpressionBody':
    case 'AsyncConciseBody_AsyncFunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_ConciseBody(code.body);
      break;
    case 'GeneratorBody':
      lexDeclarations = LexicallyScopedDeclarations_GeneratorBody(code.body.body);
      break;
    case 'AsyncFunctionBody':
    case 'AsyncGeneratorBody':
      lexDeclarations = LexicallyScopedDeclarations_AsyncFunctionBody(code.body.body);
      break;
    default:
      throw new OutOfRange('FunctionDeclarationInstantiation', code);
  }
  // 35. For each element d in lexDeclarations, do
  for (const d of lexDeclarations) {
    // a. NOTE: A lexically declared name cannot be the same as a function/generator declaration, formal
    //    parameter, or a var name. Lexically declared names are only instantiated here but not initialized.
    // b. For each element dn of the BoundNames of d, do
    for (const dn of BoundNames_Declaration(d)) {
      // i. If IsConstantDeclaration of d is true, then
      if (IsConstantDeclaration(d)) {
        // 1. Perform ! lexEnvRec.CreateImmutableBinding(dn, true).
        X(lexEnvRec.CreateImmutableBinding(new Value(dn), Value.true));
      } else {
        // 1. Perform ! lexEnvRec.CreateMutableBinding(dn, false).
        X(lexEnvRec.CreateMutableBinding(new Value(dn), Value.false));
      }
    }
  }

  // 36. For each Parse Node f in functionsToInitialize, do
  for (const f of functionsToInitialize) {
    // a. Let fn be the sole element of the BoundNames of f.
    const fn = BoundNames_FunctionDeclaration(f)[0];
    // b. Let fo be InstantiateFunctionObject of f with argument lexEnv.
    const fo = InstantiateFunctionObject(f, lexEnv);
    // c. Perform ! varEnvRec.SetMutableBinding(fn, fo, false).
    X(varEnvRec.SetMutableBinding(new Value(fn), fo, Value.false));
  }

  // 37. Return NormalCompletion(empty).
  return new NormalCompletion(undefined);
}

export function getFunctionBodyType(ECMAScriptCode) {
  switch (true) {
    // FunctionBody : FunctionStatementList
    case isFunctionDeclaration(ECMAScriptCode)
      || isFunctionExpression(ECMAScriptCode): // includes MethodDefinitions
      return 'FunctionBody';

    // ConciseBody : `{` FunctionBody `}`
    case isArrowFunction(ECMAScriptCode) && !ECMAScriptCode.expression:
      return 'ConciseBody_FunctionBody';

    // ConciseBody : ExpressionBody
    case isArrowFunction(ECMAScriptCode) && ECMAScriptCode.expression:
      return 'ConciseBody_ExpressionBody';

    // AsyncConciseBody : `{` AsyncFunctionBody `}`
    case isAsyncArrowFunction(ECMAScriptCode) && !ECMAScriptCode.expression:
      return 'AsyncConciseBody_AsyncFunctionBody';

    // AsyncConciseBody : ExpressionBody
    case isAsyncArrowFunction(ECMAScriptCode) && ECMAScriptCode.expression:
      return 'AsyncConciseBody_ExpressionBody';

    // GeneratorBody : FunctionBody
    case isGeneratorDeclaration(ECMAScriptCode)
      || isGeneratorExpression(ECMAScriptCode):
      return 'GeneratorBody';

    // AsyncFunctionBody : FunctionBody
    case isAsyncFunctionDeclaration(ECMAScriptCode)
      || isAsyncFunctionExpression(ECMAScriptCode):
      return 'AsyncFunctionBody';

    case isAsyncGeneratorDeclaration(ECMAScriptCode)
      || isAsyncGeneratorExpression(ECMAScriptCode):
      return 'AsyncGeneratorBody';

    default:
      throw new OutOfRange('getFunctionBodyType', ECMAScriptCode);
  }
}

// 14.2.15 #sec-arrow-function-definitions-runtime-semantics-evaluatebody
// ConciseBody : ExpressionBody
export function* EvaluateBody_ConciseBody_ExpressionBody(ExpressionBody, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  return yield* Evaluate_ExpressionBody(ExpressionBody);
}

// 14.1.18 #sec-function-definitions-runtime-semantics-evaluatebody
// FunctionBody : FunctionStatementList
export function* EvaluateBody_FunctionBody(FunctionStatementList, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  return yield* Evaluate_FunctionStatementList(FunctionStatementList);
}

// 14.4.10 #sec-generator-function-definitions-runtime-semantics-evaluatebody
// GeneratorBody : FunctionBody
export function* EvaluateBody_GeneratorBody(GeneratorBody, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  const G = Q(OrdinaryCreateFromConstructor(functionObject, '%Generator.prototype%', ['GeneratorState', 'GeneratorContext']));
  GeneratorStart(G, GeneratorBody);
  return new ReturnCompletion(G);
}

// 14.7.11 #sec-async-function-definitions-EvaluateBody
// AsyncFunctionBody : FunctionBody
export function* EvaluateBody_AsyncFunctionBody(FunctionBody, functionObject, argumentsList) {
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
  if (!(declResult instanceof AbruptCompletion)) {
    X(AsyncFunctionStart(promiseCapability, FunctionBody));
  } else {
    X(Call(promiseCapability.Reject, Value.undefined, [declResult.Value]));
  }
  return new Completion('return', promiseCapability.Promise, undefined);
}

// 14.8.14 #sec-async-arrow-function-definitions-EvaluateBody
// AsyncConciseBody : ExpressionBody
export function* EvaluateBody_AsyncConciseBody_ExpressionBody(ExpressionBody, functionObject, argumentsList) {
  const promiseCapability = X(NewPromiseCapability(surroundingAgent.intrinsic('%Promise%')));
  const declResult = yield* FunctionDeclarationInstantiation(functionObject, argumentsList);
  if (!(declResult instanceof AbruptCompletion)) {
    X(AsyncFunctionStart(promiseCapability, ExpressionBody));
  } else {
    X(Call(promiseCapability.Reject, Value.undefined, [declResult.Value]));
  }
  return new Completion('return', promiseCapability.Promise, undefined);
}

export function* EvaluateBody_AsyncGeneratorBody(FunctionBody, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  const generator = Q(OrdinaryCreateFromConstructor(functionObject, '%AsyncGenerator.prototype%', [
    'AsyncGeneratorState',
    'AsyncGeneratorContext',
    'AsyncGeneratorQueue',
  ]));
  X(AsyncGeneratorStart(generator, FunctionBody));
  return new Completion('return', generator, undefined);
}
