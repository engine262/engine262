import { isYieldExpressionWithStar } from '../ast.mjs';
import {
  Assert,
  CreateIterResultObject,
  GeneratorYield,
  GetGeneratorKind,
  GetValue,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import {
  Evaluate_Expression,
} from '../evaluator.mjs';
import { Value } from '../value.mjs';

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   YieldExpression :
//     `yield`
//     `yield` AssignmentExpression
function* Evaluate_YieldExpression_WithoutStar(YieldExpression) {
  const generatorKind = X(GetGeneratorKind());
  let value = new Value(undefined);
  if (YieldExpression.argument) {
    const AssignmentExpression = YieldExpression.argument;
    const exprRef = yield* Evaluate_Expression(AssignmentExpression);
    value = Q(GetValue(exprRef));
  }
  // TODO(asynciterator)
  // if (generatorKind === 'async') {
  //   return Q(AsyncGeneratorYield(value));
  // }
  Assert(generatorKind === 'sync');
  return Q(yield* GeneratorYield(CreateIterResultObject(value, new Value(false))));
}

// #sec-generator-function-definitions-runtime-semantics-evaluation
//   YieldExpression :
//     `yield` `*` AssignmentExpression
function* Evaluate_YieldExpression_Star(/* YieldExpression */) {
  // TODO
}

export function* Evaluate_YieldExpression(YieldExpression) {
  if (isYieldExpressionWithStar(YieldExpression)) {
    return yield* Evaluate_YieldExpression_Star(YieldExpression);
  }
  return yield* Evaluate_YieldExpression_WithoutStar(YieldExpression);
}
