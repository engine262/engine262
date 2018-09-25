import { surroundingAgent } from '../engine.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  Assert,
  CreateListIteratorRecord,
  CreateMappedArgumentsObject,
  CreateUnmappedArgumentsObject,
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isBindingIdentifier,
  isBlockStatement,
  isExpression,
  isForBinding,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isVariableDeclaration,
} from '../ast.mjs';
import {
  BoundNames_FormalParameterList,
  BoundNames_FunctionDeclaration,
  BoundNames_LexicalDeclaration,
  ContainsExpression,
  IsConstantDeclaration,
  IsSimpleParameterList,
  LexicallyDeclaredNames_FunctionBody,
  LexicallyDeclaredNames_ConciseBody,
  LexicallyScopedDeclarations_FunctionBody,
  LexicallyScopedDeclarations_ConciseBody,
  VarDeclaredNames_FunctionBody,
  VarDeclaredNames_ConciseBody,
  VarScopedDeclarations_FunctionBody,
  VarScopedDeclarations_ConciseBody,
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
import {
  InstantiateFunctionObject,
  Evaluate_FunctionStatementList,
  IteratorBindingInitialization_FormalParameters,
} from './all.mjs';
import { New as NewValue } from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-functiondeclarationinstantiation
export function FunctionDeclarationInstantiation(func, argumentsList) {
  const calleeContext = surroundingAgent.runningExecutionContext;
  const env = calleeContext.LexicalEnvironment;
  const envRec = env.EnvironmentRecord;
  const code = func.ECMAScriptCode;
  const strict = func.Strict;
  const formals = func.FormalParameters;
  const parameterNames = BoundNames_FormalParameterList(formals).map(NewValue);
  const hasDuplicates = !parameterNames.every(
    (e) => parameterNames.indexOf(e) === parameterNames.lastIndexOf(e),
  );
  const simpleParameterList = IsSimpleParameterList(formals);
  const hasParameterExpressions = ContainsExpression(formals);

  const varNames = (code.body
    ? VarDeclaredNames_FunctionBody(code.body)
    : VarDeclaredNames_ConciseBody(code)).map(NewValue);
  const varDeclarations = code.body
    ? VarScopedDeclarations_FunctionBody(code.body)
    : VarScopedDeclarations_ConciseBody(code);
  const lexicalNames = (code.body
    ? LexicallyDeclaredNames_FunctionBody(code.body)
    : LexicallyDeclaredNames_ConciseBody(code)).map(NewValue);
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
  } else if (parameterNames.includes(NewValue('arguments'))) {
    argumentsObjectNeeded = false;
  } else if (hasParameterExpressions === false) {
    if (functionNames.includes(NewValue('arguments'))
        || lexicalNames.includes(NewValue('arguments'))) {
      argumentsObjectNeeded = false;
    }
  }

  for (const paramName of parameterNames) {
    const alreadyDeclared = envRec.HasBinding(paramName);
    if (alreadyDeclared.isFalse()) {
      X(envRec.CreateMutableBinding(paramName, false));
      if (hasDuplicates === true) {
        X(envRec.InitializeBinding(paramName, NewValue(undefined)));
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
      X(envRec.CreateImmutableBinding(NewValue('arguments'), NewValue(false)));
    } else {
      X(envRec.CreateMutableBinding(NewValue('arguments'), false));
    }
    envRec.InitializeBinding(NewValue('arguments'), ao);
    parameterBindings = [...parameterNames, NewValue('arguments')];
  } else {
    parameterBindings = parameterNames;
  }

  const iteratorRecord = CreateListIteratorRecord(argumentsList);
  if (hasDuplicates) {
    Q(IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, NewValue(undefined)));
  } else {
    Q(IteratorBindingInitialization_FormalParameters(formals, iteratorRecord, env));
  }

  let varEnv;
  let varEnvRec;
  if (hasParameterExpressions === false) {
    const instantiatedVarNames = [...parameterBindings];
    for (const n of varNames) {
      if (!instantiatedVarNames.includes(n)) {
        instantiatedVarNames.push(n);
        X(envRec.CreateMutableBinding(n, false));
        envRec.InitializeBinding(n, NewValue(undefined));
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
          initialValue = NewValue(undefined);
        } else {
          initialValue = envRec.GetBindingValue(n, NewValue(false));
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

  const lexDeclarations = code.body
    ? LexicallyScopedDeclarations_FunctionBody(code.body)
    : LexicallyScopedDeclarations_ConciseBody(code);
  for (const d of lexDeclarations) {
    for (const dn of BoundNames_LexicalDeclaration(d).map(NewValue)) {
      if (IsConstantDeclaration(d)) {
        X(lexEnvRec.CreateImmutableBinding(dn, NewValue(true)));
      } else {
        X(lexEnvRec.CreateMutableBinding(dn, false));
      }
    }
  }

  for (const f of functionsToInitialize) {
    const fn = BoundNames_FunctionDeclaration(f)[0];
    const fo = InstantiateFunctionObject(f, lexEnv);
    X(varEnvRec.SetMutableBinding(fn, fo, NewValue(false)));
  }

  return new NormalCompletion(undefined);
}

// #sec-arrow-function-definitions-runtime-semantics-evaluatebody
// ConciseBody : AssignmentExpression
export function EvaluateBody_ConciseBody(AssignmentExpression, functionObject, argumentsList) {
  Q(FunctionDeclarationInstantiation(functionObject, argumentsList));
  const exprRef = Evaluate_Expression(AssignmentExpression);
  const exprValue = Q(GetValue(exprRef));
  return new ReturnCompletion(exprValue);
}

// #sec-function-definitions-runtime-semantics-evaluatebody
// FunctionBody : FunctionStatementList
export function EvaluateBody_FunctionBody(FunctionStatementList, functionObject, argumentsList) {
  Q(FunctionDeclarationInstantiation(functionObject, argumentsList));
  return Evaluate_FunctionStatementList(FunctionStatementList);
}

// ConciseBody : [lookahead != `{`] AssignmentExpression
// FunctionBody : FunctionStatementList
export function EvaluateBody(node, functionObject, argumentsList) {
  switch (true) {
    case isExpression(node):
      return EvaluateBody_ConciseBody(node, functionObject, argumentsList);
    case isBlockStatement(node):
      return EvaluateBody_FunctionBody(node.body, functionObject, argumentsList);

    default:
      throw outOfRange('EvaluateBody', node);
  }
}
