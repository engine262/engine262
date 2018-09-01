import { Q, ReturnCompletion } from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { isExpression } from '../ast.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-functiondeclarationinstantiation
export function FunctionDeclarationInstantiation() {}

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
  // Return the result of evaluating FunctionStatementList.
}

// ConciseBody : [lookahead != `{`] AssignmentExpression
// FunctionBody : FunctionStatementList
export function EvaluateBody(node, functionObject, argumentsList) {
  switch (true) {
    case isExpression(node):
      return EvaluateBody_ConciseBody(node, functionObject, argumentsList);
    case false:
      return EvaluateBody_FunctionBody(node, functionObject, argumentsList);

    default:
      throw outOfRange('EvaluateBody', node);
  }
}
