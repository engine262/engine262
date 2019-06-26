import { surroundingAgent } from '../engine.mjs';
import { Descriptor, Value } from '../value.mjs';
import {
  ArrayCreate,
  Assert,
  GetValue,
  SetIntegrityLevel,
  ToString,
} from '../abstract-ops/all.mjs';
import { EvaluateCall } from './all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { IsInTailPosition, TemplateStrings_TemplateLiteral } from '../static-semantics/all.mjs';
import { Q, X } from '../completion.mjs';

// 12.2.9.4 #sec-gettemplateobject
export function GetTemplateObject(templateLiteral) {
  const rawStrings = TemplateStrings_TemplateLiteral(templateLiteral, true).map(Value);
  const realm = surroundingAgent.currentRealmRecord;
  const templateRegistry = realm.TemplateMap;
  for (const e of templateRegistry) {
    if (e.Site === templateLiteral) {
      return e.Array;
    }
  }
  const cookedStrings = TemplateStrings_TemplateLiteral(templateLiteral, false).map((v) => (v === undefined ? Value.undefined : new Value(v)));
  const count = cookedStrings.length;
  Assert(count < (2 ** 32) - 1);
  const template = X(ArrayCreate(new Value(count)));
  const rawObj = X(ArrayCreate(new Value(count)));
  let index = 0;
  while (index < count) {
    const prop = X(ToString(new Value(index)));
    const cookedValue = cookedStrings[index];
    X(template.DefineOwnProperty(prop, Descriptor({
      Value: cookedValue,
      Writable: Value.false,
      Enumerable: Value.true,
      Configurable: Value.false,
    })));
    const rawValue = rawStrings[index];
    X(rawObj.DefineOwnProperty(prop, Descriptor({
      Value: rawValue,
      Writable: Value.false,
      Enumerable: Value.true,
      Configurable: Value.false,
    })));
    index += 1;
  }
  X(SetIntegrityLevel(rawObj, 'frozen'));
  X(template.DefineOwnProperty(new Value('raw'), Descriptor({
    Value: rawObj,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  X(SetIntegrityLevel(template, 'frozen'));
  templateRegistry.push({ Site: templateLiteral, Array: template });
  return template;
}

// 12.3.8.1 #sec-tagged-templates-runtime-semantics-evaluation
export function* Evaluate_TaggedTemplate({
  tag: Expression,
  quasi: TemplateLiteral,
}) {
  const tagRef = yield* Evaluate(Expression);
  const tagFunc = Q(GetValue(tagRef));
  const thisCall = Expression;
  const tailCall = IsInTailPosition(thisCall);
  return Q(yield* EvaluateCall(tagFunc, tagRef, TemplateLiteral, tailCall));
}
