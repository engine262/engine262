import {
  surroundingAgent,
} from '../engine.mjs';
import {
  isMemberExpressionWithDot,
  isMemberExpressionWithBrackets,
} from '../ast.mjs';
import {
  GetValue,
  RequireObjectCoercible,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  New as NewValue,
  Reference,
} from '../value.mjs';

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression [ Expression ]
export function Evaluate_MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const propertyNameReference = Evaluate(Expression);
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = ToPropertyKey(propertyNameValue);
  const strict = surroundingAgent.isStrictCode;
  return new Reference(bv, propertyKey, NewValue(strict));
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression . IdentifierName
export function Evaluate_MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = NewValue(IdentifierName.name);
  const strict = true;
  return new Reference(bv, propertyNameString, NewValue(strict));
}

// #sec-property-accessors-runtime-semantics-evaluation
// MemberExpression :
//   MemberExpression [ Expression ]
//   MemberEXpression . IdentifierName
export function Evaluate_MemberExpression(MemberExpression) {
  switch (true) {
    case isMemberExpressionWithBrackets(MemberExpression):
      return Evaluate_MemberExpression_Expression(
        MemberExpression.object, MemberExpression.property,
      );
    case isMemberExpressionWithDot(MemberExpression):
      return Evaluate_MemberExpression_IdentifierName(
        MemberExpression.object, MemberExpression.property,
      );
    default:
      throw new RangeError();
  }
}
