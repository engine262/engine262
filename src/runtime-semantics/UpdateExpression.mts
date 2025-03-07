// @ts-nocheck
import { Evaluate } from '../evaluator.mts';
import { OutOfRange } from '../helpers.mts';
import {
  GetValue,
  PutValue,
  ToNumeric,
} from '../abstract-ops/all.mts';
import { TypeForMethod } from '../value.mts';
import { Q, X } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

// UpdateExpression :
//   LeftHandSideExpression `++`
//   LeftHandSideExpression `--`
//   `++` UnaryExpression
//   `--` UnaryExpression
export function* Evaluate_UpdateExpression({ LeftHandSideExpression, operator, UnaryExpression }: ParseNode.UpdateExpression) {
  switch (true) {
    // UpdateExpression : LeftHandSideExpression `++`
    case operator === '++' && !!LeftHandSideExpression: {
      // 1. Let lhs be the result of evaluating LeftHandSideExpression.
      const lhs = yield* Evaluate(LeftHandSideExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(lhs)).
      const oldValue = Q(ToNumeric(Q(GetValue(lhs))));
      // 3. Let newValue be ! Type(oldvalue)::add(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeForMethod(oldValue).add(oldValue, TypeForMethod(oldValue).unit));
      // 4. Perform ? PutValue(lhs, newValue).
      Q(PutValue(lhs, newValue));
      // 5. Return oldValue.
      return oldValue;
    }

    // UpdateExpression : LeftHandSideExpression `--`
    case operator === '--' && !!LeftHandSideExpression: {
      // 1. Let lhs be the result of evaluating LeftHandSideExpression.
      const lhs = yield* Evaluate(LeftHandSideExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(lhs)).
      const oldValue = Q(ToNumeric(Q(GetValue(lhs))));
      // 3. Let newValue be ! Type(oldvalue)::subtract(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeForMethod(oldValue).subtract(oldValue, TypeForMethod(oldValue).unit));
      // 4. Perform ? PutValue(lhs, newValue).
      Q(PutValue(lhs, newValue));
      // 5. Return oldValue.
      return oldValue;
    }

    // UpdateExpression : `++` UnaryExpression
    case operator === '++' && !!UnaryExpression: {
      // 1. Let expr be the result of evaluating UnaryExpression.
      const expr = yield* Evaluate(UnaryExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
      const oldValue = Q(ToNumeric(Q(GetValue(expr))));
      // 3. Let newValue be ! Type(oldvalue)::add(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeForMethod(oldValue).add(oldValue, TypeForMethod(oldValue).unit));
      // 4. Perform ? PutValue(expr, newValue).
      Q(PutValue(expr, newValue));
      // 5. Return newValue.
      return newValue;
    }

    // UpdateExpression : `--` UnaryExpression
    case operator === '--' && !!UnaryExpression: {
      // 1. Let expr be the result of evaluating UnaryExpression.
      const expr = yield* Evaluate(UnaryExpression);
      // 2. Let oldValue be ? ToNumeric(? GetValue(expr)).
      const oldValue = Q(ToNumeric(Q(GetValue(expr))));
      // 3. Let newValue be ! Type(oldvalue)::subtract(oldValue, Type(oldValue)::unit).
      const newValue = X(TypeForMethod(oldValue).subtract(oldValue, TypeForMethod(oldValue).unit));
      // 4. Perform ? PutValue(expr, newValue).
      Q(PutValue(expr, newValue));
      // 5. Return newValue.
      return newValue;
    }

    default:
      throw new OutOfRange('Evaluate_UpdateExpression', operator);
  }
}
