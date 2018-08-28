import {
  surroundingAgent,
} from '../engine.mjs';
import {
  isNewExpressionWithoutArguments,
  isNewExpressionWithArguments,
  isNewExpression,
  isMemberExpression,
} from '../ast.mjs';
import {
  Assert,
  IsConstructor,
  Construct,
  GetValue,
} from '../abstract-ops/all.mjs';
import {
  ArgumentListEvaluation,
} from './all.mjs';
import {
  Evaluate,
} from '../evaluator.mjs';
import {
  Q,
  ReturnIfAbrupt,
} from '../completion.mjs';

// #sec-evaluatenew
function EvaluateNew(constructExpr, args) {
  Assert(isNewExpression(constructExpr) || isMemberExpression(constructExpr));
  Assert(args === undefined || Array.isArray(args));
  const ref = Evaluate(constructExpr);
  const constructor = Q(GetValue(ref));
  let argList;
  if (args === undefined) {
    argList = [];
  } else {
    argList = ArgumentListEvaluation(args);
    ReturnIfAbrupt(argList);
  }
  if (IsConstructor(constructor).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(Construct(constructor, argList));
}

// #sec-new-operator-runtime-semantics-evaluation
// NewExpression :
//   new NewExpression
//   new MemberExpression Arguments
export function Evaluate_NewExpression(NewExpression) {
  switch (true) {
    case isNewExpressionWithoutArguments(NewExpression):
      return EvaluateNew(NewExpression.callee, undefined);
    case isNewExpressionWithArguments(NewExpression):
      return EvaluateNew(NewExpression.callee, NewExpression.arguments);

    default:
      throw new RangeError();
  }
}
