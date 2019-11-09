import {
  isActualMemberExpressionWithBrackets,
  isActualMemberExpressionWithDot,
} from '../ast.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { EvaluateDynamicPropertyAccess, EvaluateStaticPropertyAccess } from './all.mjs';

// 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `[` Expression `]`
//   CallExpression : CallExpression `[` Expression `]`
function* Evaluate_MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = yield* Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const strict = MemberExpression.strict;
  return Q(yield* EvaluateDynamicPropertyAccess(baseValue, Expression, strict));
}

// 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `.` IdentifierName
//   CallExpression : CallExpression `.` IdentifierName
function* Evaluate_MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = yield* Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const strict = MemberExpression.strict;
  return Q(EvaluateStaticPropertyAccess(baseValue, IdentifierName, strict));
}

// 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression :
//     MemberExpression `[` Expression `]`
//     MemberExpression `.` IdentifierName
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
