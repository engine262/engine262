import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  GetValue,
  PutValue,
  ToNumber,
} from '../abstract-ops/all.mjs';
import {
  EvaluateBinopValues_AdditiveExpression_Plus,
  EvaluateBinopValues_AdditiveExpression_Minus,
} from './all.mjs';
import { Value } from '../value.mjs';
import { Q } from '../completion.mjs';

export function* Evaluate_UpdateExpression({
  operator,
  prefix,
  argument,
}) {
  switch (true) {
    // UpdateExpression : LeftHandSideExpression `++`
    case operator === '++' && !prefix: {
      const LeftHandSideExpression = argument;

      const lhs = yield* Evaluate_Expression(LeftHandSideExpression);
      const lhsValue = Q(GetValue(lhs));
      const oldValue = Q(ToNumber(lhsValue));
      const newValue = EvaluateBinopValues_AdditiveExpression_Plus(oldValue, new Value(1));
      Q(PutValue(lhs, newValue));
      return oldValue;
    }

    // UpdateExpression : LeftHandSideExpression `--`
    case operator === '--' && !prefix: {
      const LeftHandSideExpression = argument;

      const lhs = yield* Evaluate_Expression(LeftHandSideExpression);
      const lhsVal = Q(GetValue(lhs));
      const oldValue = Q(ToNumber(lhsVal));
      const newValue = EvaluateBinopValues_AdditiveExpression_Minus(oldValue, new Value(1));
      Q(PutValue(lhs, newValue));
      return oldValue;
    }

    // UpdateExpression : `++` UnaryExpression
    case operator === '++' && prefix: {
      const UnaryExpression = argument;

      const expr = yield* Evaluate_Expression(UnaryExpression);
      const exprVal = Q(GetValue(expr));
      const oldValue = Q(ToNumber(exprVal));
      const newValue = EvaluateBinopValues_AdditiveExpression_Plus(oldValue, new Value(1));
      Q(PutValue(expr, newValue));
      return newValue;
    }

    // UpdateExpression : `--` UnaryExpression
    case operator === '--' && prefix: {
      const UnaryExpression = argument;

      const expr = yield* Evaluate_Expression(UnaryExpression);
      const exprVal = Q(GetValue(expr));
      const oldValue = Q(ToNumber(exprVal));
      const newValue = EvaluateBinopValues_AdditiveExpression_Minus(oldValue, new Value(1));
      Q(PutValue(expr, newValue));
      return newValue;
    }

    default:
      throw outOfRange('Evaluate_UpdateExpression', operator, prefix);
  }
}
