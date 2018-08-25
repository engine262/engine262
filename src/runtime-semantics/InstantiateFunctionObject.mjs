import {
  SetFunctionName,
  FunctionCreate,
} from '../abstract-ops/all.mjs';
import {
  MakeConstructor,
} from './all.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function InstantiateFunctionObject(
  FunctionDeclaration, BindingIdentifier, FormalParameters, FunctionBody, scope,
) {
  const strict = FunctionDeclaration.IsStrict;
  const name = NewValue(BindingIdentifier.name);
  const F = FunctionCreate('Normal', FormalParameters, FunctionBody, scope, strict);
  MakeConstructor(F);
  SetFunctionName(F, name);
  return F;
}
