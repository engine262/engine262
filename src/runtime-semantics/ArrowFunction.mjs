import {
  surroundingAgent,
} from '../engine.mjs';
import { OrdinaryFunctionCreate, GetValue, sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { Q, X, ReturnCompletion } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-arrow-function-definitions-runtime-semantics-evaluation
//   ArrowFunction : ArrowParameters `=>` ConciseBody
export function Evaluate_ArrowFunction(ArrowFunction) {
  const { params: ArrowParameters } = ArrowFunction;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const parameters = ArrowParameters;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), parameters, ArrowFunction, 'lexical-this', scope));
  closure.SourceText = sourceTextMatchedBy(ArrowFunction);
  return closure;
}

// #sec-arrow-function-definitions-runtime-semantics-evaluation
//   ExpressionBody : AssignmentExpression
export function* Evaluate_ExpressionBody(ExpressionBody) {
  const AssignmentExpression = ExpressionBody;
  // 1. Let exprRef be the result of evaluating |AssignmentExpression|.
  const exprRef = yield* Evaluate(AssignmentExpression);
  // 2. Let exprValue be ? GetValue(exprRef).
  const exprValue = Q(GetValue(exprRef));
  // 3. Return Completion { [[Type]]: return, [[Value]]: exprValue, [[Target]]: empty }.
  return new ReturnCompletion(exprValue);
}
