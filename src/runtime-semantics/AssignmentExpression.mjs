import { Q, ReturnIfAbrupt } from '../completion.mjs';
import {
  GetReferencedName,
  GetValue,
  PutValue,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
} from '../static-semantics/all.mjs';
import { isAssignmentPattern } from '../ast.mjs';
import { EvaluateBinopValues, Evaluate } from '../evaluator.mjs';
import {
  DestructuringAssignmentEvaluation_AssignmentPattern,
  NamedEvaluation_Expression,
} from './all.mjs';

// 12.15.4 #sec-assignment-operators-runtime-semantics-evaluation
//   AssignmentExpression :
//     LeftHandSideExpression `=` AssignmentExpression
//     LeftHandSideExpression AssignmentOperator AssignmentExpression
export function* Evaluate_AssignmentExpression(node) {
  const LeftHandSideExpression = node.left;
  const AssignmentExpression = node.right;
  if (node.operator === '=') {
    if (!isAssignmentPattern(LeftHandSideExpression)) {
      const lref = yield* Evaluate(LeftHandSideExpression);
      ReturnIfAbrupt(lref);
      let rval;
      if (IsAnonymousFunctionDefinition(AssignmentExpression) && IsIdentifierRef(LeftHandSideExpression)) {
        rval = yield* NamedEvaluation_Expression(AssignmentExpression, GetReferencedName(lref));
      } else {
        const rref = yield* Evaluate(AssignmentExpression);
        rval = Q(GetValue(rref));
      }
      Q(PutValue(lref, rval));
      return rval;
    }
    const assignmentPattern = LeftHandSideExpression;
    const rref = yield* Evaluate(AssignmentExpression);
    const rval = Q(GetValue(rref));
    Q(yield* DestructuringAssignmentEvaluation_AssignmentPattern(assignmentPattern, rval));
    return rval;
  } else {
    const AssignmentOperator = node.operator;

    const lref = yield* Evaluate(LeftHandSideExpression);
    const lval = Q(GetValue(lref));
    const rref = yield* Evaluate(AssignmentExpression);
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
