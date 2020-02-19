import { surroundingAgent } from '../engine.mjs';
import {
  Assert,
  Construct,
  GetValue,
  IsConstructor,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { ArgumentListEvaluation } from './all.mjs';

// #sec-evaluatenew
function* EvaluateNew(constructExpr, args) {
  // 1. Assert: constructExpr is either a NewExpression or a MemberExpression.
  // 2. Assert: arguments is either empty or an Arguments.
  Assert(args === undefined || Array.isArray(args));
  // 3. Let ref be the result of evaluating constructExpr.
  const ref = yield* Evaluate(constructExpr);
  // 4. Let constructor be ? GetValue(ref).
  const constructor = Q(GetValue(ref));
  let argList;
  // 5. If arguments is empty, let argList be a new empty List.
  if (args === undefined) {
    argList = [];
  } else { // 6. Else,
    // a. Let argList be ? ArgumentListEvaluation of arguments.
    argList = Q(yield* ArgumentListEvaluation(args));
  }
  // 7. If IsConstructor(constructor) is false, throw a TypeError exception.
  if (IsConstructor(constructor) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', constructor);
  }
  // 8. Return ? Construct(constructor, argList).
  return Q(Construct(constructor, argList));
}

// #sec-new-operator-runtime-semantics-evaluation
//   NewExpression :
//     `new` NewExpression
//     `new` MemberExpression Arguments
export function* Evaluate_NewExpression({ MemberExpression, Arguments }) {
  if (Arguments === null) {
    // 1. Return ? EvaluateNew(NewExpression, empty).
    return Q(yield* EvaluateNew(MemberExpression, undefined));
  } else {
    // 1. Return ? EvaluateNew(MemberExpression, Arguments).
    return Q(yield* EvaluateNew(MemberExpression, Arguments));
  }
}
