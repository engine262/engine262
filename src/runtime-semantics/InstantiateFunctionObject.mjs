import {
  FunctionCreate,
  SetFunctionName,
  MakeConstructor,
} from '../abstract-ops/all.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function InstantiateFunctionObject(FunctionDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = FunctionDeclaration;
  const strict = true;
  const name = NewValue(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = FunctionCreate('Normal', FormalParameters, FunctionDeclaration, scope, strict);
  MakeConstructor(F);
  SetFunctionName(F, name);
  return F;
}
