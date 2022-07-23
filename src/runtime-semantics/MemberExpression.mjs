import { GetValue, MakePrivateReference, RequireObjectCoercible } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import {
  EvaluatePropertyAccessWithExpressionKey,
  EvaluatePropertyAccessWithIdentifierKey,
} from './all.mjs';

// 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `[` Expression `]`
//   CallExpression : CallExpression `[` Expression `]`
function* Evaluate_MemberExpression_Expression({ strict, MemberExpression, Expression }) {
  // 1. Let baseReference be the result of evaluating |MemberExpression|.
  const baseReference = yield* Evaluate(MemberExpression);
  // 2. Let baseValue be ? GetValue(baseReference).
  const baseValue = Q(GetValue(baseReference));
  // 3. If the code matched by this |MemberExpression| is strict mode code, let strict be true; else let strict be false.
  // 4. Return ? EvaluatePropertyAccessWithExpressionKey(baseValue, |Expression|, strict).
  return Q(yield* EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict));
}

// 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `.` IdentifierName
//   CallExpression : CallExpression `.` IdentifierName
function* Evaluate_MemberExpression_IdentifierName({ strict, MemberExpression, IdentifierName }) {
  // 1. Let baseReference be the result of evaluating |MemberExpression|.
  const baseReference = yield* Evaluate(MemberExpression);
  // 2. Let baseValue be ? GetValue(baseReference).
  const baseValue = Q(GetValue(baseReference));
  // 3. If the code matched by this |MemberExpression| is strict mode code, let strict be true; else let strict be false.
  // 4. Return ? EvaluatePropertyAccessWithIdentifierKey(baseValue, |IdentifierName|, strict).
  return Q(EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict));
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression `.` PrivateIdentifier
//   CallExpression : CallExpression `.` PrivateIdentifier
function* Evaluate_MemberExpression_PrivateIdentifier({ MemberExpression, PrivateIdentifier }) {
  // 1. Let baseReference be the result of evaluating MemberExpression.
  const baseReference = yield* Evaluate(MemberExpression);
  // 2. Let baseValue be ? GetValue(baseReference).
  const baseValue = Q(GetValue(baseReference));
  // 3. Let bv be ? RequireObjectCoercible(baseValue).
  const bv = Q(RequireObjectCoercible(baseValue));
  // 4. Let fieldNameString be the StringValue of PrivateIdentifier.
  const fieldNameString = StringValue(PrivateIdentifier);
  // 5. Return ! MakePrivateReference(bv, fieldNameString).
  return X(MakePrivateReference(bv, fieldNameString));
}

// 12.3.2.1 #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression :
//     MemberExpression `[` Expression `]`
//     MemberExpression `.` IdentifierName
//   CallExpression :
//     CallExpression `[` Expression `]`
//     CallExpression `.` IdentifierName
export function Evaluate_MemberExpression(MemberExpression) {
  switch (true) {
    case !!MemberExpression.Expression:
      return Evaluate_MemberExpression_Expression(MemberExpression);
    case !!MemberExpression.IdentifierName:
      return Evaluate_MemberExpression_IdentifierName(MemberExpression);
    case !!MemberExpression.PrivateIdentifier:
      return Evaluate_MemberExpression_PrivateIdentifier(MemberExpression);
    default:
      throw new OutOfRange('Evaluate_MemberExpression', MemberExpression);
  }
}
