import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { StringValue, NumericValue } from '../static-semantics/all.mjs';
import { ToString, GetValue, ToPropertyKey } from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';

// #sec-object-initializer-runtime-semantics-evaluation
// PropertyName :
//   LiteralPropertyName
//   ComputedPropertyName
// LiteralPropertyName :
//   IdentifierName
//   StringLiteral
//   NumericLiteral
// ComputedPropertyName :
//   `[` AssignmentExpression `]`
export function* Evaluate_PropertyName(PropertyName) {
  switch (PropertyName.type) {
    case 'IdentifierName':
      return StringValue(PropertyName);
    case 'StringLiteral':
      return new Value(PropertyName.value);
    case 'NumericLiteral': {
      // 1. Let nbr be the NumericValue of NumericLiteral.
      const nbr = NumericValue(PropertyName);
      // 2. Return ! ToString(nbr).
      return X(ToString(nbr));
    }
    default: {
      // 1. Let exprValue be the result of evaluating AssignmentExpression.
      const exprValue = yield* Evaluate(PropertyName);
      // 2. Let propName be ? GetValue(exprValue).
      const propName = Q(GetValue(exprValue));
      // 3. Return ? ToPropertyKey(propName).
      return Q(ToPropertyKey(propName));
    }
  }
}
