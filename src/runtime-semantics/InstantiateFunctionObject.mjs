import {
  FunctionCreate,
  SetFunctionName,
  MakeConstructor,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function InstantiateFunctionObject({
  id: BindingIdentifier,
  params: FormalParameters,
  body: FunctionBody,
}, scope) {
  const strict = true;
  const name = NewValue(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = FunctionCreate('Normal', FormalParameters, FunctionBody, scope, strict);
  MakeConstructor(F);
  SetFunctionName(F, name);
  return F;
}
