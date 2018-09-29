import {
  surroundingAgent,
} from '../engine.mjs';
import {
  AbstractRelationalComparison,
  Call,
  GetMethod,
  GetValue,
  IsCallable,
  OrdinaryHasInstance,
  ToBoolean,
  ToPropertyKey,
  HasProperty,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { Q, ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';

export function InstanceofOperator(V, target) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const instOfHandler = Q(GetMethod(target, wellKnownSymbols.hasInstance));
  if (Type(instOfHandler) !== 'Undefined') {
    return ToBoolean(Q(Call(instOfHandler, target, [V])));
  }
  if (IsCallable(target).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return Q(OrdinaryHasInstance(target, V));
}

export function* Evaluate_RelationalExpression({
  left: RelationalExpression,
  right: ShiftExpression,
  operator,
}) {
  const lref = yield* Evaluate_Expression(RelationalExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate_Expression(ShiftExpression);
  const rval = Q(GetValue(rref));

  switch (operator) {
    case '<': {
      const r = AbstractRelationalComparison(lval, rval);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined') {
        return new Value(false);
      }
      return r;
    }
    case '>': {
      const r = AbstractRelationalComparison(rval, lval, false);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined') {
        return new Value(false);
      }
      return r;
    }
    case '<=': {
      const r = AbstractRelationalComparison(rval, lval, false);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined' || r.isTrue()) {
        return new Value(false);
      }
      return new Value(true);
    }
    case '>=': {
      const r = AbstractRelationalComparison(lval, rval);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined' || r.isTrue()) {
        return new Value(false);
      }
      return new Value(true);
    }

    case 'instanceof':
      return Q(InstanceofOperator(lval, rval));

    case 'in':
      if (Type(rval) !== 'Object') {
        return surroundingAgent.Throw('TypeError', 'cannot check for property in non-object');
      }
      return Q(HasProperty(rval, ToPropertyKey(lval)));

    default:
      throw outOfRange('Evaluate_RelationalExpression', operator);
  }
}
