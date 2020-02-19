import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { GetValue, ToString } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';

// 12.2.9.6 #sec-template-literals-runtime-semantics-evaluation
//   TemplateLiteral : NoSubstitutionTemplate
//   SubstitutionTemplate : TemplateHead Expression TemplateSpans
//   TemplateSpans : TemplateTail
//   TemplateSpans : TemplateMiddleList TemplateTail
//   TemplateMiddleList : TemplateMiddle Expression
//   TemplateMiddleList : TemplateMiddleList TemplateMiddle Expression
//
// (implicit)
//   TemplateLiteral : SubstitutionTemplate
export function* Evaluate_TemplateLiteral({ TemplateSpanList, ExpressionList }) {
  let str = '';
  for (let i = 0; i < TemplateSpanList.length - 1; i += 1) {
    const Expression = ExpressionList[i];
    const head = TemplateSpanList[i];
    // 2. Let subRef be the result of evaluating Expression.
    const subRef = yield* Evaluate(Expression);
    // 3. Let sub be ? GetValue(subRef).
    const sub = Q(GetValue(subRef));
    // 4. Let middle be ? ToString(sub).
    const middle = Q(ToString(sub));
    str += head;
    str += middle.stringValue();
  }
  const tail = TemplateSpanList[TemplateSpanList.length - 1];
  return new Value(str + tail);
}
