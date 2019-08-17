import { RequireObjectCoercible, GetValue, ToPropertyKey } from '../abstract-ops/all.mjs';
import { Value, Type, Reference } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { ArrayProto_slice } from '../intrinsics/ArrayPrototype.mjs';
import { StringProto_slice } from '../intrinsics/StringPrototype.mjs';
import { Q } from '../completion.mjs';

// https://tc39.es/proposal-optional-chaining
export function* EvaluateDynamicPropertyAccess(baseValue, expression, strict) {
  if (expression.type === 'SliceExpression') {
    let start, end;
    if (expression.startIndex){
      const startPropertyRef = yield* Evaluate(expression.startIndex);
      start = Q(GetValue(startPropertyRef));
    }
    if (expression.endIndex) {
      const endPropertyRef = yield* Evaluate(expression.endIndex);
      end = Q(GetValue(endPropertyRef));
    }

    const bv = Q(RequireObjectCoercible(baseValue));

    return Type(bv) === 'String'
      ? StringProto_slice([start, end], {thisValue: bv})
      : ArrayProto_slice([start, end], {thisValue: bv});
  }
  
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
