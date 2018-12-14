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
import { IsInTailPosition, TemplateStrings } from '../static-semantics/all.mjs';
import { Q, X } from '../completion.mjs';

export function GetTemplateObject(templateLiteral) {
  const rawStrings = TemplateStrings(templateLiteral, true).map(Value);
  const realm = surroundingAgent.currentRealmRecord;
  const templateRegistry = realm.TemplateMap;
  for (const e of templateRegistry) {
    if (e.Site === templateLiteral) {
      return e.Array;
    }
  }
  const cookedStrings = TemplateStrings(templateLiteral, false).map(Value);
  const count = cookedStrings.length;
  Assert(count < (2 ** 32) - 1);
  const template = X(ArrayCreate(new Value(count)));
  const rawObj = X(ArrayCreate(new Value(count)));
  let index = 0;
  while (index < count) {
    const prop = X(ToString(new Value(index)));
    const cookedValue = cookedStrings[index];
    template.DefineOwnProperty(prop, Descriptor({
      Value: cookedValue,
      Writable: Value.false,
      Enumerable: Value.true,
      Configurable: Value.false,
    }));
    const rawValue = rawStrings[index];
    rawObj.DefineOwnProperty(prop, Descriptor({
      Value: rawValue,
      Writable: Value.false,
      Enumerable: Value.true,
      Configurable: Value.false,
    }));
    index += 1;
  }
  SetIntegrityLevel(rawObj, 'frozen');
  template.DefineOwnProperty(new Value('raw'), Descriptor({
    Value: rawObj,
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  SetIntegrityLevel(template, 'frozen');
  templateRegistry.push({ Site: templateLiteral, Array: template });
  return template;
}

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
