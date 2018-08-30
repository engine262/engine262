import { Q } from '../completion.mjs';
import { Evaluate_StatementList } from '../evaluator.mjs';

// #sec-functiondeclarationinstantiation
export function FunctionDeclarationInstantiation() {}

// #sec-function-definitions-runtime-semantics-evaluatebody
//   FunctionBody : FunctionStatementList
//
// (implicit)
//   FunctionBody : [empty]
export function EvaluateBody(FunctionStatementList, functionObject, argumentsList) {
  Q(FunctionDeclarationInstantiation(functionObject, argumentsList));
  return Evaluate_StatementList(FunctionStatementList);
}
