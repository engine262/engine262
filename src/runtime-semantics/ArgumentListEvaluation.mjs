import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Assert,
  GetIterator,
  GetValue,
  IteratorStep,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
// import { GetTemplateObject } from './all.mjs';

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
function* ArgumentListEvaluation_TemplateLiteral(TemplateLiteral) {
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
function* ArgumentListEvaluation_Arguments(Arguments) {
  const precedingArgs = [];
  for (const element of Arguments) {
    if (element.type === 'AssignmentRestElement') {
      const { AssignmentExpression } = element;
      // 2. Let spreadRef be the result of evaluating AssignmentExpression.
      const spreadRef = yield* Evaluate(AssignmentExpression);
      // 3. Let spreadObj be ? GetValue(spreadRef).
      const spreadObj = Q(GetValue(spreadRef));
      // 4. Let iteratorRecord be ? GetIterator(spreadObj).
      const iteratorRecord = Q(GetIterator(spreadObj));
      // 5. Repeat,
      while (true) {
        // a. Let next be ? IteratorStep(iteratorRecord).
        const next = Q(IteratorStep(iteratorRecord));
        // b. If next is false, return list.
        if (next === Value.false) {
          break;
        }
        // c. Let nextArg be ? IteratorValue(next).
        const nextArg = Q(IteratorValue(next));
        // d. Append nextArg as the last element of list.
        precedingArgs.push(nextArg);
      }
    } else {
      const AssignmentExpression = element;
      // 2. Let ref be the result of evaluating AssignmentExpression.
      const ref = yield* Evaluate(AssignmentExpression);
      // 3. Let arg be ? GetValue(ref).
      const arg = Q(GetValue(ref));
      // 4. Append arg to the end of precedingArgs.
      precedingArgs.push(arg);
      // 5. Return precedingArgs.
    }
  }
  return precedingArgs;
}

export function ArgumentListEvaluation(ArgumentsOrTemplateLiteral) {
  switch (true) {
    /*
    case isTemplateLiteral(ArgumentsOrTemplateLiteral):
      return ArgumentListEvaluation_TemplateLiteral(ArgumentsOrTemplateLiteral);
    */

    case Array.isArray(ArgumentsOrTemplateLiteral):
      return ArgumentListEvaluation_Arguments(ArgumentsOrTemplateLiteral);

    default:
      throw new OutOfRange('ArgumentListEvaluation', ArgumentsOrTemplateLiteral);
  }
}
