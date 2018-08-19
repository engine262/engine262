import {
  surroundingAgent,
} from '../engine.mjs';
import {
  GetMethod,
  ToBoolean,
  IsCallable,
  OrdinaryHasInstance,
  Call,
} from '../abstract-ops/all.mjs';
import {
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import { Q } from '../completion.mjs';

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
