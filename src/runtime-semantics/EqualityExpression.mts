import {
  AbstractEqualityComparison,
  GetValue,
  IsStrictlyEqual,
} from '../abstract-ops/all.mts';
import { ReturnIfAbrupt, Q, X } from '../completion.mts';
import { Evaluate } from '../evaluator.mts';
import { Value } from '../value.mts';
import { OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

/** https://tc39.es/ecma262/#sec-equality-operators-runtime-semantics-evaluation */
//   EqualityExpression :
//     EqualityExpression `==` RelationalExpression
//     EqualityExpression `!=` RelationalExpression
//     EqualityExpression `===` RelationalExpression
//     EqualityExpression `!==` RelationalExpression
export function* Evaluate_EqualityExpression({ EqualityExpression, operator, RelationalExpression }: ParseNode.EqualityExpression) {
  // 1. Let lref be the result of evaluating EqualityExpression.
  const lref = yield* Evaluate(EqualityExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating RelationalExpression.
  const rref = yield* Evaluate(RelationalExpression);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));
  switch (operator) {
    case '==':
      // 5. Return the result of performing Abstract Equality Comparison rval == lval.
      return AbstractEqualityComparison(rval, lval);
    case '!=': {
      // 5. Let r be the result of performing Abstract Equality Comparison rval == lval.
      const r = AbstractEqualityComparison(rval, lval);
      // 6. ReturnIfAbrupt(r).
      ReturnIfAbrupt(r);
      // 7. If r is true, return false. Otherwise, return true.
      if (r === Value.true) {
        return Value.false;
      } else {
        return Value.true;
      }
    }
    case '===':
      // 5. Return the result of performing Strict Equality Comparison rval === lval.
      return IsStrictlyEqual(rval, lval);
    case '!==': {
      // 5. Let r be the result of performing Strict Equality Comparison rval === lval.
      // 6. Assert: r is a normal completion.
      const r = X(IsStrictlyEqual(rval, lval));
      // 7. If r.[[Value]] is true, return false. Otherwise, return true.
      if (r === Value.true) {
        return Value.false;
      } else {
        return Value.true;
      }
    }

    default:
      throw new OutOfRange('Evaluate_EqualityExpression', operator);
  }
}
