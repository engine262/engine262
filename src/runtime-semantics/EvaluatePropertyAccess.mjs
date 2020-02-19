import {
  RequireObjectCoercible,
  GetValue,
  ToPropertyKey,
  Assert,
} from '../abstract-ops/all.mjs';
import { Value, Reference } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { Q } from '../completion.mjs';

// #sec-evaluate-expression-key-property-access
export function* EvaluatePropertyAccessWithExpressionKey(baseValue, expression, strict) {
  // 1. Let propertyNameReference be the result of evaluating expression.
  const propertyNameReference = yield* Evaluate(expression);
  // 2. Let propertyNameValue be ? GetValue(propertyNameReference).
  const propertyNameValue = Q(GetValue(propertyNameReference));
  // 3. Let bv be ? RequireObjectCoercible(baseValue).
  const bv = Q(RequireObjectCoercible(baseValue));
  // 4. Let propertyKey be ? ToPropertyKey(propertyNameValue).
  const propertyKey = Q(ToPropertyKey(propertyNameValue));
  // 5. Return a value of type Reference whose base value component is bv, whose
  //    referenced name component is propertyKey, and whose strict reference flag is strict.
  return new Reference({
    BaseValue: bv,
    ReferencedName: propertyKey,
    StrictReference: strict ? Value.true : Value.false,
  });
}

// #sec-evaluate-identifier-key-property-access
export function EvaluatePropertyAccessWithIdentifierKey(baseValue, identifierName, strict) {
  // 1. Assert: identifierName is an IdentifierName.
  Assert(identifierName.type === 'IdentifierName');
  // 2. Let bv be ? RequireObjectCoercible(baseValue).
  const bv = Q(RequireObjectCoercible(baseValue));
  // 3. Let propertyNameString be StringValue of IdentifierName
  const propertyNameString = StringValue(identifierName);
  // 4. Return a value of type Reference whose base value component is bv, whose
  //    referenced name component is propertyNameString, and whose strict reference flag is strict.
  return new Reference({
    BaseValue: bv,
    ReferencedName: propertyNameString,
    StrictReference: strict ? Value.true : Value.false,
  });
}
