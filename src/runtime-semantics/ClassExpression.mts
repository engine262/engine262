import { Value } from '../value.mts';
import { sourceTextMatchedBy, type ECMAScriptFunctionObject } from '../abstract-ops/all.mts';
import { Q } from '../completion.mts';
import { StringValue } from '../static-semantics/all.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import type { Mutable } from '../helpers.mts';
import type { ValueEvaluator } from '../evaluator.mts';
import { ClassDefinitionEvaluation } from './all.mts';

/** https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation */
// ClassExpression :
//   `class` ClassTail
//   `class` BindingIdentifier ClassTail
export function* Evaluate_ClassExpression(ClassExpression: ParseNode.ClassExpression): ValueEvaluator {
  const { BindingIdentifier, ClassTail } = ClassExpression;
  if (!BindingIdentifier) {
    // 1. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and ''
    const value = Q(yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, Value(''))) as Mutable<ECMAScriptFunctionObject>;
    // 2. Set value.[[SourceText]] to the source text matched by ClassExpression.
    value.SourceText = sourceTextMatchedBy(ClassExpression);
    // 3. Return value.
    return value;
  }
  // 1. Let className be StringValue of BindingIdentifier.
  const className = StringValue(BindingIdentifier);
  // 2. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments className and className.
  const value = Q(yield* ClassDefinitionEvaluation(ClassTail, className, className)) as Mutable<ECMAScriptFunctionObject>;
  // Set value.[[SourceText]] to the source text matched by ClassExpression.
  value.SourceText = sourceTextMatchedBy(ClassExpression);
  // Return value.
  return value;
}
