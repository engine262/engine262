import { surroundingAgent } from '../engine.mjs';
import {
  isAsyncFunctionExpressionWithBindingIdentifier,
} from '../ast.mjs';
import {
  OrdinaryFunctionCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Value } from '../value.mjs';
import { X } from '../completion.mjs';

function Evaluate_AsyncFunctionExpression_BindingIdentifier(AsyncFunctionExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncFunctionExpression;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = new Value(BindingIdentifier.name);
  X(envRec.CreateImmutableBinding(name, Value.false));
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionExpression, 'non-lexical-this', funcEnv));
  X(SetFunctionName(closure, name));
  X(envRec.InitializeBinding(name, closure));
  closure.SourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  return closure;
}

export function Evaluate_AsyncFunctionExpression(AsyncFunctionExpression) {
  if (isAsyncFunctionExpressionWithBindingIdentifier(AsyncFunctionExpression)) {
    return Evaluate_AsyncFunctionExpression_BindingIdentifier(AsyncFunctionExpression);
  }
  const {
    params: FormalParameters,
  } = AsyncFunctionExpression;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionExpression, 'non-lexical-this', scope));
  closure.SourceText = sourceTextMatchedBy(AsyncFunctionExpression);
  return closure;
}
