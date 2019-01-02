import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import {
  GetValue,
  ToString,
} from '../abstract-ops/all.mjs';
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
export function* Evaluate_TemplateLiteral(TemplateLiteral) {
  let str = '';
  for (let i = 0; i < TemplateLiteral.quasis.length - 1; i += 1) {
    const TemplateHead = TemplateLiteral.quasis[i];
    const Expression = TemplateLiteral.expressions[i];
    const head = TemplateHead.value.cooked;
    const subRef = yield* Evaluate(Expression);
    const sub = Q(GetValue(subRef));
    const middle = Q(ToString(sub));
    str += head;
    str += middle.stringValue();
  }
  const TemplateTail = TemplateLiteral.quasis[TemplateLiteral.quasis.length - 1];
  const tail = TemplateTail.value.cooked;
  return new Value(str + tail);
}
