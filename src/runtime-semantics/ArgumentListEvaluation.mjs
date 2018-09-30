import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  GetIterator,
  GetValue,
  IteratorStep,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import { Type } from '../value.mjs';

// #sec-argument-lists-runtime-semantics-argumentlistevaluation
//   Arguments : `(` `)`
//   ArgumentList :
//     AssignmentExpression
//     `...` AssignmentExpression
//     ArgumentList `,` AssignmentExpression
//     ArgumentList `,` `...` AssignmentExpression
//
// (implicit)
//   Arguments :
//     `(` ArgumentList `)`
//     `(` ArgumentList `,` `)`
export function* ArgumentListEvaluation(ArgumentList) {
  if (ArgumentList.length === 0) {
    return [];
  }

  const precedingArgs = [];
  for (const AssignmentExpression of ArgumentList.slice(0, -1)) {
    const ref = yield* Evaluate_Expression(AssignmentExpression);
    const arg = Q(GetValue(ref));
    precedingArgs.push(arg);
  }

  const last = ArgumentList[ArgumentList.length - 1];
  if (last.type === 'SpreadElement') {
    const AssignmentExpression = last.argument;
    const spreadRef = yield* Evaluate_Expression(AssignmentExpression);
    const spreadObj = Q(GetValue(spreadRef));
    const iteratorRecord = Q(GetIterator(spreadObj));
    while (true) {
      const next = Q(IteratorStep(iteratorRecord));
      if (Type(next) === 'Boolean' && next.isFalse()) {
        break;
      }
      const nextArg = Q(IteratorValue(next));
      precedingArgs.push(nextArg);
    }
  } else {
    const AssignmentExpression = last;
    const ref = yield* Evaluate_Expression(AssignmentExpression);
    const arg = Q(GetValue(ref));
    precedingArgs.push(arg);
  }
  return precedingArgs;
}
