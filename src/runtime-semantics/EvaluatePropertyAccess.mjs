import { RequireObjectCoercible, GetValue, ToPropertyKey } from '../abstract-ops/all.mjs';
import { Value, Reference } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';

// https://tc39.es/proposal-optional-chaining
export function* EvaluateDynamicPropertyAccess(baseValue, expression, strict) {
  const propertyNameReference = yield* Evaluate(expression);
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = Q(ToPropertyKey(propertyNameValue));
  return new Reference({
    BaseValue: bv,
    ReferencedName: propertyKey,
    StrictReference: strict ? Value.true : Value.false,
  });
}

// https://tc39.es/proposal-optional-chaining
export function EvaluateStaticPropertyAccess(baseValue, identifierName, strict) {
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = new Value(identifierName.name);
  return new Reference({
    BaseValue: bv,
    ReferencedName: propertyNameString,
    StrictReference: strict ? Value.true : Value.false,
  });
}
