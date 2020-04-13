import { Value } from '../value.mjs';
import { sourceTextMatchedBy } from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { ClassDefinitionEvaluation } from './all.mjs';

// #sec-class-definitions-runtime-semantics-evaluation
// ClassExpression :
//   `class` ClassTail
//   `class` BindingIdentifier ClassTail
export function* Evaluate_ClassExpression(ClassExpression) {
  const { BindingIdentifier, ClassTail } = ClassExpression;
  if (BindingIdentifier === null) {
    // 1. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and ''
    const value = Q(yield* ClassDefinitionEvaluation(ClassTail, Value.undefined, new Value('')));
    // 2. Set value.[[SourceText]] to the source text matched by ClassExpression.
    value.SourceText = sourceTextMatchedBy(ClassExpression);
    // 3. Return value.
    return value;
  }
  // 1. Let className be StringValue of BindingIdentifier.
  const className = StringValue(BindingIdentifier);
  // 2. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments className and className.
  const value = Q(yield* ClassDefinitionEvaluation(ClassTail, className, className));
  // Set value.[[SourceText]] to the source text matched by ClassExpression.
  value.SourceText = sourceTextMatchedBy(ClassExpression);
  // Return value.
  return value;
}
