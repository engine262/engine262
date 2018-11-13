import { surroundingAgent } from '../engine.mjs';
import {
  isFunctionExpressionWithBindingIdentifier,
  directivePrologueContainsUseStrictDirective,
} from '../ast.mjs';
import {
  FunctionCreate,
  MakeConstructor,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Value } from '../value.mjs';

function Evaluate_FunctionExpression_BindingIdentifier(FunctionExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = FunctionExpression;
  // If the function code for FunctionExpression is strict mode
  // code, let strict be true. Otherwise let strict be false.
  const strict = directivePrologueContainsUseStrictDirective(FunctionExpression.body.body);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = new Value(BindingIdentifier.name);
  envRec.CreateImmutableBinding(name, Value.false);
  const closure = FunctionCreate('Normal', FormalParameters, FunctionExpression, funcEnv, strict);
  MakeConstructor(closure);
  SetFunctionName(closure, name);
  closure.SourceText = surroundingAgent.sourceTextMatchedBy(FunctionExpression);
  envRec.InitializeBinding(name, closure);
  return closure;
}

export function Evaluate_FunctionExpression(FunctionExpression) {
  if (isFunctionExpressionWithBindingIdentifier(FunctionExpression)) {
    return Evaluate_FunctionExpression_BindingIdentifier(FunctionExpression);
  }

  const FormalParameters = FunctionExpression.params;

  // If the function code for FunctionExpression is strict mode
  // code, let strict be true. Otherwise let strict be false.
  const strict = directivePrologueContainsUseStrictDirective(FunctionExpression.body.body);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = FunctionCreate('Normal', FormalParameters, FunctionExpression, scope, strict);
  MakeConstructor(closure);
  closure.SourceText = surroundingAgent.sourceTextMatchedBy(FunctionExpression);
  return closure;
}
