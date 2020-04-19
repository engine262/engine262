import { Evaluate } from '../evaluator.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { IsInTailPosition } from '../static-semantics/all.mjs';
import { Q } from '../completion.mjs';
import { EvaluateCall } from './all.mjs';

// #sec-tagged-templates-runtime-semantics-evaluation
//   MemberExpression :
//     MemberExpression TemplateLiteral
export function* Evaluate_TaggedTemplateExpression(node) {
  const { MemberExpression, TemplateLiteral } = node;
  // 1. Let tagRef be the result of evaluating MemberExpression.
  const tagRef = yield* Evaluate(MemberExpression);
  // 1. Let tagFunc be ? GetValue(tagRef).
  const tagFunc = Q(GetValue(tagRef));
  // 1. Let thisCall be this MemberExpression.
  const thisCall = node;
  // 1. Let tailCall be IsInTailPosition(thisCall).
  const tailCall = IsInTailPosition(thisCall);
  // 1. Return ? EvaluateCall(tagFunc, tagRef, TemplateLiteral, tailCall).
  return Q(yield* EvaluateCall(tagFunc, tagRef, TemplateLiteral, tailCall));
}
