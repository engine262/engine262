import {
  surroundingAgent,
} from '../engine.mjs';
import {
  AbstractRelationalComparison,
  Call,
  GetMethod,
  GetValue,
  HasProperty,
  IsCallable,
  OrdinaryHasInstance,
  ToBoolean,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, X, ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-instanceofoperator
export function InstanceofOperator(V, target) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let instOfHandler be ? GetMethod(target, @@hasInstance).
  const instOfHandler = Q(GetMethod(target, wellKnownSymbols.hasInstance));
  // 3. If instOfHandler is not undefined, then
  if (instOfHandler !== Value.undefined) {
    // a. Return ! ToBoolean(? Call(instOfHandler, target, « V »)).
    return X(ToBoolean(Q(Call(instOfHandler, target, [V]))));
  }
  // 4. If IsCallable(target) is false, throw a TypeError exception.
  if (IsCallable(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', target);
  }
  // 5. Return ? OrdinaryHasInstance(target, V).
  return Q(OrdinaryHasInstance(target, V));
}

// #sec-relational-operators-runtime-semantics-evaluation
//   RelationalExpression :
//     RelationalExpression `<` ShiftExpression
//     RelationalExpression `>` ShiftExpression
//     RelationalExpression `<=` ShiftExpression
//     RelationalExpression `>=` ShiftExpression
//     RelationalExpression `instanceof` ShiftExpression
//     RelationalExpression `in` ShiftExpression
export function* Evaluate_RelationalExpression({ RelationalExpression, operator, ShiftExpression }) {
  // 1. Let lref be the result of evaluating RelationalExpression.
  const lref = yield* Evaluate(RelationalExpression);
  // 2. Let lval be ? GetValue(lref).
  const lval = Q(GetValue(lref));
  // 3. Let rref be the result of evaluating ShiftExpression.
  const rref = yield* Evaluate(ShiftExpression);
  // 4. Let rval be ? GetValue(rref).
  const rval = Q(GetValue(rref));
  switch (operator) {
    case '<': {
      // 5. Let r be the result of performing Abstract Relational Comparison lval < rval.
      const r = AbstractRelationalComparison(lval, rval);
      // 6. ReturnIfAbrupt(r).
      ReturnIfAbrupt(r);
      // 7. If r is undefined, return false. Otherwise, return r.
      if (r === Value.undefined) {
        return Value.false;
      }
      return r;
    }
    case '>': {
      // 5. Let r be the result of performing Abstract Relational Comparison rval < lval with LeftFirst equal to false.
      const r = AbstractRelationalComparison(rval, lval, false);
      // 6. ReturnIfAbrupt(r).
      ReturnIfAbrupt(r);
      // 7. If r is undefined, return false. Otherwise, return r.
      if (r === Value.undefined) {
        return Value.false;
      }
      return r;
    }
    case '<=': {
      // 5. Let r be the result of performing Abstract Relational Comparison rval < lval with LeftFirst equal to false.
      const r = AbstractRelationalComparison(rval, lval, false);
      // 6. ReturnIfAbrupt(r).
      ReturnIfAbrupt(r);
      // 7. If r is true or undefined, return false. Otherwise, return true.
      if (r === Value.true || r === Value.undefined) {
        return Value.false;
      }
      return Value.true;
    }
    case '>=': {
      // 5. Let r be the result of performing Abstract Relational Comparison lval < rval.
      const r = AbstractRelationalComparison(lval, rval);
      // 6. ReturnIfAbrupt(r).
      ReturnIfAbrupt(r);
      // 7. If r is true or undefined, return false. Otherwise, return true.
      if (r === Value.true || r === Value.undefined) {
        return Value.false;
      }
      return Value.true;
    }
    case 'instanceof':
      // 5. Return ? InstanceofOperator(lval, rval).
      return Q(InstanceofOperator(lval, rval));
    case 'in':
      // 5. Return ? InstanceofOperator(lval, rval).
      if (Type(rval) !== 'Object') {
        return surroundingAgent.Throw('TypeError', 'NotAnObject', rval);
      }
      // 6. Return ? HasProperty(rval, ? ToPropertyKey(lval)).
      return Q(HasProperty(rval, ToPropertyKey(lval)));
    default:
      throw new OutOfRange('Evaluate_RelationalExpression', operator);
  }
}
