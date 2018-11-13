import {
  GetValue,
  ToPropertyKey,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  isIdentifierName,
  isNumericLiteral,
  isStringLiteral,
} from '../ast.mjs';
import { Q, X } from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';
import { Value } from '../value.mjs';

// #sec-object-initializer-runtime-semantics-evaluation
//   LiteralPropertyName :
//     IdentifierName
//     StringLiteral
//     NumericLiteral
function Evaluate_LiteralPropertyName(LiteralPropertyName) {
  switch (true) {
    case isIdentifierName(LiteralPropertyName):
      return new Value(LiteralPropertyName.name);
    case isStringLiteral(LiteralPropertyName):
      return new Value(LiteralPropertyName.value);
    case isNumericLiteral(LiteralPropertyName): {
      const nbr = new Value(LiteralPropertyName.value);
      return X(ToString(nbr));
    }

    default:
      throw new OutOfRange('Evaluate_LiteralPropertyName', LiteralPropertyName);
  }
}

// #sec-object-initializer-runtime-semantics-evaluation
//   ComputedPropertyName : `[` AssignmentExpression `]`
function* Evaluate_ComputedPropertyName(ComputedPropertyName) {
  const AssignmentExpression = ComputedPropertyName;
  const exprValue = yield* Evaluate_Expression(AssignmentExpression);
  const propName = Q(GetValue(exprValue));
  return Q(ToPropertyKey(propName));
}

// #sec-object-initializer-runtime-semantics-evaluation
//   PropertyName :
//     LiteralPropertyName
//     ComputedPropertyName
//
// Note: We need some out-of-band information on whether the PropertyName is
// computed.
export function* Evaluate_PropertyName(PropertyName, computed) {
  return computed
    ? yield* Evaluate_ComputedPropertyName(PropertyName)
    : Evaluate_LiteralPropertyName(PropertyName);
}
