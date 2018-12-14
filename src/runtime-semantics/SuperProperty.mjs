import { Evaluate } from '../evaluator.mjs';
import {
  Assert,
  GetThisEnvironment,
  GetValue,
  RequireObjectCoercible,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { SuperReference, Value } from '../value.mjs';
import { Q } from '../completion.mjs';

// #sec-makesuperpropertyreference
function MakeSuperPropertyReference(actualThis, propertyKey, strict) {
  const env = GetThisEnvironment();
  Assert(env.HasSuperBinding() === Value.true);
  const baseValue = Q(env.GetSuperBase());
  const bv = Q(RequireObjectCoercible(baseValue));
  return new SuperReference(bv, propertyKey, actualThis, strict ? Value.true : Value.false);
}

// #sec-super-keyword-runtime-semantics-evaluation
// SuperProperty :
//   `super` `[` Expression `]`
//   `super` `.` IdentifierName
export function* Evaluate_SuperProperty(SuperProperty) {
  if (SuperProperty.computed) {
    const Expression = SuperProperty.property;

    const env = GetThisEnvironment();
    const actualThis = Q(env.GetThisBinding());
    const propertyNameReference = yield* Evaluate(Expression);
    const propertyNameValue = Q(GetValue(propertyNameReference));
    const propertyKey = Q(ToPropertyKey(propertyNameValue));
    const strict = SuperProperty.strict;
    return Q(MakeSuperPropertyReference(actualThis, propertyKey, strict));
  } else {
    const IdentifierName = SuperProperty.property;

    const env = GetThisEnvironment();
    const actualThis = Q(env.GetThisBinding());
    const propertyKey = new Value(IdentifierName.name);
    const strict = SuperProperty.strict;
    return Q(MakeSuperPropertyReference(actualThis, propertyKey, strict));
  }
}
