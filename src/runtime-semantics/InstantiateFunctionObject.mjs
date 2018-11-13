import {
  AsyncFunctionCreate,
  DefinePropertyOrThrow,
  FunctionCreate,
  GeneratorFunctionCreate,
  AsyncGeneratorFunctionCreate,
  MakeConstructor,
  ObjectCreate,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  isAsyncFunctionDeclaration,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isAsyncGeneratorDeclaration,
  directivePrologueContainsUseStrictDirective,
} from '../ast.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { OutOfRange } from '../helpers.mjs';
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
  const strict = directivePrologueContainsUseStrictDirective(FunctionDeclaration.body.body);
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(FunctionCreate('Normal', FormalParameters, FunctionDeclaration, scope, strict));
  MakeConstructor(F);
  SetFunctionName(F, name);
  F.SourceText = surroundingAgent.sourceTextMatchedBy(FunctionDeclaration);
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
  const strict = directivePrologueContainsUseStrictDirective(GeneratorDeclaration.body.body);
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(GeneratorFunctionCreate('Normal', FormalParameters, GeneratorDeclaration, scope, strict));
  const prototype = X(ObjectCreate(surroundingAgent.intrinsic('%GeneratorPrototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  SetFunctionName(F, name);
  F.SourceText = surroundingAgent.sourceTextMatchedBy(GeneratorDeclaration);
  return F;
}

export function InstantiateFunctionObject_AsyncFunctionDeclaration(AsyncFunctionDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncFunctionDeclaration;
  const strict = directivePrologueContainsUseStrictDirective(AsyncFunctionDeclaration.body.body);
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(AsyncFunctionCreate('Normal', FormalParameters, AsyncFunctionDeclaration, scope, strict));
  SetFunctionName(F, name);
  F.SourceText = surroundingAgent.sourceTextMatchedBy(AsyncFunctionDeclaration);
  return F;
}

export function InstantiateFunctionObject_AsyncGeneratorDeclaration(AsyncGeneratorDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncGeneratorDeclaration;
  const strict = directivePrologueContainsUseStrictDirective(AsyncGeneratorDeclaration.body.body);
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(AsyncGeneratorFunctionCreate('Normal', FormalParameters, AsyncGeneratorDeclaration, scope, strict));
  const prototype = X(ObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorPrototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  SetFunctionName(F, name);
  F.SourceText = surroundingAgent.sourceTextMatchedBy(AsyncGeneratorDeclaration);
  return F;
}

export function InstantiateFunctionObject(AnyFunctionDeclaration, scope) {
  switch (true) {
    case isFunctionDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_FunctionDeclaration(AnyFunctionDeclaration, scope);

    case isGeneratorDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_GeneratorDeclaration(AnyFunctionDeclaration, scope);

    case isAsyncFunctionDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_AsyncFunctionDeclaration(AnyFunctionDeclaration, scope);

    case isAsyncGeneratorDeclaration(AnyFunctionDeclaration):
      return InstantiateFunctionObject_AsyncGeneratorDeclaration(AnyFunctionDeclaration, scope);

    default:
      throw new OutOfRange('InstantiateFunctionObject', AnyFunctionDeclaration);
  }
}
