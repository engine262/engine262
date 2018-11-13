import { surroundingAgent } from '../engine.mjs';
import {
  isAsyncFunctionExpressionWithBindingIdentifier,
  directivePrologueContainsUseStrictDirective,
} from '../ast.mjs';
import { AsyncFunctionCreate, SetFunctionName } from '../abstract-ops/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Value } from '../value.mjs';
import { X } from '../completion.mjs';

function Evaluate_AsyncFunctionExpression_BindingIdentifier(AsyncFunctionExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncFunctionExpression;

  // If the function code for FunctionExpression is strict mode
  // code, let strict be true. Otherwise let strict be false.
  const strict = directivePrologueContainsUseStrictDirective(AsyncFunctionExpression.body.body);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = new Value(BindingIdentifier.name);
  X(envRec.CreateImmutableBinding(name, Value.false));
  const closure = X(AsyncFunctionCreate('Normal', FormalParameters, AsyncFunctionExpression, funcEnv, strict));
  X(SetFunctionName(closure, name));
  X(envRec.InitializeBinding(name, closure));
  closure.SourceText = surroundingAgent.sourceTextMatchedBy(AsyncFunctionExpression);
  return closure;
}

export function Evaluate_AsyncFunctionExpression(AsyncFunctionExpression) {
  if (isAsyncFunctionExpressionWithBindingIdentifier(AsyncFunctionExpression)) {
    return Evaluate_AsyncFunctionExpression_BindingIdentifier(AsyncFunctionExpression);
  }
  const {
    params: FormalParameters,
  } = AsyncFunctionExpression;

  // If the function code for FunctionExpression is strict mode
  // code, let strict be true. Otherwise let strict be false.
  const strict = directivePrologueContainsUseStrictDirective(AsyncFunctionExpression.body.body);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = X(AsyncFunctionCreate('Normal', FormalParameters, AsyncFunctionExpression, scope, strict));
  closure.SourceText = surroundingAgent.sourceTextMatchedBy(AsyncFunctionExpression);
  return closure;
}
