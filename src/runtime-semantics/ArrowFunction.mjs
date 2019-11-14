import {
  surroundingAgent,
} from '../engine.mjs';
import { OrdinaryFunctionCreate, GetValue, sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { Q, X, ReturnCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// 14.2.17 #sec-arrow-function-definitions-runtime-semantics-evaluation
//   ArrowFunction : ArrowParameters `=>` ConciseBody
export function Evaluate_ArrowFunction(ArrowFunction) {
  const { params: ArrowParameters } = ArrowFunction;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowParameters;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), parameters, ArrowFunction, 'lexical-this', scope));
  closure.SourceText = sourceTextMatchedBy(ArrowFunction);
  return closure;
}

// https://github.com/tc39/ecma262/pull/1406
//   ExpressionBody : AssignmentExpression
export function* Evaluate_ExpressionBody(ExpressionBody) {
  const AssignmentExpression = ExpressionBody;
  const exprRef = yield* Evaluate(AssignmentExpression);
  const exprValue = Q(GetValue(exprRef));
  return new ReturnCompletion(exprValue);
}
