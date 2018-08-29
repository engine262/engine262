import { Q, ReturnIfAbrupt } from '../completion.mjs';
import {
  GetValue,
  PutValue,
  GetReferencedName,
  SetFunctionName,
  HasOwnProperty,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
} from '../static-semantics/all.mjs';
import {
  isObjectLiteral,
  isArrayLiteral,
} from '../ast.mjs';
import { Evaluate } from '../evaluator.mjs';
import { New as NewValue } from '../value.mjs';

// #sec-assignment-operators-runtime-semantics-evaluation
// AssignmentExpression :
//   LeftHandSideExpression = AssignmentExpression
//   LeftHandSideExpression AssignmentOperator AssignmentExpression
export function Evaluate_AssignmentExpression(node) {
  const LeftHandSideExpression = node.left;
  const AssignmentExpression = node.right;
  if (node.operator === '=') {
    if (!isObjectLiteral(LeftHandSideExpression) && !isArrayLiteral(LeftHandSideExpression)) {
      let lref = Evaluate(LeftHandSideExpression);
      ReturnIfAbrupt(lref);
      const rref = Evaluate(AssignmentExpression);
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

    const lref = Evaluate(LeftHandSideExpression);
    const lval = Q(GetValue(lref));
    const rref = Evaluate(AssignmentExpression);
    const rval = Q(GetValue(rref));
    // Let op be the @ where AssignmentOperator is @=.
    const op = AssignmentOperator.slice(0, -1);
    const r = NewValue(42); // Evaluate_BinaryExpression(op, lval, rval);
    Q(PutValue(lref, r));
    return r;
  }
}
