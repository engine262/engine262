import { surroundingAgent } from '../engine.mjs';
import { Evaluate_PropertyName } from './all.mjs';
import { MakeMethod, FunctionCreate } from '../abstract-ops/all.mjs';
import { ReturnIfAbrupt } from '../completion.mjs';

// #sec-runtime-semantics-definemethod
// MethodDefinition : PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
export function* DefineMethod(MethodDefinition, object, functionPrototype) {
  const PropertyName = MethodDefinition.key;
  const UniqueFormalParameters = MethodDefinition.value.params;

  const propKey = yield* Evaluate_PropertyName(PropertyName);
  ReturnIfAbrupt(propKey);
  // If the function code for this MethodDefinition is strict mode code, let strict be true. Otherwise let strict be false.
  const strict = true;
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  let kind;
  let prototype;
  if (functionPrototype !== undefined) {
    kind = 'Normal';
    prototype = functionPrototype;
  } else {
    kind = 'Method';
    prototype = surroundingAgent.intrinsic('%FunctionPrototype%');
  }
  const closure = FunctionCreate(kind, UniqueFormalParameters, MethodDefinition.value, scope, strict, prototype);
  MakeMethod(closure, object);
  return {
    Key: propKey,
    Closure: closure,
  };
}
