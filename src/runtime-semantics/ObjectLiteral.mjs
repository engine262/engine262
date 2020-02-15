import {
  OrdinaryObjectCreate,
} from '../abstract-ops/all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q } from '../completion.mjs';
import {
  PropertyDefinitionEvaluation_PropertyDefinitionList,
} from './all.mjs';

// 12.2.6.7 #sec-object-initializer-runtime-semantics-evaluation
//   ObjectLiteral :
//     `{` `}`
//     `{` PropertyDefintionList `}`
//     `{` PropertyDefintionList `,` `}`
export function* Evaluate_ObjectLiteral(ObjectLiteral) {
  if (ObjectLiteral.properties.length === 0) {
    return OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  }

  const PropertyDefintionList = ObjectLiteral.properties;

  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  Q(yield* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefintionList, obj, true));
  return obj;
}
