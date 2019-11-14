import {
  DefinePropertyOrThrow,
  MakeConstructor,
  ObjectCreate,
  SetFunctionName,
  OrdinaryFunctionCreate,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import {
  isAsyncFunctionDeclaration,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isAsyncGeneratorDeclaration,
} from '../ast.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { OutOfRange } from '../helpers.mjs';
import { Descriptor, Value } from '../value.mjs';

// 14.1.20 #sec-function-definitions-runtime-semantics-instantiatefunctionobject
//   FunctionDeclaration :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
export function InstantiateFunctionObject_FunctionDeclaration(FunctionDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = FunctionDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), FormalParameters, FunctionDeclaration, 'non-lexical-this', scope));
  MakeConstructor(F);
  SetFunctionName(F, name);
  F.SourceText = sourceTextMatchedBy(FunctionDeclaration);
  return F;
}

// 14.4.11 #sec-generator-function-definitions-runtime-semantics-instantiatefunctionobject
//   GeneratorDeclaration :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
export function InstantiateFunctionObject_GeneratorDeclaration(GeneratorDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = GeneratorDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), FormalParameters, GeneratorDeclaration, 'non-lexical-this', scope));
  const prototype = X(ObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  SetFunctionName(F, name);
  F.SourceText = sourceTextMatchedBy(GeneratorDeclaration);
  return F;
}

export function InstantiateFunctionObject_AsyncFunctionDeclaration(AsyncFunctionDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncFunctionDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionDeclaration, 'non-lexical-this', scope));
  SetFunctionName(F, name);
  F.SourceText = sourceTextMatchedBy(AsyncFunctionDeclaration);
  return F;
}

export function InstantiateFunctionObject_AsyncGeneratorDeclaration(AsyncGeneratorDeclaration, scope) {
  const {
    id: BindingIdentifier,
    params: FormalParameters,
  } = AsyncGeneratorDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), FormalParameters, AsyncGeneratorDeclaration, 'non-lexical-this', scope));
  const prototype = X(ObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  SetFunctionName(F, name);
  F.SourceText = sourceTextMatchedBy(AsyncGeneratorDeclaration);
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
