import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  isExpression,
  isNoSubstitutionTemplate,
  isSubstitutionTemplate,
  isTemplateLiteral,
  unrollTemplateLiteral,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Assert,
  GetIterator,
  GetValue,
  IteratorStep,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import { GetTemplateObject } from './all.mjs';
import { Value } from '../value.mjs';

// 12.2.9.5 #sec-runtime-semantics-substitutionevaluation
//   TemplateSpans :
//     TemplateTail
//     TemplateMiddleList TemplateTail
//
//   TemplateMiddleList :
//     TemplateMiddle Expression
//     TemplateMiddleList TemplateMiddle Expression
function* SubstitutionEvaluation_TemplateSpans(TemplateSpans) {
  const preceding = [];
  for (let i = 1; i < TemplateSpans.length; i += 2) {
    const Expression = TemplateSpans[i];
    const nextRef = yield* Evaluate(Expression);
    const next = Q(GetValue(nextRef));
    preceding.push(next);
  }
  return preceding;
}

// 12.2.9.3 #sec-template-literals-runtime-semantics-argumentlistevaluation
//   TemplateLiteral : NoSubstitutionTemplate
//
// https://github.com/tc39/ecma262/pull/1402
//   TemplateLiteral : SubstitutionTemplate
export function* ArgumentListEvaluation_TemplateLiteral(TemplateLiteral) {
  switch (true) {
    case isNoSubstitutionTemplate(TemplateLiteral): {
      const templateLiteral = TemplateLiteral;
      const siteObj = GetTemplateObject(templateLiteral);
      return [siteObj];
    }

    case isSubstitutionTemplate(TemplateLiteral): {
      const templateLiteral = TemplateLiteral;
      const siteObj = GetTemplateObject(templateLiteral);
      const [/* TemplateHead */, first/* Expression */, ...rest/* TemplateSpans */] = unrollTemplateLiteral(templateLiteral);
      const firstSubRef = yield* Evaluate(first);
      const firstSub = Q(GetValue(firstSubRef));
      const restSub = Q(yield* SubstitutionEvaluation_TemplateSpans(rest));
      Assert(Array.isArray(restSub));
      return [siteObj, firstSub, ...restSub];
    }

    default:
      throw new OutOfRange('ArgumentListEvaluation_TemplateLiteral', TemplateLiteral);
  }
}

// 12.3.6.1 #sec-argument-lists-runtime-semantics-argumentlistevaluation
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
export function* ArgumentListEvaluation_Arguments(Arguments) {
  const precedingArgs = [];
  for (const AssignmentExpressionOrSpreadElement of Arguments) {
    if (AssignmentExpressionOrSpreadElement.type === 'SpreadElement') {
      const AssignmentExpression = AssignmentExpressionOrSpreadElement.argument;
      const spreadRef = yield* Evaluate(AssignmentExpression);
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
      const AssignmentExpression = AssignmentExpressionOrSpreadElement;
      Assert(isExpression(AssignmentExpression));
      const ref = yield* Evaluate(AssignmentExpression);
      const arg = Q(GetValue(ref));
      precedingArgs.push(arg);
    }
  }
  return precedingArgs;
}

export function ArgumentListEvaluation(ArgumentsOrTemplateLiteral) {
  switch (true) {
    case isTemplateLiteral(ArgumentsOrTemplateLiteral):
      return ArgumentListEvaluation_TemplateLiteral(ArgumentsOrTemplateLiteral);

    case Array.isArray(ArgumentsOrTemplateLiteral):
      return ArgumentListEvaluation_Arguments(ArgumentsOrTemplateLiteral);

    default:
      throw new OutOfRange('ArgumentListEvaluation', ArgumentsOrTemplateLiteral);
  }
}
