// @ts-nocheck
import {
  RequireObjectCoercible,
  GetValue,
  ToPropertyKey,
  Assert,
} from '../abstract-ops/all.mjs';
import { Value, ReferenceRecord } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { StringValue } from '../static-semantics/all.mjs';
import { Q } from '../completion.mjs';

/** https://tc39.es/ecma262/#sec-evaluate-expression-key-property-access */
export function* EvaluatePropertyAccessWithExpressionKey(baseValue, expression, strict) {
  // 1. Let propertyNameReference be the result of evaluating expression.
  const propertyNameReference = yield* Evaluate(expression);
  // 2. Let propertyNameValue be ? GetValue(propertyNameReference).
  const propertyNameValue = Q(GetValue(propertyNameReference));
  // 3. Let bv be ? RequireObjectCoercible(baseValue).
  const bv = Q(RequireObjectCoercible(baseValue));
  // 4. Let propertyKey be ? ToPropertyKey(propertyNameValue).
  const propertyKey = Q(ToPropertyKey(propertyNameValue));
  // 5. Return the Reference Record { [[Base]]: bv, [[ReferencedName]]: propertyKey, [[Strict]]: strict, [[ThisValue]]: empty }.
  return new ReferenceRecord({
    Base: bv,
    ReferencedName: propertyKey,
    Strict: strict ? Value.true : Value.false,
    ThisValue: undefined,
  });
}

/** https://tc39.es/ecma262/#sec-evaluate-identifier-key-property-access */
export function EvaluatePropertyAccessWithIdentifierKey(baseValue, identifierName, strict) {
  // 1. Assert: identifierName is an IdentifierName.
  Assert(identifierName.type === 'IdentifierName');
  // 2. Let bv be ? RequireObjectCoercible(baseValue).
  const bv = Q(RequireObjectCoercible(baseValue));
  // 3. Let propertyNameString be StringValue of IdentifierName
  const propertyNameString = StringValue(identifierName);
  // 4. Return the Reference Record { [[Base]]: bv, [[ReferencedName]]: propertyNameString, [[Strict]]: strict, [[ThisValue]]: empty }.
  return new ReferenceRecord({
    Base: bv,
    ReferencedName: propertyNameString,
    Strict: strict ? Value.true : Value.false,
    ThisValue: undefined,
  });
}
