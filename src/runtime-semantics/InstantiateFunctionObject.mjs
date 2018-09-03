import {
  FunctionCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  MakeConstructor,
} from './all.mjs';
import {
  New as NewValue,
} from '../value.mjs';

export function InstantiateFunctionObject(FunctionDeclaration, scope) {
  const BindingIdentifier = FunctionDeclaration.id;
  const FormalParameters = FunctionDeclaration.params;
  const FunctionBody = FunctionDeclaration.body.body;

  const strict = FunctionDeclaration.IsStrict;
  const name = NewValue(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = FunctionCreate('Normal', FormalParameters, FunctionBody, scope, strict);
  MakeConstructor(F);
  SetFunctionName(F, name);
  return F;
}
