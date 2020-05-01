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
import { StringValue } from '../static-semantics/all.mjs';

// 14.1.20 #sec-function-definitions-runtime-semantics-instantiatefunctionobject
//   FunctionDeclaration :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
export function InstantiateFunctionObject_FunctionDeclaration(FunctionDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, FunctionBody } = FunctionDeclaration;
  // 1. Let name be StringValue of BindingIdentifier.
  const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default');
  // 2. Let sourceText be the source text matched by FunctionDeclaration.
  const sourceText = sourceTextMatchedBy(FunctionDeclaration);
  // 3. Let F be OrdinaryFunctionCreate(%Function.prototype%, sourceText, FormalParameters, FunctionBody, non-lexical-this, scope).
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, FormalParameters, FunctionBody, 'non-lexical-this', scope));
  // 4. Perform SetFunctionName(F, name).
  SetFunctionName(F, name);
  // 5. Perform MakeConstructor(F).
  MakeConstructor(F);
  // 6. Return F.
  return F;
}

// 14.4.11 #sec-generator-function-definitions-runtime-semantics-instantiatefunctionobject
//   GeneratorDeclaration :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
export function InstantiateFunctionObject_GeneratorDeclaration(GeneratorDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, GeneratorBody } = GeneratorDeclaration;
  // 1. Let name be StringValue of BindingIdentifier.
  const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default');
  // 2. Let sourceText be the source text matched by GeneratorDeclaration.
  const sourceText = sourceTextMatchedBy(GeneratorDeclaration);
  // 3. Let F be OrdinaryFunctionCreate(%Generator%, sourceText, FormalParameters, GeneratorBody, non-lexical-this, scope).
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), sourceText, FormalParameters, GeneratorBody, 'non-lexical-this', scope));
  // 4. Perform SetFunctionName(F, name).
  SetFunctionName(F, name);
  // 5. Let prototype be OrdinaryObjectCreate(%Generator.prototype%).
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%')));
  // 6. Perform DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 7. Return F.
  return F;
}

// #sec-async-function-definitions-InstantiateFunctionObject
//  AsyncFunctionDeclaration :
//    `async` `function` BindingIdentifier `(` FormalParameters `)` `{` AsyncFunctionBody `}`
//    `async` `function` `(` FormalParameters `)` `{` AsyncFunctionBody `}`
export function InstantiateFunctionObject_AsyncFunctionDeclaration(AsyncFunctionDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, AsyncFunctionBody } = AsyncFunctionDeclaration;
  // 1. Let name be StringValue of BindingIdentifier.
  const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default');
  // 2. Let sourceText be the source text matched by AsyncFunctionDeclaration.
  const sourceText = sourceTextMatchedBy(AsyncFunctionDeclaration);
  // 3. Let F be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, FormalParameters, AsyncFunctionBody, non-lexical-this, scope).
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, FormalParameters, AsyncFunctionBody, 'non-lexical-this', scope));
  // 4. Perform ! SetFunctionName(F, name).
  SetFunctionName(F, name);
  // 5. Return F.
  return F;
}

// #sec-asyncgenerator-definitions-evaluatebody
//  AsyncGeneratorDeclaration :
//    `async` `function` `*` BindingIdentifier `(` FormalParameters`)` `{` AsyncGeneratorBody `}`
//    `async` `function` `*` `(` FormalParameters`)` `{` AsyncGeneratorBody `}`
export function InstantiateFunctionObject_AsyncGeneratorDeclaration(AsyncGeneratorDeclaration, scope) {
  const { BindingIdentifier, FormalParameters, AsyncGeneratorBody } = AsyncGeneratorDeclaration;
  // 1. Let name be StringValue of BindingIdentifier.
  const name = BindingIdentifier ? StringValue(BindingIdentifier) : new Value('default');
  // 2. Let sourceText be the source text matched by AsyncGeneratorDeclaration.
  const sourceText = sourceTextMatchedBy(AsyncGeneratorDeclaration);
  // 3. Let F be ! OrdinaryFunctionCreate(%AsyncGenerator%, sourceText, FormalParameters, AsyncGeneratorBody, non-lexical-this, scope).
  const F = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, FormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope));
  // 4. Perform ! SetFunctionName(F, name).
  SetFunctionName(F, name);
  // 5. Let prototype be ! OrdinaryObjectCreate(%AsyncGenerator.prototype%).
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%')));
  // 6. Perform ! DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  X(DefinePropertyOrThrow(F, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  // 7. Return F.
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
