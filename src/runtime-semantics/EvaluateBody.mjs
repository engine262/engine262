import { surroundingAgent } from '../engine.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  Assert,
  CreateListIteratorRecord,
  CreateMappedArgumentsObject,
  CreateUnmappedArgumentsObject,
  GeneratorStart,
  GetValue,
  OrdinaryCreateFromConstructor,
} from '../abstract-ops/all.mjs';
import {
  isArrowFunction,
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
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
  BoundNames_FormalParameterList,
  BoundNames_FunctionDeclaration,
  ContainsExpression,
  IsConstantDeclaration,
  IsSimpleParameterList,
  LexicallyDeclaredNames_ConciseBody,
  LexicallyDeclaredNames_FunctionBody,
  LexicallyDeclaredNames_GeneratorBody,
  LexicallyScopedDeclarations_ConciseBody,
  LexicallyScopedDeclarations_FunctionBody,
  LexicallyScopedDeclarations_GeneratorBody,
  VarDeclaredNames_ConciseBody,
  VarDeclaredNames_FunctionBody,
  VarDeclaredNames_GeneratorBody,
  VarScopedDeclarations_ConciseBody,
  VarScopedDeclarations_FunctionBody,
  VarScopedDeclarations_GeneratorBody,
} from '../static-semantics/all.mjs';
import {
  NormalCompletion,
  Q,
  ReturnCompletion,
  X,
} from '../completion.mjs';
import {
  NewDeclarativeEnvironment,
} from '../environment.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  InstantiateFunctionObject,
  Evaluate_FunctionStatementList,
  IteratorBindingInitialization_FormalParameters,
} from './all.mjs';
import { Value } from '../value.mjs';

// #sec-functiondeclarationinstantiation
export function* FunctionDeclarationInstantiation(func, argumentsList) {
  const calleeContext = surroundingAgent.runningExecutionContext;
  const env = calleeContext.LexicalEnvironment;
  const envRec = env.EnvironmentRecord;
  const code = func.ECMAScriptCode;
  const strict = func.Strict;
  const formals = func.FormalParameters;
  const parameterNames = BoundNames_FormalParameterList(formals).map(Value);
  const hasDuplicates = !parameterNames.every(
    (e) => parameterNames.indexOf(e) === parameterNames.lastIndexOf(e),
  );
  const simpleParameterList = IsSimpleParameterList(formals);
  const hasParameterExpressions = ContainsExpression(formals);

  let varNames;
  let varDeclarations;
  let lexicalNames;

  switch (getFunctionBodyType(code)) {
    case 'FunctionBody':
      varNames = VarDeclaredNames_FunctionBody(code.body.body).map(Value);
      varDeclarations = VarScopedDeclarations_FunctionBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_FunctionBody(code.body.body).map(Value);
      break;
    case 'ConciseBody_Expression':
    case 'ConciseBody_FunctionBody':
      varNames = VarDeclaredNames_ConciseBody(code.body).map(Value);
      varDeclarations = VarScopedDeclarations_ConciseBody(code.body);
      lexicalNames = LexicallyDeclaredNames_ConciseBody(code.body).map(Value);
      break;
    case 'GeneratorBody':
      varNames = VarDeclaredNames_GeneratorBody(code.body.body).map(Value);
      varDeclarations = VarScopedDeclarations_GeneratorBody(code.body.body);
      lexicalNames = LexicallyDeclaredNames_GeneratorBody(code.body.body).map(Value);
      break;
    default:
      throw outOfRange('FunctionDeclarationInstantiation', code);
  }

  const functionNames = [];
  const functionsToInitialize = [];

  for (const d of [...varDeclarations].reverse()) {
    if (!isVariableDeclaration(d) && !isForBinding(d) && !isBindingIdentifier(d)) {
      Assert(isFunctionDeclaration(d) || isGeneratorDeclaration(d)
             || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d));
      const fn = BoundNames_FunctionDeclaration(d)[0];
      if (!functionNames.includes(fn)) {
        functionNames.unshift(fn);
        functionsToInitialize.unshift(d);
      }
    }
  }

  let argumentsObjectNeeded = true;
  if (func.ThisMode === 'lexical') {
    argumentsObjectNeeded = false;
  } else if (parameterNames.includes(new Value('arguments'))) {
    argumentsObjectNeeded = false;
  } else if (hasParameterExpressions === false) {
    if (functionNames.includes(new Value('arguments'))
        || lexicalNames.includes(new Value('arguments'))) {
      argumentsObjectNeeded = false;
    }
  }

  for (const paramName of parameterNames) {
    const alreadyDeclared = envRec.HasBinding(paramName);
    if (alreadyDeclared.isFalse()) {
      X(envRec.CreateMutableBinding(paramName, false));
      if (hasDuplicates === true) {
        X(envRec.InitializeBinding(paramName, new Value(undefined)));
      }
    }
  }

  let parameterBindings;
  if (argumentsObjectNeeded === true) {
    let ao;
    if (strict || simpleParameterList === false) {
      ao = CreateUnmappedArgumentsObject(argumentsList);
    } else {
      ao = CreateMappedArgumentsObject(func, formals, argumentsList, envRec);
    }
    if (strict) {
      X(envRec.CreateImmutableBinding(new Value('arguments'), new Value(false)));
    } else {
      X(envRec.CreateMutableBinding(new Value('arguments'), false));
    }
    envRec.InitializeBinding(new Value('arguments'), ao);
    parameterBindings = [...parameterNames, new Value('arguments')];
  } else {
    parameterBindings = parameterNames;
  }

  const iteratorRecord = CreateListIteratorRecord(argumentsList);
  if (hasDuplicates) {
    Q(yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, new Value(undefined)));
  } else {
    Q(yield* IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, env));
  }

  let varEnv;
  let varEnvRec;
  if (hasParameterExpressions === false) {
    const instantiatedVarNames = [...parameterBindings];
    for (const n of varNames) {
      if (!instantiatedVarNames.includes(n)) {
        instantiatedVarNames.push(n);
        X(envRec.CreateMutableBinding(n, false));
        envRec.InitializeBinding(n, new Value(undefined));
      }
    }
    varEnv = env;
    varEnvRec = envRec;
  } else {
    varEnv = NewDeclarativeEnvironment(env);
    varEnvRec = varEnv.EnvironmentRecord;
    calleeContext.VariableEnvironment = varEnv;
    const instantiatedVarNames = [];
    for (const n of varNames) {
      if (!instantiatedVarNames.includes(n)) {
        instantiatedVarNames.push(n);
        X(varEnvRec.CreateMutableBinding(n, false));
        let initialValue;
        if (!parameterBindings.includes(n) || functionNames.includes(n)) {
          initialValue = new Value(undefined);
        } else {
          initialValue = envRec.GetBindingValue(n, new Value(false));
        }
        varEnvRec.InitializeBinding(n, initialValue);
      }
    }
  }

  // NOTE: Annex B.3.3.1 adds additional steps at this point.

  let lexEnv;
  if (strict === false) {
    lexEnv = NewDeclarativeEnvironment(varEnv);
  } else {
    lexEnv = varEnv;
  }

  const lexEnvRec = lexEnv.EnvironmentRecord;
  lexEnv.EnvironmentRecord = lexEnvRec;
  calleeContext.LexicalEnvironment = lexEnv;

  let lexDeclarations;
  switch (getFunctionBodyType(code)) {
    case 'FunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_FunctionBody(code.body.body);
      break;
    case 'ConciseBody_Expression':
    case 'ConciseBody_FunctionBody':
      lexDeclarations = LexicallyScopedDeclarations_ConciseBody(code.body);
      break;
    case 'GeneratorBody':
      lexDeclarations = LexicallyScopedDeclarations_GeneratorBody(code.body.body);
      break;
    default:
      throw outOfRange('FunctionDeclarationInstantiation', code);
  }
  for (const d of lexDeclarations) {
    for (const dn of BoundNames_Declaration(d).map(Value)) {
      if (IsConstantDeclaration(d)) {
        X(lexEnvRec.CreateImmutableBinding(dn, new Value(true)));
      } else {
        X(lexEnvRec.CreateMutableBinding(dn, false));
      }
    }
  }

  for (const f of functionsToInitialize) {
    const fn = BoundNames_FunctionDeclaration(f)[0];
    const fo = InstantiateFunctionObject(f, lexEnv);
    X(varEnvRec.SetMutableBinding(new Value(fn), fo, new Value(false)));
  }

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

    // ConciseBody : AssignmentExpression
    case isArrowFunction(ECMAScriptCode) && ECMAScriptCode.expression:
      return 'ConciseBody_Expression';

    // GeneratorBody : FunctionBody
    case isGeneratorDeclaration(ECMAScriptCode)
      || isGeneratorExpression(ECMAScriptCode):
      return 'GeneratorBody';

    default:
      throw outOfRange('getFunctionBodyType', ECMAScriptCode);
  }
}

// #sec-arrow-function-definitions-runtime-semantics-evaluatebody
// ConciseBody : AssignmentExpression
export function* EvaluateBody_ConciseBody_Expression(AssignmentExpression, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  const exprRef = yield* Evaluate_Expression(AssignmentExpression);
  const exprValue = Q(GetValue(exprRef));
  return new ReturnCompletion(exprValue);
}

// #sec-function-definitions-runtime-semantics-evaluatebody
// FunctionBody : FunctionStatementList
export function* EvaluateBody_FunctionBody(FunctionStatementList, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  return yield* Evaluate_FunctionStatementList(FunctionStatementList);
}

// #sec-generator-function-definitions-runtime-semantics-evaluatebody
// GeneratorBody : FunctionBody
export function* EvaluateBody_GeneratorBody(GeneratorBody, functionObject, argumentsList) {
  Q(yield* FunctionDeclarationInstantiation(functionObject, argumentsList));
  const G = Q(OrdinaryCreateFromConstructor(functionObject, new Value('%GeneratorPrototype%'), ['GeneratorState', 'GeneratorContext']));
  GeneratorStart(G, GeneratorBody);
  return new ReturnCompletion(G);
}
