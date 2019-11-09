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
import { Q, ReturnIfAbrupt } from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';

export function InstanceofOperator(V, target) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  const instOfHandler = Q(GetMethod(target, wellKnownSymbols.hasInstance));
  if (Type(instOfHandler) !== 'Undefined') {
    return ToBoolean(Q(Call(instOfHandler, target, [V])));
  }
  if (IsCallable(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', target);
  }
  return Q(OrdinaryHasInstance(target, V));
}

export function* Evaluate_RelationalExpression({
  left: RelationalExpression,
  right: ShiftExpression,
  operator,
}) {
  const lref = yield* Evaluate(RelationalExpression);
  const lval = Q(GetValue(lref));
  const rref = yield* Evaluate(ShiftExpression);
  const rval = Q(GetValue(rref));

  switch (operator) {
    case '<': {
      const r = AbstractRelationalComparison(lval, rval);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined') {
        return Value.false;
      }
      return r;
    }
    case '>': {
      const r = AbstractRelationalComparison(rval, lval, false);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined') {
        return Value.false;
      }
      return r;
    }
    case '<=': {
      const r = AbstractRelationalComparison(rval, lval, false);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined' || r === Value.true) {
        return Value.false;
      }
      return Value.true;
    }
    case '>=': {
      const r = AbstractRelationalComparison(lval, rval);
      ReturnIfAbrupt(r);
      if (Type(r) === 'Undefined' || r === Value.true) {
        return Value.false;
      }
      return Value.true;
    }

    case 'instanceof':
      return Q(InstanceofOperator(lval, rval));

    case 'in':
      if (Type(rval) !== 'Object') {
        return surroundingAgent.Throw('TypeError', 'NotAnObject', rval);
      }
      return Q(HasProperty(rval, ToPropertyKey(lval)));

    default:
      throw new OutOfRange('Evaluate_RelationalExpression', operator);
  }
}
