import {
  surroundingAgent,
} from '../engine.mjs';
// import { CoveredFormalsList } from '../static-semantics/all.mjs';
import { FunctionCreate, GetValue, sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { Q, ReturnCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

export function Evaluate_ArrowFunction(ArrowFunction) {
  const { params: ArrowParameters, strict } = ArrowFunction;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowParameters;
  const closure = FunctionCreate('Arrow', parameters, ArrowFunction, scope, strict);
  closure.SourceText = sourceTextMatchedBy(ArrowFunction);
  return closure;
}

// https://github.com/tc39/ecma262/pull/1406
export function Evaluate_ExpressionBody(ExpressionBody) {
  const AssignmentExpression = ExpressionBody;
  const exprRef = Evaluate(AssignmentExpression);
  const exprValue = Q(GetValue(exprRef));
  return new ReturnCompletion(exprValue);
}
