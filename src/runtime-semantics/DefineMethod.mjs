import { surroundingAgent } from '../engine.mjs';
import {
  FunctionCreate,
  MakeMethod,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { ReturnIfAbrupt, X } from '../completion.mjs';
import { Evaluate_PropertyName } from './all.mjs';

// 14.3.7 #sec-runtime-semantics-definemethod
// MethodDefinition : PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
export function* DefineMethod(MethodDefinition, object, functionPrototype) {
  const PropertyName = MethodDefinition.key;
  const UniqueFormalParameters = MethodDefinition.value.params;

  const propKey = yield* Evaluate_PropertyName(PropertyName, MethodDefinition.computed);
  ReturnIfAbrupt(propKey);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  let kind;
  let prototype;
  if (functionPrototype !== undefined) {
    kind = 'Normal';
    prototype = functionPrototype;
  } else {
    kind = 'Method';
    prototype = surroundingAgent.intrinsic('%Function.prototype%');
  }
  const closure = FunctionCreate(kind, UniqueFormalParameters, MethodDefinition.value, scope, prototype);
  X(MakeMethod(closure, object));
  closure.SourceText = sourceTextMatchedBy(MethodDefinition);
  return {
    Key: propKey,
    Closure: closure,
  };
}
