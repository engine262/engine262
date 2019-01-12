import { Assert } from '../abstract-ops/notational-conventions.mjs';
import {
  isNoSubstitutionTemplate,
  isSubstitutionTemplate,
  unrollTemplateLiteral,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';

// 12.2.9.2 #sec-static-semantics-templatestrings
//   TemplateLiteral : NoSubstitutionTemplate
//
// (implicit)
//   TemplateLiteral : SubstitutionTemplate
export function TemplateStrings_TemplateLiteral(TemplateLiteral, raw) {
  switch (true) {
    case isNoSubstitutionTemplate(TemplateLiteral): {
      let string;
      if (raw === false) {
        // string = TV_NoSubstitutionTemplate(TemplateLiteral);
        string = TemplateLiteral.quasis[0].value.cooked;
      } else {
        // string = TRV_NoSubstitutionTemplate(TemplateLiteral);
        string = TemplateLiteral.quasis[0].value.raw;
      }
      return [string];
    }

    case isSubstitutionTemplate(TemplateLiteral):
      return TemplateStrings_SubstitutionTemplate(TemplateLiteral);

    default:
      throw new OutOfRange('TemplateStrings_TemplateLiteral', TemplateLiteral);
  }
}

// 12.2.9.2 #sec-static-semantics-templatestrings
//   SubstitutionTemplate : TemplateHead Expression TemplateSpans
export function TemplateStrings_SubstitutionTemplate(SubstitutionTemplate, raw) {
  const [TemplateHead, /* Expression */, ...TemplateSpans] = unrollTemplateLiteral(SubstitutionTemplate);

  let head;
  if (raw === false) {
    // head = TV_TemplateHead(TemplateHead);
    head = TemplateHead.value.cooked;
  } else {
    // head = TRV_TemplateHead(TemplateHead);
    head = TemplateHead.value.raw;
  }
  const tail = TemplateStrings_TemplateSpans(TemplateSpans, raw);
  return [head, ...tail];
}

// 12.2.9.2 #sec-static-semantics-templatestrings
//   TemplateSpans :
//     TemplateTail
//     TemplateMiddleList TemplateTail
export function TemplateStrings_TemplateSpans(TemplateSpans, raw) {
  let middle = [];
  Assert(TemplateSpans.length % 2 === 1);
  if (TemplateSpans.length > 1) {
    middle = TemplateStrings_TemplateMiddleList(TemplateSpans.slice(0, -1), raw);
  }

  const TemplateTail = TemplateSpans[TemplateSpans.length - 1];
  let tail;
  if (raw === false) {
    // tail = TV_TemplateTail(TemplateTail);
    tail = TemplateTail.value.cooked;
  } else {
    // tail = TRV_TemplateTail(TemplateTail);
    tail = TemplateTail.value.raw;
  }

  return [...middle, tail];
}

// 12.2.9.2 #sec-static-semantics-templatestrings
//   TemplateMiddleList :
//     TemplateMiddle Expression
//     TemplateMiddleList TemplateMiddle Expression
export function TemplateStrings_TemplateMiddleList(TemplateMiddleList, raw) {
  const front = [];
  Assert(TemplateMiddleList.length % 2 === 0);
  for (let i = 0; i < TemplateMiddleList.length; i += 2) {
    const TemplateMiddle = TemplateMiddleList[i];
    let last;
    if (raw === false) {
      // last = TV_TemplateMiddle(TemplateMiddle);
      last = TemplateMiddle.value.cooked;
    } else {
      // last = TRV_TemplateMiddle(TemplateMiddle);
      last = TemplateMiddle.value.raw;
    }
    front.push(last);
  }
  return front;
}
