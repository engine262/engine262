import {
  surroundingAgent,
} from '../engine.mjs';
import {
  isActualMemberExpressionWithBrackets,
  isActualMemberExpressionWithDot,
} from '../ast.mjs';
import {
  GetValue,
  RequireObjectCoercible,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  New as NewValue,
  Reference,
} from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `[` Expression `]`
//   CallExpression : CallExpression `[` Expression `]`
export function Evaluate_MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = Q(Evaluate_Expression(MemberExpression));
  const baseValue = Q(GetValue(baseReference));
  const propertyNameReference = Q(Evaluate_Expression(Expression));
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = Q(ToPropertyKey(propertyNameValue));
  const strict = surroundingAgent.isStrictCode;
  return new Reference(bv, propertyKey, NewValue(strict));
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `.` IdentifierName
//   CallExpression : CallExpression `.` IdentifierName
export function Evaluate_MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = Q(Evaluate_Expression(MemberExpression));
  const baseValue = Q(GetValue(baseReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = NewValue(IdentifierName.name);
  const strict = true; // TODO(IsStrict)
  return new Reference(bv, propertyNameString, NewValue(strict));
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression :
//     MemberExpression `[` Expression `]`
//     MemberEXpression `.` IdentifierName
//   CallExpression :
//     CallExpression `[` Expression `]`
//     CallExpression `.` IdentifierName
export function Evaluate_MemberExpression(MemberExpression) {
  switch (true) {
    case isActualMemberExpressionWithBrackets(MemberExpression):
      return Evaluate_MemberExpression_Expression(
        MemberExpression.object, MemberExpression.property,
      );
    case isActualMemberExpressionWithDot(MemberExpression):
      return Evaluate_MemberExpression_IdentifierName(
        MemberExpression.object, MemberExpression.property,
      );
    default:
      throw outOfRange('Evaluate_MemberExpression', MemberExpression);
  }
}
