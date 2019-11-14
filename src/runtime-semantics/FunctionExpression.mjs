import { surroundingAgent } from '../engine.mjs';
import {
  isFunctionExpressionWithBindingIdentifier,
} from '../ast.mjs';
import {
  OrdinaryFunctionCreate,
  MakeConstructor,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Value } from '../value.mjs';
import { X } from '../completion.mjs';

function Evaluate_FunctionExpression_BindingIdentifier(FunctionExpression) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = FunctionExpression;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const funcEnv = NewDeclarativeEnvironment(scope);
  const envRec = funcEnv.EnvironmentRecord;
  const name = new Value(BindingIdentifier.name);
  envRec.CreateImmutableBinding(name, Value.false);
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), FormalParameters, FunctionExpression, 'non-lexical-this', funcEnv));
  MakeConstructor(closure);
  SetFunctionName(closure, name);
  closure.SourceText = sourceTextMatchedBy(FunctionExpression);
  envRec.InitializeBinding(name, closure);
  return closure;
}

export function Evaluate_FunctionExpression(FunctionExpression) {
  if (isFunctionExpressionWithBindingIdentifier(FunctionExpression)) {
    return Evaluate_FunctionExpression_BindingIdentifier(FunctionExpression);
  }

  const FormalParameters = FunctionExpression.params;

  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), FormalParameters, FunctionExpression, 'non-lexical-this', scope));
  MakeConstructor(closure);
  closure.SourceText = sourceTextMatchedBy(FunctionExpression);
  return closure;
}
