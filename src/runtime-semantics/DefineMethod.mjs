import { surroundingAgent } from '../engine.mjs';
import { OrdinaryFunctionCreate, MakeMethod, sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate_PropertyName } from './all.mjs';

// #sec-runtime-semantics-definemethod
export function* DefineMethod(MethodDefinition, object, functionPrototype) {
  const { ClassElementName, UniqueFormalParameters, FunctionBody } = MethodDefinition;
  // 1. Let propKey be the result of evaluating ClassElementName.
  const propKey = yield* Evaluate_PropertyName(ClassElementName);
  // 2. ReturnIfAbrupt(propKey).
  ReturnIfAbrupt(propKey);
  // 3. Let scope be the running execution context's LexicalEnvironment.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  let prototype;
  // 5. If functionPrototype is present as a parameter, then
  if (functionPrototype !== undefined) {
    // a. Let prototype be functionPrototype.
    prototype = functionPrototype;
  } else { // 6. Else,
    // a. Let prototype be %Function.prototype%.
    prototype = surroundingAgent.intrinsic('%Function.prototype%');
  }
  // 7. Let sourceText be the source text matched by MethodDefinition.
  const sourceText = sourceTextMatchedBy(MethodDefinition);
  // 8. Let closure be OrdinaryFunctionCreate(prototype, sourceText, UniqueFormalParameters, FunctionBody, non-lexical-this, scope, privateScope).
  const closure = OrdinaryFunctionCreate(prototype, sourceText, UniqueFormalParameters, FunctionBody, 'non-lexical-this', scope, privateScope);
  // 9. Perform MakeMethod(closure, object).
  MakeMethod(closure, object);
  // 10. Return the Record { [[Key]]: propKey, [[Closure]]: closure }.
  return { Key: propKey, Closure: closure };
}
