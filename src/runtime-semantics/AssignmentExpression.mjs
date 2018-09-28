import { Q, ReturnIfAbrupt } from '../completion.mjs';
import {
  GetReferencedName,
  GetValue,
  HasOwnProperty,
  PutValue,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
} from '../static-semantics/all.mjs';
import {
  isArrayLiteral,
  isObjectLiteral,
} from '../ast.mjs';
import { EvaluateBinopValues, Evaluate_Expression } from '../evaluator.mjs';
import { New as NewValue } from '../value.mjs';

// #sec-assignment-operators-runtime-semantics-evaluation
// AssignmentExpression :
//   LeftHandSideExpression = AssignmentExpression
//   LeftHandSideExpression AssignmentOperator AssignmentExpression
export function* Evaluate_AssignmentExpression(node) {
  const LeftHandSideExpression = node.left;
  const AssignmentExpression = node.right;
  if (node.operator === '=') {
    if (!isObjectLiteral(LeftHandSideExpression) && !isArrayLiteral(LeftHandSideExpression)) {
      const lref = yield* Evaluate_Expression(LeftHandSideExpression);
      ReturnIfAbrupt(lref);
      const rref = yield* Evaluate_Expression(AssignmentExpression);
      const rval = Q(GetValue(rref));
      if (IsAnonymousFunctionDefinition(AssignmentExpression)
          && IsIdentifierRef(LeftHandSideExpression)) {
        const hasNameProperty = Q(HasOwnProperty(rval, NewValue('name')));
        if (hasNameProperty.isFalse()) {
          SetFunctionName(rval, GetReferencedName(lref));
        }
      }
      Q(PutValue(lref, rval));
      return rval;
    }
  } else {
    const AssignmentOperator = node.operator;

    const lref = yield* Evaluate_Expression(LeftHandSideExpression);
    const lval = Q(GetValue(lref));
    const rref = yield* Evaluate_Expression(AssignmentExpression);
    const rval = Q(GetValue(rref));
    // Let op be the @ where AssignmentOperator is @=.
    const op = AssignmentOperator.slice(0, -1);
    // Let r be the result of applying op to lval and rval
    // as if evaluating the expression lval op rval.
    const r = EvaluateBinopValues(op, lval, rval);
    Q(PutValue(lref, r));
    return r;
  }
}
