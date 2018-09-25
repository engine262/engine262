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
import { New as NewValue } from '../value.mjs';
import { Q } from '../completion.mjs';

export function Evaluate_UpdateExpression({
  operator,
  prefix,
  argument,
}) {
  switch (true) {
    // UpdateExpression : LeftHandSideExpression `++`
    case operator === '++' && !prefix: {
      const LeftHandSideExpression = argument;

      const lhs = Evaluate_Expression(LeftHandSideExpression);
      const lhsValue = Q(GetValue(lhs));
      const oldValue = Q(ToNumber(lhsValue));
      const newValue = Q(EvaluateBinopValues_AdditiveExpression_Plus(oldValue, NewValue(1)));
      Q(PutValue(lhs, newValue));
      return oldValue;
    }

    // UpdateExpression : LeftHandSideExpression `--`
    case operator === '--' && !prefix: {
      const LeftHandSideExpression = argument;

      const lhs = Evaluate_Expression(LeftHandSideExpression);
      const oldValue = Q(ToNumber(Q(GetValue(lhs))));
      const newValue = Q(EvaluateBinopValues_AdditiveExpression_Minus(oldValue, NewValue(1)));
      Q(PutValue(lhs, newValue));
      return oldValue;
    }

    // UpdateExpression : `++` UnaryExpression
    case operator === '++' && prefix: {
      const UnaryExpression = argument;

      const expr = Evaluate_Expression(UnaryExpression);
      const oldValue = Q(ToNumber(Q(GetValue(expr))));
      const newValue = Q(EvaluateBinopValues_AdditiveExpression_Plus(oldValue, NewValue(1)));
      Q(PutValue(expr, newValue));
      return newValue;
    }

    // UpdateExpression : `--` UnaryExpression
    case operator === '--' && prefix: {
      const UnaryExpression = argument;

      const expr = Evaluate_Expression(UnaryExpression);
      const oldValue = Q(ToNumber(Q(GetValue(expr))));
      const newValue = Q(EvaluateBinopValues_AdditiveExpression_Minus(oldValue, NewValue(1)));
      Q(PutValue(expr, newValue));
      return newValue;
    }

    default:
      throw outOfRange('Evaluate_UpdateExpression', operator, prefix);
  }
}
