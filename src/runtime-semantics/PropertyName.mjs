import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { StringValue, NumericValue } from '../static-semantics/all.mjs';
import {
  Assert,
  ToString,
  GetValue,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
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
    case 'PrivateIdentifier': {
      // 1. Let privateIdentifier be StringValue of PrivateIdentifier.
      const privateIdentifier = StringValue(PropertyName);
      // 2. Let privateEnvRec be the running execution context's PrivateEnvironment.
      const privateEnvRec = surroundingAgent.runningExecutionContext.PrivateEnvironment;
      // 3. Let names be privateEnvRec.[[Names]].
      const names = privateEnvRec.Names;
      // 4. Assert: Exactly one element of names is a Private Name whose [[Description]] is privateIdentifier.
      // 5. Let privateName be the Private Name in names whose [[Description]] is privateIdentifier.
      const privateName = names.find((n) => n.Description.stringValue() === privateIdentifier.stringValue());
      Assert(privateName);
      // 6. Return privateName.
      return privateName;
    }
    default: {
      // 1. Let exprValue be the result of evaluating AssignmentExpression.
      const exprValue = yield* Evaluate(PropertyName.ComputedPropertyName);
      // 2. Let propName be ? GetValue(exprValue).
      const propName = Q(GetValue(exprValue));
      // 3. Return ? ToPropertyKey(propName).
      return Q(ToPropertyKey(propName));
    }
  }
}
