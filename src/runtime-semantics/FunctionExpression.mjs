import { surroundingAgent } from '../engine.mjs';
import {
  isFunctionExpressionWithBindingIdentifier,
} from '../ast.mjs';
import {
  FunctionCreate,
  MakeConstructor,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { New as NewValue } from '../value.mjs';

function Evaluate_FunctionExpression_BindingIdentifier({
  id: BindingIdentifier,
  params: FormalParameters,
  body: FunctionBody,
}) {
  // If the function code for FunctionExpression is strict mode
  // code, let strict be true. Otherwise let strict be false.
  const strict = true;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = NewValue(BindingIdentifier.name);
  envRec.CreateImmutableBinding(name, NewValue(false));
  const closure = FunctionCreate('Normal', FormalParameters, FunctionBody, funcEnv, strict);
  MakeConstructor(closure);
  SetFunctionName(closure, name);
  envRec.InitializeBinding(name, closure);
  return closure;
}

export function Evaluate_FunctionExpression(FunctionExpression) {
  if (isFunctionExpressionWithBindingIdentifier(FunctionExpression)) {
    return Evaluate_FunctionExpression_BindingIdentifier(FunctionExpression);
  }

  const { body: FunctionBody, params: FormalParameters } = FunctionExpression;

  // If the function code for FunctionExpression is strict mode
  // code, let strict be true. Otherwise let strict be false.
  const strict = true;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = FunctionCreate('Normal', FormalParameters, FunctionBody, scope, strict);
  MakeConstructor(closure);
  return closure;
}
