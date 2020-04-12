import {
  DefinePropertyOrThrow,
  MakeConstructor,
  OrdinaryObjectCreate,
  SetFunctionName,
  OrdinaryFunctionCreate,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { OutOfRange } from '../helpers.mjs';
import { Descriptor, Value } from '../value.mjs';

// 14.1.20 #sec-function-definitions-runtime-semantics-instantiatefunctionobject
//   FunctionDeclaration :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
export function InstantiateFunctionObject_FunctionDeclaration(FunctionDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, FunctionBody } = FunctionDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), FormalParameters, FunctionBody, 'non-lexical-this', scope));
  SetFunctionName(F, name);
  MakeConstructor(F);
  F.SourceText = sourceTextMatchedBy(FunctionDeclaration);
  return F;
}

// 14.4.11 #sec-generator-function-definitions-runtime-semantics-instantiatefunctionobject
//   GeneratorDeclaration :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
export function InstantiateFunctionObject_GeneratorDeclaration(GeneratorDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, GeneratorBody } = GeneratorDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), FormalParameters, GeneratorBody, 'non-lexical-this', scope));
  SetFunctionName(F, name);
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  F.SourceText = sourceTextMatchedBy(GeneratorDeclaration);
  return F;
}

export function InstantiateFunctionObject_AsyncFunctionDeclaration(AsyncFunctionDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, AsyncFunctionBody } = AsyncFunctionDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope));
  SetFunctionName(F, name);
  F.SourceText = sourceTextMatchedBy(AsyncFunctionDeclaration);
  return F;
}

export function InstantiateFunctionObject_AsyncGeneratorDeclaration(AsyncGeneratorDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, AsyncGeneratorBody } = AsyncGeneratorDeclaration;
  const name = new Value(BindingIdentifier ? BindingIdentifier.name : 'default');
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope));
  SetFunctionName(F, name);
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%')));
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  F.SourceText = sourceTextMatchedBy(AsyncGeneratorDeclaration);
  return F;
}

export function InstantiateFunctionObject(AnyFunctionDeclaration, scope) {
  switch (AnyFunctionDeclaration.type) {
    case 'FunctionDeclaration':
      return InstantiateFunctionObject_FunctionDeclaration(AnyFunctionDeclaration, scope);
    case 'GeneratorDeclaration':
      return InstantiateFunctionObject_GeneratorDeclaration(AnyFunctionDeclaration, scope);
    case 'AsyncFunctionDeclaration':
      return InstantiateFunctionObject_AsyncFunctionDeclaration(AnyFunctionDeclaration, scope);
    case 'AsyncGeneratorDeclaration':
      return InstantiateFunctionObject_AsyncGeneratorDeclaration(AnyFunctionDeclaration, scope);

    default:
      throw new OutOfRange('InstantiateFunctionObject', AnyFunctionDeclaration);
  }
}
