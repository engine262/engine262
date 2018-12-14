import {
  isActualMemberExpressionWithBrackets,
  isActualMemberExpressionWithDot,
} from '../ast.mjs';
import {
  GetValue,
  RequireObjectCoercible,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import {
  Reference,
  Value,
} from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `[` Expression `]`
//   CallExpression : CallExpression `[` Expression `]`
function* Evaluate_MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = yield* Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const propertyNameReference = yield* Evaluate(Expression);
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = Q(ToPropertyKey(propertyNameValue));
  const strict = MemberExpression.strict;
  return new Reference(bv, propertyKey, strict ? Value.true : Value.false);
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `.` IdentifierName
//   CallExpression : CallExpression `.` IdentifierName
function* Evaluate_MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = yield* Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = new Value(IdentifierName.name);
  const strict = MemberExpression.strict;
  return new Reference(bv, propertyNameString, strict);
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression :
//     MemberExpression `[` Expression `]`
//     MemberEXpression `.` IdentifierName
//   CallExpression :
//     CallExpression `[` Expression `]`
//     CallExpression `.` IdentifierName
export function* Evaluate_MemberExpression(MemberExpression) {
  switch (true) {
    case isActualMemberExpressionWithBrackets(MemberExpression):
      return yield* Evaluate_MemberExpression_Expression(
        MemberExpression.object, MemberExpression.property,
      );
    case isActualMemberExpressionWithDot(MemberExpression):
      return yield* Evaluate_MemberExpression_IdentifierName(
        MemberExpression.object, MemberExpression.property,
      );
    default:
      throw new OutOfRange('Evaluate_MemberExpression', MemberExpression);
  }
}
