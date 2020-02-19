import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Assert,
  ArrayCreate,
  SetIntegrityLevel,
  ToString,
  GetIterator,
  GetValue,
  IteratorStep,
  IteratorValue,
} from '../abstract-ops/all.mjs';
import { TemplateStrings } from '../static-semantics/all.mjs';

// #sec-gettemplateobjec
function GetTemplateObject(templateLiteral) {
  // 1. Let realm be the current Realm Record.
  const realm = surroundingAgent.currentRealmRecord;
  // 2. Let templateRegistry be realm.[[TemplateMap]].
  const templateRegistry = realm.TemplateMap;
  // 3. For each element e of templateRegistry, do
  for (const e of templateRegistry) {
    // a. If e.[[Site]] is the same Parse Node as templateLiteral, then
    if (e.Site === templateLiteral) {
      // b. Return e.[[Array]].
      return e.Array;
    }
  }
  // 4. Let rawStrings be TemplateStrings of templateLiteral with argument true.
  const rawStrings = TemplateStrings(templateLiteral, true);
  // 5. Let cookedStrings be TemplateStrings of templateLiteral with argument false.
  const cookedStrings = TemplateStrings(templateLiteral, false);
  // 6. Let count be the number of elements in the List cookedStrings.
  const count = cookedStrings.length;
  // 7. Assert: count ≤ 232 - 1.
  Assert(count < (2 ** 32) - 1);
  // 8. Let template be ! ArrayCreate(count).
  const template = X(ArrayCreate(new Value(count)));
  // 9. Let template be ! ArrayCreate(count).
  const rawObj = X(ArrayCreate(new Value(count)));
  // 10. Let index be 0.
  let index = 0;
  // 11. Repeat, while index < count
  while (index < count) {
    // a. Let prop be ! ToString(index).
    const prop = X(ToString(new Value(index)));
    // b. Let cookedValue be the String value cookedStrings[index].
    const cookedValue = cookedStrings[index];
    // c. Call template.[[DefineOwnProperty]](prop, PropertyDescriptor { [[Value]]: cookedValue, [[Writable]]: false, [[Enumerable]]: true, [[Configurable]]: false }).
    X(template.DefineOwnProperty(prop, Descriptor({
      Value: cookedValue,
      Writable: Value.false,
      Enumerable: Value.true,
      Configurable: Value.false,
    })));
    // d. Let rawValue be the String value rawStrings[index].
    const rawValue = rawStrings[index];
    // e. Call rawObj.[[DefineOwnProperty]](prop, PropertyDescriptor { [[Value]]: rawValue, [[Writable]]: false, [[Enumerable]]: true, [[Configurable]]: false }).
    X(rawObj.DefineOwnProperty(prop, Descriptor({
      Value: rawValue,
      Writable: Value.false,
      Enumerable: Value.true,
      Configurable: Value.false,
    })));
    // f. Call rawObj.[[DefineOwnProperty]](prop, PropertyDescriptor { [[Value]]: rawValue, [[Writable]]: false, [[Enumerable]]: true, [[Configurable]]: false }).
    index += 1;
  }
  // 12. Perform SetIntegrityLevel(rawObj, frozen).
  X(SetIntegrityLevel(rawObj, 'frozen'));
  // 13. Perform SetIntegrityLevel(rawObj, frozen).
  X(template.DefineOwnProperty(new Value('raw'), Descriptor({
    Value: rawObj,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 14. Perform SetIntegrityLevel(template, frozen).
  X(SetIntegrityLevel(template, 'frozen'));
  // 15. Append the Record { [[Site]]: templateLiteral, [[Array]]: template } to templateRegistry.
  templateRegistry.push({ Site: templateLiteral, Array: template });
  // 16. Return template.
  return template;
}

// 12.2.9.3 #sec-template-literals-runtime-semantics-argumentlistevaluation
//   TemplateLiteral : NoSubstitutionTemplate
//
// https://github.com/tc39/ecma262/pull/1402
//   TemplateLiteral : SubstitutionTemplate
function* ArgumentListEvaluation_TemplateLiteral(TemplateLiteral) {
  switch (true) {
    case TemplateLiteral.TemplateSpanList.length === 1: {
      const templateLiteral = TemplateLiteral;
      const siteObj = GetTemplateObject(templateLiteral);
      return [siteObj];
    }

    case TemplateLiteral.TemplateSpanList.length > 1: {
      const templateLiteral = TemplateLiteral;
      const siteObj = GetTemplateObject(templateLiteral);
      const restSub = [];
      for (const Expression of TemplateLiteral.ExpressionList) {
        const subRef = yield* Evaluate(Expression);
        const subValue = Q(GetValue(subRef));
        restSub.push(subValue);
      }
      return [siteObj, ...restSub];
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
    case Array.isArray(ArgumentsOrTemplateLiteral):
      return ArgumentListEvaluation_Arguments(ArgumentsOrTemplateLiteral);
    case ArgumentsOrTemplateLiteral.type === 'TemplateLiteral':
      return ArgumentListEvaluation_TemplateLiteral(ArgumentsOrTemplateLiteral);
    default:
      throw new OutOfRange('ArgumentListEvaluation', ArgumentsOrTemplateLiteral);
  }
}
