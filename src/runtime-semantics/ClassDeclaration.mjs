import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { Q, NormalCompletion } from '../completion.mjs';
import { InitializeBoundName, ClassDefinitionEvaluation } from './all.mjs';

// #sec-runtime-semantics-bindingclassdeclarationevaluation
//   ClassDeclaration :
//     `class` BindingIdentifier ClassTail
//     `class` ClassTail
function* BindingClassDeclarationEvaluation(ClassDeclaration) {
  const { BindingIdentifier, ClassTail } = ClassDeclaration;
  if (BindingIdentifier === null) {
    // 1. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and "default".
    const value = Q(yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, new Value('default')));
    // 2. Set value.[[SourceText]] to the source text matched by ClassDeclaration.
    value.SourceText = sourceTextMatchedBy(ClassDeclaration);
    // 3. Return value.
    return value;
  }
  // 1. Let className be StringValue of BindingIdentifier.
  const className = StringValue(BindingIdentifier);
  // 2. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments className and className.
  const value = Q(yield* ClassDefinitionEvaluation(ClassTail, className, className));
  // 3. Set value.[[SourceText]] to the source text matched by ClassDeclaration.
  value.SourceText = sourceTextMatchedBy(ClassDeclaration);
  // 4. Let env be the running execution context's LexicalEnvironment.
  const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 5. Perform ? InitializeBoundName(className, value, env).
  Q(InitializeBoundName(className, value, env));
  // 6. Return value.
  return value;
}

// #sec-class-definitions-runtime-semantics-evaluation
//   ClassDeclaration : `class` BindingIdentifier ClassTAil
export function* Evaluate_ClassDeclaration(ClassDeclaration) {
  // 1. Perform ? BindingClassDeclarationEvaluation of this ClassDeclaration.
  Q(yield* BindingClassDeclarationEvaluation(ClassDeclaration));
  // 2. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
