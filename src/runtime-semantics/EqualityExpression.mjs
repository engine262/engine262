import {
  AbstractEqualityComparison,
  GetValue,
  StrictEqualityComparison,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { New as NewValue } from '../value.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-equality-operators-runtime-semantics-evaluation
// EqualityExpression :
//   EqualityExpression `==` RelationalExpression
//   EqualityExpression `!=` RelationalExpression
//   EqualityExpression `===` RelationalExpression
//   EqualityExpression `!==` RelationalExpression
export function Evaluate_EqualityExpression({
  left: EqualityExpression,
  operator,
  right: RelationalExpression,
}) {
  const lref = Evaluate_Expression(EqualityExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate_Expression(RelationalExpression);
  const rval = Q(GetValue(rref));

  switch (operator) {
    case '==':
      return AbstractEqualityComparison(rval, lval);
    case '!=': {
      const r = AbstractEqualityComparison(rval, lval);
      if (r.isTrue()) {
        return NewValue(false);
      } else {
        return NewValue(true);
      }
    }
    case '===':
      return StrictEqualityComparison(rval, lval);
    case '!==': {
      const r = StrictEqualityComparison(rval, lval);
      if (r.isTrue()) {
        return NewValue(false);
      } else {
        return NewValue(true);
      }
    }

    default:
      throw outOfRange('Evaluate_EqualityExpression', operator);
  }
}
