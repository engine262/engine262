import { Q } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';

// #sec-functiondeclarationinstantiation
export function FunctionDeclarationInstantiation() {}

// #sec-function-definitions-runtime-semantics-evaluatebody
// FunctionBody : FunctionStatementList
export function EvaluateBody(FunctionStatementList, functionObject, argumentsList) {
  Q(FunctionDeclarationInstantiation(functionObject, argumentsList));
  return Evaluate(FunctionStatementList);
}
