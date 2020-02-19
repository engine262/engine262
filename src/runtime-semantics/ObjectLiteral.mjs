import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { OrdinaryObjectCreate } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import {
  PropertyDefinitionEvaluation_PropertyDefinitionList,
} from './all.mjs';

// #sec-object-initializer-runtime-semantics-evaluation
//   ObjectLiteral :
//     `{` `}`
//     `{` PropertyDefinitionList `}`
//     `{` PropertyDefinitionList `,` `}`
export function* Evaluate_ObjectLiteral({ PropertyDefinitionList }) {
  // 1. Let obj be OrdinaryObjectCreate(%Object.prototype%).
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  if (PropertyDefinitionList.length === 0) {
    return obj;
  }
  // 2. Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList with arguments obj and true.
  Q(yield* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList, obj, Value.true));
  // 3. Return obj.
  return obj;
}
