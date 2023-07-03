// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import { Value, Descriptor, PrivateName } from '../value.mjs';
import {
  OrdinaryObjectCreate,
  OrdinaryFunctionCreate,
  DefinePropertyOrThrow,
  SetFunctionName,
  MakeMethod,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import {
  Q, X,
  ReturnIfAbrupt,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { DefineMethod, Evaluate_PropertyName } from './all.mjs';

/** https://tc39.es/ecma262/#sec-privateelement-specification-type */
export class PrivateElementRecord {
  Key;
  Kind;
  Value;
  Get;
  Set;
  constructor(init) {
    this.Key = init.Key;
    this.Kind = init.Kind;
    this.Value = init.Value;
    this.Get = init.Get;
    this.Set = init.Set;
  }
}

/** https://tc39.es/ecma262/#sec-definemethodproperty */
function DefineMethodProperty(key, homeObject, closure, enumerable) {
  // 1. If key is a Private Name, then
  if (key instanceof PrivateName) {
    // a. Return PrivateElement { [[Key]]: key, [[Kind]]: method, [[Value]]: closure }.
    return new PrivateElementRecord({
      Key: key,
      Kind: 'method',
      Value: closure,
    });
  } else { // 2. Else,
    // a. Let desc be the PropertyDescriptor { [[Value]]: closure, [[Writable]]: true, [[Enumerable]]: enumerable, [[Configurable]]: true }.
    const desc = Descriptor({
      Value: closure,
      Writable: Value.true,
      Enumerable: enumerable,
      Configurable: Value.true,
    });
    // b. Perform ? DefinePropertyOrThrow(homeObject, key, desc).
    Q(DefinePropertyOrThrow(homeObject, key, desc));
    // c. Return empty.
    return undefined;
  }
}

// MethodDefinition :
//   ClassElementName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
//   `get` ClassElementName `(` `)` `{` FunctionBody `}`
//   `set` ClassElementName `(` PropertySetParameterList `)` `{` FunctionBody `}`
function* MethodDefinitionEvaluation_MethodDefinition(MethodDefinition, object, enumerable) {
  switch (true) {
    case !!MethodDefinition.UniqueFormalParameters: {
      // 1. Let methodDef be ? DefineMethod of MethodDefinition with argument object.
      const methodDef = Q(yield* DefineMethod(MethodDefinition, object));
      // 2. Perform ! SetFunctionName(methodDef.[[Closure]], methodDef.[[Key]]).
      X(SetFunctionName(methodDef.Closure, methodDef.Key));
      // 3. Return ? DefineMethodProperty(methodDef.[[Key]], object, methodDef.[[Closure]], enumerable).
      return Q(DefineMethodProperty(methodDef.Key, object, methodDef.Closure, enumerable));
    }
    case !!MethodDefinition.PropertySetParameterList: {
      const { ClassElementName, PropertySetParameterList, FunctionBody } = MethodDefinition;
      // 1. Let propKey be the result of evaluating ClassElementName.
      const propKey = yield* Evaluate_PropertyName(ClassElementName);
      // 2. ReturnIfAbrupt(propKey).
      ReturnIfAbrupt(propKey);
      // 3. Let scope be the running execution context's LexicalEnvironment.
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // 4. Let privateScope be the running execution context's PrivateEnvironment.
      const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
      // 5. Let sourceText be the source text matched by MethodDefinition.
      const sourceText = sourceTextMatchedBy(MethodDefinition);
      // 6. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, PropertySetParameterList, FunctionBody, non-lexical-this, scope, privateScope).
      const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, PropertySetParameterList, FunctionBody, 'non-lexical-this', scope, privateScope);
      // 7. Perform MakeMethod(closure, object).
      MakeMethod(closure, object);
      // 8. Perform SetFunctionName(closure, propKey, "get").
      SetFunctionName(closure, propKey, Value('set'));
      // 9. If propKey is a Private Name, then
      if (propKey instanceof PrivateName) {
        // a. Return PrivateElement { [[Key]]: propKey, [[Kind]]: accessor, [[Get]]: undefined, [[Set]]: closure }.
        return new PrivateElementRecord({
          Key: propKey,
          Kind: 'accessor',
          Get: Value.undefined,
          Set: closure,
        });
      } else { // 10. Else,
        // a. Let desc be the PropertyDescriptor { [[Get]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }.
        const desc = Descriptor({
          Set: closure,
          Enumerable: enumerable,
          Configurable: Value.true,
        });
        // b. Perform ? DefinePropertyOrThrow(object, propKey, desc).
        Q(DefinePropertyOrThrow(object, propKey, desc));
        // c. Return empty.
        return undefined;
      }
    }
    case !MethodDefinition.UniqueFormalParameters && !MethodDefinition.PropertySetParameterList: {
      const { ClassElementName, FunctionBody } = MethodDefinition;
      // 1. Let propKey be the result of evaluating ClassElementName.
      const propKey = yield* Evaluate_PropertyName(ClassElementName);
      // 2. ReturnIfAbrupt(propKey).
      ReturnIfAbrupt(propKey);
      // 3. Let scope be the running execution context's LexicalEnvironment.
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      // 4. Let privateScope be the running execution context's PrivateEnvironment.
      const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
      // 5. Let formalParameterList be an instance of the production FormalParameters : [empty].
      const formalParameterList = [];
      // 6. Let sourceText be the source text matched by MethodDefinition.
      const sourceText = sourceTextMatchedBy(MethodDefinition);
      // 7. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText, formalParameterList, FunctionBody, non-lexical-this, scope, privateScope).
      const closure = OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), sourceText, formalParameterList, FunctionBody, 'non-lexical-this', scope, privateScope);
      // 8. Perform MakeMethod(closure, object).
      MakeMethod(closure, object);
      // 9. Perform SetFunctionName(closure, propKey, "get").
      SetFunctionName(closure, propKey, Value('get'));
      // 10. If propKey is a Private Name, then
      if (propKey instanceof PrivateName) {
        return new PrivateElementRecord({
          Key: propKey,
          Kind: 'accessor',
          Get: closure,
          Set: Value.undefined,
        });
      } else { // 11. Else,
        // a. Let desc be the PropertyDescriptor { [[Get]]: closure, [[Enumerable]]: enumerable, [[Configurable]]: true }.
        const desc = Descriptor({
          Get: closure,
          Enumerable: enumerable,
          Configurable: Value.true,
        });
        // b. Perform ? DefinePropertyOrThrow(object, propKey, desc).
        Q(DefinePropertyOrThrow(object, propKey, desc));
        // c. Return empty.
        return undefined;
      }
    }
    default:
      throw new OutOfRange('MethodDefinitionEvaluation_MethodDefinition', MethodDefinition);
  }
}

/** https://tc39.es/ecma262/#sec-async-function-definitions-MethodDefinitionEvaluation */
//   AsyncMethod :
//     `async` ClassElementName `(` UniqueFormalParameters `)` `{` AsyncBody `}`
function* MethodDefinitionEvaluation_AsyncMethod(AsyncMethod, object, enumerable) {
  const { ClassElementName, UniqueFormalParameters, AsyncBody } = AsyncMethod;
  // 1. Let propKey be the result of evaluating ClassElementName.
  const propKey = yield* Evaluate_PropertyName(ClassElementName);
  // 2. ReturnIfAbrupt(propKey).
  ReturnIfAbrupt(propKey);
  // 3. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 5. Let sourceText be the source text matched by AsyncMethod.
  const sourceText = sourceTextMatchedBy(AsyncMethod);
  // 6. Let closure be ! OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText, UniqueFormalParameters, AsyncBody, non-lexical-this, scope, privateScope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), sourceText, UniqueFormalParameters, AsyncBody, 'non-lexical-this', scope, privateScope));
  // 7. Perform ! MakeMethod(closure, object).
  X(MakeMethod(closure, object));
  // 8. Perform ! SetFunctionName(closure, propKey).
  X(SetFunctionName(closure, propKey));
  // 9. Return ? DefineMethodProperty(propKey, object, closure, enumerable).
  return Q(DefineMethodProperty(propKey, object, closure, enumerable));
}

/** https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-propertydefinitionevaluation */
//   GeneratorMethod :
//     `*` ClassElementName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
function* MethodDefinitionEvaluation_GeneratorMethod(GeneratorMethod, object, enumerable) {
  const { ClassElementName, UniqueFormalParameters, GeneratorBody } = GeneratorMethod;
  // 1. Let propKey be the result of evaluating ClassElementName.
  const propKey = yield* Evaluate_PropertyName(ClassElementName);
  // 2. ReturnIfAbrupt(propKey).
  ReturnIfAbrupt(propKey);
  // 3. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 5. Let sourceText be the source text matched by GeneratorMethod.
  const sourceText = sourceTextMatchedBy(GeneratorMethod);
  // 6. Let closure be ! OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText, UniqueFormalParameters, AsyncBody, non-lexical-this, scope, privateScope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype%'), sourceText, UniqueFormalParameters, GeneratorBody, 'non-lexical-this', scope, privateScope));
  // 7. Perform ! MakeMethod(closure, object).
  X(MakeMethod(closure, object));
  // 8. Perform ! SetFunctionName(closure, propKey).
  X(SetFunctionName(closure, propKey));
  // 9. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%GeneratorFunction.prototype.prototype%'));
  // 10. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  DefinePropertyOrThrow(closure, Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  // 11. Return ? DefineMethodProperty(propKey, object, closure, enumerable).
  return Q(DefineMethodProperty(propKey, object, closure, enumerable));
}

/** https://tc39.es/ecma262/#sec-asyncgenerator-definitions-propertydefinitionevaluation */
//   AsyncGeneratorMethod :
//     `async` `*` PropertyName `(` UniqueFormalParameters `)` `{` AsyncGeneratorBody `}`
function* MethodDefinitionEvaluation_AsyncGeneratorMethod(AsyncGeneratorMethod, object, enumerable) {
  const { ClassElementName, UniqueFormalParameters, AsyncGeneratorBody } = AsyncGeneratorMethod;
  // 1. Let propKey be the result of evaluating ClassElementName.
  const propKey = yield* Evaluate_PropertyName(ClassElementName);
  // 2. ReturnIfAbrupt(propKey).
  ReturnIfAbrupt(propKey);
  // 3. Let scope be the LexicalEnvironment of the running execution context.
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  // 4. Let privateScope be the running execution context's PrivateEnvironment.
  const privateScope = surroundingAgent.runningExecutionContext.PrivateEnvironment;
  // 5. Let sourceText be the source text matched by AsyncGeneratorMethod.
  const sourceText = sourceTextMatchedBy(AsyncGeneratorMethod);
  // 6. Let closure be ! OrdinaryFunctionCreate(%AsyncGeneratorFunction.prototype%, sourceText, UniqueFormalParameters, AsyncGeneratorBody, non-lexical-this, scope, privateScope).
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), sourceText, UniqueFormalParameters, AsyncGeneratorBody, 'non-lexical-this', scope, privateScope));
  // 7. Perform ! MakeMethod(closure, object).
  X(MakeMethod(closure, object));
  // 9. Perform ! SetFunctionName(closure, propKey).
  X(SetFunctionName(closure, propKey));
  // 9. Let prototype be OrdinaryObjectCreate(%AsyncGeneratorFunction.prototype.prototype%).
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype.prototype%'));
  // 10. Perform DefinePropertyOrThrow(closure, "prototype", PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
  DefinePropertyOrThrow(closure, Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  }));
  // 11. Return ? DefineMethodProperty(propKey, object, closure, enumerable).
  return Q(DefineMethodProperty(propKey, object, closure, enumerable));
}

export function MethodDefinitionEvaluation(node, object, enumerable) {
  switch (node.type) {
    case 'MethodDefinition':
      return MethodDefinitionEvaluation_MethodDefinition(node, object, enumerable);
    case 'AsyncMethod':
      return MethodDefinitionEvaluation_AsyncMethod(node, object, enumerable);
    case 'GeneratorMethod':
      return MethodDefinitionEvaluation_GeneratorMethod(node, object, enumerable);
    case 'AsyncGeneratorMethod':
      return MethodDefinitionEvaluation_AsyncGeneratorMethod(node, object, enumerable);
    default:
      throw new OutOfRange('MethodDefinitionEvaluation', node);
  }
}
