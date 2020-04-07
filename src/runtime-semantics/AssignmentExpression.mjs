import { Value } from '../value.mjs';
import { Q, X, ReturnIfAbrupt } from '../completion.mjs';
import {
  GetReferencedName,
  GetValue,
  PutValue,
  ToBoolean,
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
// https://tc39.es/proposal-logical-assignment/#sec-assignment-operators-runtime-semantics-evaluation
//     LeftHandSideExpression `&&=` AssignmentExpression
//     LeftHandSideExpression `||=` AssignmentExpression
//     LeftHandSideExpression `??=` AssignmentExpression
export function* Evaluate_AssignmentExpression({
  LeftHandSideExpression, AssignmentOperator, AssignmentExpression,
}) {
  if (AssignmentOperator === '=') {
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
  } else if (AssignmentOperator === '&&=') {
    // 1. Let lref be the result of evaluating LeftHandSideExpression.
    const lref = yield* Evaluate(LeftHandSideExpression);
    // 2. Let lval be ? GetValue(lref).
    const lval = Q(GetValue(lref));
    // 3. Let lbool be ! ToBoolean(lval).
    const lbool = X(ToBoolean(lval));
    // 4. If lbool is false, return lval.
    if (lbool === Value.false) {
      return lval;
    }
    // 5. Let rref be the result of evaluating AssignmentExpression.
    const rref = yield* Evaluate(AssignmentExpression);
    // 6. Let rval be ? GetValue(rref).
    const rval = Q(GetValue(rref));
    // 7. Perform ? PutValue(lref, rval).
    Q(PutValue(lref, rval));
    // 8. Return rval.
    return rval;
  } else if (AssignmentOperator === '||=') {
    // 1. Let lref be the result of evaluating LeftHandSideExpression.
    const lref = yield* Evaluate(LeftHandSideExpression);
    // 2. Let lval be ? GetValue(lref).
    const lval = Q(GetValue(lref));
    // 3. Let lbool be ! ToBoolean(lval).
    const lbool = X(ToBoolean(lval));
    // 4. If lbool is true, return lval.
    if (lbool === Value.true) {
      return lval;
    }
    // 5. Let rref be the result of evaluating AssignmentExpression.
    const rref = yield* Evaluate(AssignmentExpression);
    // 6. Let rval be ? GetValue(rref).
    const rval = Q(GetValue(rref));
    // 7. Perform ? PutValue(lref, rval).
    Q(PutValue(lref, rval));
    // 8. Return rval.
    return rval;
  } else if (AssignmentOperator === '??=') {
    // 1.Let lref be the result of evaluating LeftHandSideExpression.
    const lref = yield* Evaluate(LeftHandSideExpression);
    // 2. Let lval be ? GetValue(lref).
    const lval = Q(GetValue(lref));
    // 3. If lval is not undefined nor null, return lval.
    if (lval !== Value.undefined && lval !== Value.null) {
      return lval;
    }
    // 4. Let rref be the result of evaluating AssignmentExpression.
    const rref = yield* Evaluate(AssignmentExpression);
    // 5. Let rval be ? GetValue(rref).
    const rval = Q(GetValue(rref));
    // 6. Perform ? PutValue(lref, rval).
    Q(PutValue(lref, rval));
    // 7. Return rval.
    return rval;
  } else {
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
