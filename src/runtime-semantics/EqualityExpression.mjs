import {
  AbstractEqualityComparison,
  GetValue,
  StrictEqualityComparison,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';

// 12.11.3 #sec-equality-operators-runtime-semantics-evaluation
// EqualityExpression :
//   EqualityExpression `==` RelationalExpression
//   EqualityExpression `!=` RelationalExpression
//   EqualityExpression `===` RelationalExpression
//   EqualityExpression `!==` RelationalExpression
export function* Evaluate_EqualityExpression({
  left: EqualityExpression,
  operator,
  right: RelationalExpression,
}) {
  const lref = yield* Evaluate(EqualityExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate(RelationalExpression);
  const rval = Q(GetValue(rref));

  switch (operator) {
    case '==':
      return AbstractEqualityComparison(rval, lval);
    case '!=': {
      const r = Q(AbstractEqualityComparison(rval, lval));
      if (r === Value.true) {
        return Value.false;
      } else {
        return Value.true;
      }
    }
    case '===':
      return StrictEqualityComparison(rval, lval);
    case '!==': {
      const r = X(StrictEqualityComparison(rval, lval));
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
