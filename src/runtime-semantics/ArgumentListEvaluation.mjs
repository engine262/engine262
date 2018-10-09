import { Evaluate_Expression } from '../evaluator.mjs';
import { Q, ReturnIfAbrupt } from '../completion.mjs';
import { isTemplateLiteral } from '../ast.mjs';
import {
  Assert,
  GetIterator,
  GetValue,
  IteratorStep,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import { GetTemplateObject } from './all.mjs';
import { Value } from '../value.mjs';

// #sec-runtime-semantics-substitutionevaluation
function* SubstitutionEvaluation(Expressions) {
  const preceding = [];
  for (const Expression of Expressions) {
    const nextRef = yield* Evaluate_Expression(Expression);
    const next = Q(GetValue(nextRef));
    preceding.push(next);
  }
  return preceding;
}

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
  if (isTemplateLiteral(ArgumentList)) {
    if (ArgumentList.expressions.length === 0) {
      const templateLiteral = ArgumentList;
      const siteObj = GetTemplateObject(templateLiteral);
      return [siteObj];
    } else {
      const templateLiteral = ArgumentList;
      const siteObj = GetTemplateObject(templateLiteral);
      const firstSubRef = yield* Evaluate_Expression(templateLiteral.expressions.shift());
      const firstSub = Q(GetValue(firstSubRef));
      const restSub = yield* SubstitutionEvaluation(templateLiteral.expressions);
      ReturnIfAbrupt(restSub);
      Assert(Array.isArray(restSub));
      return [siteObj, firstSub, ...restSub];
    }
  }

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
      if (next === Value.false) {
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
