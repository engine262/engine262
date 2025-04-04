import { surroundingAgent } from '../host-defined/engine.mts';
import { Value } from '../value.mts';
import { sourceTextMatchedBy } from '../abstract-ops/all.mts';
import { StringValue } from '../static-semantics/all.mts';
import { Q, NormalCompletion } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { PlainEvaluator, ValueEvaluator } from '../evaluator.mts';
import { InitializeBoundName, ClassDefinitionEvaluation } from './all.mts';

/** https://tc39.es/ecma262/#sec-runtime-semantics-bindingclassdeclarationevaluation */
//   ClassDeclaration :
//     `class` BindingIdentifier ClassTail
//     `class` ClassTail
export function* BindingClassDeclarationEvaluation(ClassDeclaration: ParseNode.ClassDeclaration): ValueEvaluator {
  const { BindingIdentifier, ClassTail } = ClassDeclaration;
  if (!BindingIdentifier) {
    // 1. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and "default".
    const value = Q(yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, Value('default')));
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
  Q(yield* InitializeBoundName(className, value, env));
  // 6. Return value.
  return value;
}

/** https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation */
//   ClassDeclaration : `class` BindingIdentifier ClassTAil
export function* Evaluate_ClassDeclaration(ClassDeclaration: ParseNode.ClassDeclaration): PlainEvaluator {
  // 1. Perform ? BindingClassDeclarationEvaluation of this ClassDeclaration.
  Q(yield* BindingClassDeclarationEvaluation(ClassDeclaration));
  // 2. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}
