import { Evaluate, type ExpressionEvaluator } from '../evaluator.mts';
import {
  ReferenceRecord, Value, type PropertyKeyValue,
} from '../value.mts';
import {
  Assert,
  GetThisEnvironment,
  GetValue,
  ToPropertyKey,
} from '../abstract-ops/all.mts';
import { StringValue } from '../static-semantics/all.mts';
import { Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { FunctionEnvironmentRecord } from '#self';

/** https://tc39.es/ecma262/#sec-makesuperpropertyreference */
function MakeSuperPropertyReference(actualThis: Value, propertyKey: PropertyKeyValue, strict: boolean) {
  // 1. Let env be GetThisEnvironment().
  const env = GetThisEnvironment();
  // 2. Assert: env.HasSuperBinding() is true.
  Assert(env.HasSuperBinding() === Value.true);
  // 3. Assert: env is a Function Environment Record.
  Assert(env instanceof FunctionEnvironmentRecord);
  // 4. Let baseValue be ? env.GetSuperBase().
  const baseValue = Q(env.GetSuperBase());
  // 5. Return the Reference Record { [[Base]]: baseValue, [[ReferencedName]]: propertyKey, [[Strict]]: strict, [[ThisValue]]: actualThis }.
  return new ReferenceRecord({
    Base: baseValue,
    ReferencedName: propertyKey,
    Strict: strict ? Value.true : Value.false,
    ThisValue: actualThis,
  });
}

/** https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation */
//  SuperProperty :
//    `super` `[` Expression `]`
//    `super` `.` IdentifierName
export function* Evaluate_SuperProperty({ Expression, IdentifierName, strict }: ParseNode.SuperProperty): ExpressionEvaluator {
  // 1. Let env be GetThisEnvironment().
  const env = GetThisEnvironment();
  // 2. Let actualThis be ? env.GetThisBinding().
  const actualThis = Q(env.GetThisBinding());
  if (Expression) {
    // 3. Let propertyNameReference be the result of evaluating Expression.
    const propertyNameReference = yield* Evaluate(Expression);
    // 4. Let propertyNameReference be the result of evaluating Expression.
    const propertyNameValue = Q(yield* GetValue(propertyNameReference));
    // 5. Let propertyNameValue be ? GetValue(propertyNameReference).
    const propertyKey = Q(yield* ToPropertyKey(propertyNameValue));
    // 6. If the code matched by this SuperProperty is strict mode code, let strict be true; else let strict be false.
    // 7. Return ? MakeSuperPropertyReference(actualThis, propertyKey, strict).
    return Q(MakeSuperPropertyReference(actualThis, propertyKey, strict));
  } else {
    // 3. Let propertyKey be StringValue of IdentifierName.
    const propertyKey = StringValue(IdentifierName!);
    // 4. const strict = SuperProperty.strict;
    // 5. Return ? MakeSuperPropertyReference(actualThis, propertyKey, strict).
    return Q(MakeSuperPropertyReference(actualThis, propertyKey, strict));
  }
}
