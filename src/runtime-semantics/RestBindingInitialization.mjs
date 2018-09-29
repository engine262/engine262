import {
  surroundingAgent,
} from '../engine.mjs';
import {
  CopyDataProperties,
  InitializeReferencedBinding,
  ObjectCreate,
  PutValue,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import {
  Value,
  Type,
} from '../value.mjs';
import {
  Q,
} from '../completion.mjs';

// #sec-destructuring-binding-patterns-runtime-semantics-restbindinginitialization
//   BindingRestProperty : `...` BindingIdentifier
export function RestBindingInitialization_BindingRestProperty(
  BindingRestProperty, value, environment, excludedNames,
) {
  const BindingIdentifier = BindingRestProperty.argument;
  const lhs = Q(ResolveBinding(new Value(BindingIdentifier.name), environment));
  const restObj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  Q(CopyDataProperties(restObj, value, excludedNames));
  if (Type(environment) === 'Undefined') {
    return PutValue(lhs, restObj);
  }
  return InitializeReferencedBinding(lhs, restObj);
}
