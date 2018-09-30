import {
  DefinePropertyOrThrow,
  FunctionCreate,
  GeneratorFunctionCreate,
  MakeConstructor,
  ObjectCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  isFunctionDeclaration,
  isGeneratorDeclaration,
} from '../ast.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { outOfRange } from '../helpers.mjs';
import { Descriptor, Value } from '../value.mjs';

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
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = FunctionCreate('Normal', FormalParameters, FunctionDeclaration, scope, strict);
  MakeConstructor(F);
  SetFunctionName(F, name);
  return F;
}

// #sec-generator-function-definitions-runtime-semantics-instantiatefunctionobject
//   GeneratorDeclaration :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
export function InstantiateFunctionObject_GeneratorDeclaration(GeneratorDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = GeneratorDeclaration;
  const strict = true; // TODO(IsStrict)
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(GeneratorFunctionCreate('Normal', FormalParameters, GeneratorDeclaration, scope, strict));
  const prototype = X(ObjectCreate(surroundingAgent.intrinsic('%GeneratorPrototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: new Value(true),
    Enumerable: new Value(false),
    Configurable: new Value(false),
  })));
  SetFunctionName(F, name);
  return F;
}

export function InstantiateFunctionObject(AnyFunctionDeclaration, scope) {
  switch (true) {
    case isFunctionDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_FunctionDeclaration(AnyFunctionDeclaration, scope);

    case isGeneratorDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_GeneratorDeclaration(AnyFunctionDeclaration, scope);

      // case isAsyncFunctionDeclaration(AnyFunctionDeclaration):
      //   return InstantiateFunctionObject_AsyncFunctionDeclaration(AnyFunctionDeclaration, scope);

      // case isAsyncGeneratorDeclaration(AnyFunctionDeclaration):
      //   return InstantiateFunctionObject_AsyncGeneratorDeclaration(AnyFunctionDeclaration, scope);

    default:
      throw outOfRange('InstantiateFunctionObject', AnyFunctionDeclaration);
  }
}
