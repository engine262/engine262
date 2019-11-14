import { surroundingAgent } from '../engine.mjs';
import {
  OrdinaryFunctionCreate,
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
  let prototype;
  if (functionPrototype !== undefined) {
    prototype = functionPrototype;
  } else {
    prototype = surroundingAgent.intrinsic('%Function.prototype%');
  }
  const closure = X(OrdinaryFunctionCreate(prototype, UniqueFormalParameters, MethodDefinition.value, 'non-lexical-this', scope));
  X(MakeMethod(closure, object));
  closure.SourceText = sourceTextMatchedBy(MethodDefinition);
  return {
    Key: propKey,
    Closure: closure,
  };
}
