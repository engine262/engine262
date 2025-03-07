// @ts-nocheck
import { Value } from '../value.mts';
import { Q } from '../completion.mts';
import { GetValue, ToString } from '../abstract-ops/all.mts';
import { Evaluate } from '../evaluator.mts';
import { TV } from '../static-semantics/all.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-template-literals-runtime-semantics-evaluation */
//   TemplateLiteral : NoSubstitutionTemplate
//   SubstitutionTemplate : TemplateHead Expression TemplateSpans
//   TemplateSpans : TemplateTail
//   TemplateSpans : TemplateMiddleList TemplateTail
//   TemplateMiddleList : TemplateMiddle Expression
//   TemplateMiddleList : TemplateMiddleList TemplateMiddle Expression
//
// (implicit)
//   TemplateLiteral : SubstitutionTemplate
export function* Evaluate_TemplateLiteral({ TemplateSpanList, ExpressionList }: ParseNode.TemplateLiteral) {
  let str = '';
  for (let i = 0; i < TemplateSpanList.length - 1; i += 1) {
    const Expression = ExpressionList[i];
    const head = TV(TemplateSpanList[i]);
    // 2. Let subRef be the result of evaluating Expression.
    const subRef = yield* Evaluate(Expression);
    // 3. Let sub be ? GetValue(subRef).
    const sub = Q(GetValue(subRef));
    // 4. Let middle be ? ToString(sub).
    const middle = Q(ToString(sub));
    str += head;
    str += middle.stringValue();
  }
  const tail = TV(TemplateSpanList[TemplateSpanList.length - 1]);
  return Value(str + tail);
}
