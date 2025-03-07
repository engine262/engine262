// @ts-nocheck
import { Value } from '../value.mts';
import { surroundingAgent } from '../engine.mts';
import {
  CopyDataProperties,
  InitializeReferencedBinding,
  OrdinaryObjectCreate,
  PutValue,
  ResolveBinding,
} from '../abstract-ops/all.mts';
import { StringValue } from '../static-semantics/all.mts';
import { Q } from '../completion.mts';
import type { ParseNode } from '../parser/ParseNode.mts';

// BindingRestProperty : `...` BindingIdentifier
export function RestBindingInitialization({ BindingIdentifier }: ParseNode.Initializer, value, environment, excludedNames) {
  // 1. Let lhs be ? ResolveBinding(StringValue of BindingIdentifier, environment).
  const lhs = Q(ResolveBinding(StringValue(BindingIdentifier), environment, BindingIdentifier.strict));
  // 2. Let restObj be OrdinaryObjectCreate(%Object.prototype%).
  const restObj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  // 3. Perform ? CopyDataProperties(restObj, value, excludedNames).
  Q(CopyDataProperties(restObj, value, excludedNames));
  // 4. If environment is undefined, return PutValue(lhs, restObj).
  if (environment === Value.undefined) {
    return PutValue(lhs, restObj);
  }
  // 5. Return InitializeReferencedBinding(lhs, restObj).
  return InitializeReferencedBinding(lhs, restObj);
}
