import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  Assert,
  CreateListIteratorRecord,
  CreateMappedArgumentsObject,
  CreateUnmappedArgumentsObject,
} from '../abstract-ops/all.mjs';
import {
  BoundNames,
  IsConstantDeclaration,
  IsSimpleParameterList,
  ContainsExpression,
  VarDeclaredNames,
  VarScopedDeclarations,
  LexicallyDeclaredNames,
  LexicallyScopedDeclarations,
} from '../static-semantics/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Q, X, NormalCompletion } from '../completion.mjs';
import { ValueSet } from '../helpers.mjs';
import {
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
  const parameterNames = BoundNames(formals);
  // 6. If parameterNames has any duplicate entries, let hasDuplicates be true. Otherwise, let hasDuplicates be false.
  const hasDuplicates = new ValueSet(parameterNames).size !== parameterNames.length;
  // 7. Let simpleParameterList be IsSimpleParameterList of formals.
  const simpleParameterList = IsSimpleParameterList(formals);
  // 8. Let hasParameterExpressions be ContainsExpression of formals.
  const hasParameterExpressions = ContainsExpression(formals);
  // 9. Let varNames be the VarDeclaredNames of code.
  const varNames = VarDeclaredNames(code);
  // 10. Let varDeclarations be the VarScopedDeclarations of code.
  const varDeclarations = VarScopedDeclarations(code);
  // 11. Let lexicalNames be the LexicallyDeclaredNames of code.
  const lexicalNames = new ValueSet(LexicallyDeclaredNames(code));
  // 12. Let functionNames be a new empty List.
  const functionNames = new ValueSet();
  // 13. Let functionNames be a new empty List.
  const functionsToInitialize = [];
  // 14. For each d in varDeclarations, in reverse list order, do
  for (const d of [...varDeclarations].reverse()) {
    // a. If d is neither a VariableDeclaration nor a ForBinding nor a BindingIdentifier, then
    if (d.type !== 'VariableDeclaration'
        && d.type !== 'ForBinding'
        && d.type !== 'BindingIdentifier') {
      // i. Assert: d is either a FunctionDeclaration, a GeneratorDeclaration, an AsyncFunctionDeclaration, or an AsyncGeneratorDeclaration.
      Assert(d.type === 'FunctionDeclaration'
             || d.type === 'GeneratorDeclaration'
             || d.type === 'AsyncFunctionDeclaration'
             || d.type === 'AsyncGeneratorDeclaration');
      // ii. Let fn be the sole element of the BoundNames of d.
      const fn = BoundNames(d)[0];
      // iii. If fn is not an element of functionNames, then
      if (!functionNames.has(fn)) {
        // 1. Insert fn as the first element of functionNames.
        functionNames.add(fn);
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
  } else if (new ValueSet(parameterNames).has(new Value('arguments'))) {
    // a. Set argumentsObjectNeeded to false.
    argumentsObjectNeeded = false;
  } else if (hasParameterExpressions === false) {
    // a. If "arguments" is an element of functionNames or if "arguments" is an element of lexicalNames, then
    if (functionNames.has(new Value('arguments')) || lexicalNames.has(new Value('arguments'))) {
      // i. Set argumentsObjectNeeded to false.
      argumentsObjectNeeded = false;
    }
  }
  let env;
  // 19. If strict is true or if hasParameterExpressions is false, then
  if (strict || hasParameterExpressions === false) {
    // a. NOTE: Only a single lexical environment is needed for the parameters and top-level vars.
    // b. Let env be the LexicalEnvironment of calleeContext.
    env = calleeContext.LexicalEnvironment;
  } else {
    // a. NOTE: A separate Environment Record is needed to ensure that bindings created by direct eval
    //    calls in the formal parameter list are outside the environment where parameters are declared.
    // b. Let calleeEnv be the LexicalEnvironment of calleeContext.
    const calleeEnv = calleeContext.LexicalEnvironment;
    // c. Let env be NewDeclarativeEnvironment(calleeEnv).
    env = NewDeclarativeEnvironment(calleeEnv);
    // d. Assert: The VariableEnvironment of calleeContext is calleeEnv.
    Assert(calleeContext.VariableEnvironment === calleeEnv);
    // e. Set the LexicalEnvironment of calleeContext to env.
    calleeContext.LexicalEnvironment = env;
  }
  // 21. For each String paramName in parameterNames, do
  for (const paramName of parameterNames) {
    // a. Let alreadyDeclared be env.HasBinding(paramName).
    const alreadyDeclared = env.HasBinding(paramName);
    // b. NOTE: Early errors ensure that duplicate parameter names can only occur in
    //    non-strict functions that do not have parameter default values or rest parameters.
    // c. If alreadyDeclared is false, then
    if (alreadyDeclared === Value.false) {
      // i. Perform ! env.CreateMutableBinding(paramName, false).
      X(env.CreateMutableBinding(paramName, Value.false));
      // ii. If hasDuplicates is true, then
      if (hasDuplicates === true) {
        // 1. Perform ! env.InitializeBinding(paramName, undefined).
        X(env.InitializeBinding(paramName, Value.undefined));
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
      // ii. Let ao be CreateMappedArgumentsObject(func, formals, argumentsList, env).
      ao = CreateMappedArgumentsObject(func, formals, argumentsList, env);
    }
    // c. If strict is true, then
    if (strict) {
      // i. Perform ! env.CreateImmutableBinding("arguments", false).
      X(env.CreateImmutableBinding(new Value('arguments'), Value.false));
    } else {
      // i. Perform ! env.CreateMutableBinding("arguments", false).
      X(env.CreateMutableBinding(new Value('arguments'), Value.false));
    }
    // e. Call env.InitializeBinding("arguments", ao).
    env.InitializeBinding(new Value('arguments'), ao);
    // f. Let parameterBindings be a new List of parameterNames with "arguments" appended.
    parameterBindings = new ValueSet([...parameterNames, new Value('arguments')]);
  } else {
    // a. Let parameterBindings be parameterNames.
    parameterBindings = new ValueSet(parameterNames);
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
  // 27. If hasParameterExpressions is false, then
  if (hasParameterExpressions === false) {
    // a. NOTE: Only a single lexical environment is needed for the parameters and top-level vars.
    // b. Let instantiatedVarNames be a copy of the List parameterBindings.
    const instantiatedVarNames = new ValueSet(parameterBindings);
    // c. For each n in varNames, do
    for (const n of varNames) {
      // i. If n is not an element of instantiatedVarNames, then
      if (!instantiatedVarNames.has(n)) {
        // 1. Append n to instantiatedVarNames.
        instantiatedVarNames.add(n);
        // 2. Perform ! env.CreateMutableBinding(n, false).
        X(env.CreateMutableBinding(n, Value.false));
        // 3. Call env.InitializeBinding(n, undefined).
        env.InitializeBinding(n, Value.undefined);
      }
    }
    // d. Let varEnv be env.
    varEnv = env;
  } else {
    // a. NOTE: A separate Environment Record is needed to ensure that closures created by expressions
    //    in the formal parameter list do not have visibility of declarations in the function body.
    // b. Let varEnv be NewDeclarativeEnvironment(env).
    varEnv = NewDeclarativeEnvironment(env);
    // c. Set the VariableEnvironment of calleeContext to varEnv.
    calleeContext.VariableEnvironment = varEnv;
    // d. Let instantiatedVarNames be a new empty List.
    const instantiatedVarNames = new ValueSet();
    // e. For each n in varNames, do
    for (const n of varNames) {
      // If n is not an element of instantiatedVarNames, then
      if (!instantiatedVarNames.has(n)) {
        // 1. Append n to instantiatedVarNames.
        instantiatedVarNames.add(n);
        // 2. Perform ! varEnv.CreateMutableBinding(n, false).
        X(varEnv.CreateMutableBinding(n, Value.false));
        let initialValue;
        // 3. If n is not an element of parameterBindings or if n is an element of functionNames, let initialValue be undefined.
        if (!parameterBindings.has(n) || functionNames.has(n)) {
          initialValue = Value.undefined;
        } else {
          // a. Let initialValue be ! env.GetBindingValue(n, false).
          initialValue = X(env.GetBindingValue(n, Value.false));
        }
        // 5. Call varEnv.InitializeBinding(n, initialValue).
        varEnv.InitializeBinding(n, initialValue);
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
  // 32. Set the LexicalEnvironment of calleeContext to lexEnv.
  calleeContext.LexicalEnvironment = lexEnv;
  // 33. Let lexDeclarations be the LexicallyScopedDeclarations of code.
  const lexDeclarations = LexicallyScopedDeclarations(code);
  // 34. For each element d in lexDeclarations, do
  for (const d of lexDeclarations) {
    // a. NOTE: A lexically declared name cannot be the same as a function/generator declaration, formal
    //    parameter, or a var name. Lexically declared names are only instantiated here but not initialized.
    // b. For each element dn of the BoundNames of d, do
    for (const dn of BoundNames(d)) {
      // i. If IsConstantDeclaration of d is true, then
      if (IsConstantDeclaration(d)) {
        // 1. Perform ! lexEnv.CreateImmutableBinding(dn, true).
        X(lexEnv.CreateImmutableBinding(dn, Value.true));
      } else {
        // 1. Perform ! lexEnv.CreateMutableBinding(dn, false).
        X(lexEnv.CreateMutableBinding(dn, Value.false));
      }
    }
  }
  // 35. Let privateEnv be the PrivateEnvironment of calleeContext.
  const privateEnv = calleeContext.PrivateEnvironment;
  // 36. For each Parse Node f in functionsToInitialize, do
  for (const f of functionsToInitialize) {
    // a. Let fn be the sole element of the BoundNames of f.
    const fn = BoundNames(f)[0];
    // b. Let fo be InstantiateFunctionObject of f with argument lexEnv and privateEnv.
    const fo = InstantiateFunctionObject(f, lexEnv, privateEnv);
    // c. Perform ! varEnv.SetMutableBinding(fn, fo, false).
    X(varEnv.SetMutableBinding(fn, fo, Value.false));
  }
  // 37. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
