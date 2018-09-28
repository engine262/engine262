import {
  FunctionCreate,
  SetFunctionName,
  MakeConstructor,
} from '../abstract-ops/all.mjs';
import {
  isFunctionDeclaration,
} from '../ast.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  New as NewValue,
} from '../value.mjs';

// #sec-function-definitions-runtime-semantics-instantiatefunctionobject
//   FunctionDeclaration :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
export function InstantiateFunctionObject_FunctionDeclaration(FunctionDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = FunctionDeclaration;
  const strict = true; // TODO(IsStrict)
  const name = NewValue(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = FunctionCreate('Normal', FormalParameters, FunctionDeclaration, scope, strict);
  MakeConstructor(F);
  SetFunctionName(F, name);
  return F;
}

export function InstantiateFunctionObject(AnyFunctionDeclaration, scope) {
  switch (true) {
    case isFunctionDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_FunctionDeclaration(AnyFunctionDeclaration, scope);

    // case isGeneratorDeclaration(AnyFunctionDeclaration):
    //   return InstantiateFunctionObject_GeneratorDeclaration(AnyFunctionDeclaration, scope);

    // case isAsyncFunctionDeclaration(AnyFunctionDeclaration):
    //   return InstantiateFunctionObject_AsyncFunctionDeclaration(AnyFunctionDeclaration, scope);

    // case isAsyncGeneratorDeclaration(AnyFunctionDeclaration):
    //   return InstantiateFunctionObject_AsyncGeneratorDeclaration(AnyFunctionDeclaration, scope);

    default:
      throw outOfRange('InstantiateFunctionObject', AnyFunctionDeclaration);
  }
}
