import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  GetValue,
  PutValue,
  ToNumeric,
} from '../abstract-ops/all.mjs';
import { TypeNumeric } from '../value.mjs';
import { Q, X } from '../completion.mjs';

// UpdateExpression :
//   LeftHandSideExpression `++`
//   LeftHandSideExpression `--`
//   `++` UnaryExpression
//   `--` UnaryExpression
export function* Evaluate_UpdateExpression({ LeftHandSideExpression, operator, UnaryExpression }) {
  switch (true) {
    // UpdateExpression : LeftHandSideExpression `++`
    case operator === '++' && LeftHandSideExpression !== null: {
      // 1. Let lhs be the result of evaluating LeftHandSideExpression.
      const lhs = yield* Evaluate(LeftHandSideExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(lhs)).
      const oldValue = Q(ToNumeric(Q(GetValue(lhs))));
      // 3. Let newValue be ! Type(oldvalue)::add(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeNumeric(oldValue).add(oldValue, TypeNumeric(oldValue).unit));
      // 4. Perform ? PutValue(lhs, newValue).
      Q(PutValue(lhs, newValue));
      // 5. Return oldValue.
      return oldValue;
    }

    // UpdateExpression : LeftHandSideExpression `--`
    case operator === '--' && LeftHandSideExpression !== null: {
      // 1. Let lhs be the result of evaluating LeftHandSideExpression.
      const lhs = yield* Evaluate(LeftHandSideExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(lhs)).
      const oldValue = Q(ToNumeric(Q(GetValue(lhs))));
      // 3. Let newValue be ! Type(oldvalue)::subtract(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeNumeric(oldValue).subtract(oldValue, TypeNumeric(oldValue).unit));
      // 4. Perform ? PutValue(lhs, newValue).
      Q(PutValue(lhs, newValue));
      // 5. Return oldValue.
      return oldValue;
    }

    // UpdateExpression : `++` UnaryExpression
    case operator === '++' && UnaryExpression !== null: {
      // 1. Let expr be the result of evaluating UnaryExpression.
      const expr = yield* Evaluate(UnaryExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
      const oldValue = Q(ToNumeric(Q(GetValue(expr))));
      // 3. Let newValue be ! Type(oldvalue)::add(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeNumeric(oldValue).add(oldValue, TypeNumeric(oldValue).unit));
      // 4. Perform ? PutValue(expr, newValue).
      Q(PutValue(expr, newValue));
      // 5. Return newValue.
      return newValue;
    }

    // UpdateExpression : `--` UnaryExpression
    case operator === '--' && UnaryExpression !== null: {
      // 1. Let expr be the result of evaluating UnaryExpression.
      const expr = yield* Evaluate(UnaryExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
      const oldValue = Q(ToNumeric(Q(GetValue(expr))));
      // 3. Let newValue be ! Type(oldvalue)::subtract(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeNumeric(oldValue).subtract(oldValue, TypeNumeric(oldValue).unit));
      // 4. Perform ? PutValue(expr, newValue).
      Q(PutValue(expr, newValue));
      // 5. Return newValue.
      return newValue;
    }

    default:
      throw new OutOfRange('Evaluate_UpdateExpression', operator);
  }
}
