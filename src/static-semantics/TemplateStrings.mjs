// 12.2.9.2 #sec-static-semantics-templatestrings
// TemplateLiteral : NoSubstituionTemplate
// SubstitutionTemplate : TemplateHead Expresison TemplateSpans
// TemplateSpans :
//   TemplateTail
//   TemplateMiddleList TemplateTail
// TemplateMiddleList :
//   TemplateMiddle Expression
//   TemplateMiddleList TemplateMiddle Expression
export function TemplateStrings(Template, raw) {
  return Template.quasis.map((t) => (raw ? t.value.raw : t.value.cooked));
}
