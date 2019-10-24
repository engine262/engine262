import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  GetValue,
  PutValue,
  ToNumeric,
} from '../abstract-ops/all.mjs';
import { TypeNumeric } from '../value.mjs';
import { Q, X } from '../completion.mjs';

export function* Evaluate_UpdateExpression({
  operator,
  prefix,
  argument,
}) {
  switch (true) {
    // UpdateExpression : LeftHandSideExpression `++`
    case operator === '++' && !prefix: {
      const LeftHandSideExpression = argument;

      const lhs = yield* Evaluate(LeftHandSideExpression);
      const lhsValue = Q(GetValue(lhs));
      const oldValue = Q(ToNumeric(lhsValue));
      const newValue = X(TypeNumeric(oldValue).add(oldValue, TypeNumeric(oldValue).unit));
      Q(PutValue(lhs, newValue));
      return oldValue;
    }

    // UpdateExpression : LeftHandSideExpression `--`
    case operator === '--' && !prefix: {
      const LeftHandSideExpression = argument;

      const lhs = yield* Evaluate(LeftHandSideExpression);
      const lhsVal = Q(GetValue(lhs));
      const oldValue = Q(ToNumeric(lhsVal));
      const newValue = X(TypeNumeric(oldValue).subtract(oldValue, TypeNumeric(oldValue).unit));
      Q(PutValue(lhs, newValue));
      return oldValue;
    }

    // UpdateExpression : `++` UnaryExpression
    case operator === '++' && prefix: {
      const UnaryExpression = argument;

      const expr = yield* Evaluate(UnaryExpression);
      const exprVal = Q(GetValue(expr));
      const oldValue = Q(ToNumeric(exprVal));
      const newValue = X(TypeNumeric(oldValue).add(oldValue, TypeNumeric(oldValue).unit));
      Q(PutValue(expr, newValue));
      return newValue;
    }

    // UpdateExpression : `--` UnaryExpression
    case operator === '--' && prefix: {
      const UnaryExpression = argument;

      const expr = yield* Evaluate(UnaryExpression);
      const exprVal = Q(GetValue(expr));
      const oldValue = Q(ToNumeric(exprVal));
      const newValue = X(TypeNumeric(oldValue).subtract(oldValue, TypeNumeric(oldValue).unit));
      Q(PutValue(expr, newValue));
      return newValue;
    }

    default:
      throw new OutOfRange('Evaluate_UpdateExpression', operator, prefix);
  }
}
