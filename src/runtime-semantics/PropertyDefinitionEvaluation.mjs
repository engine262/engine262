import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  isAsyncMethod,
  isAsyncGeneratorMethod,
  isGeneratorMethod,
  isMethodDefinition,
  isMethodDefinitionGetter,
  isMethodDefinitionRegularFunction,
  isMethodDefinitionSetter,
  isPropertyDefinitionIdentifierReference,
  isPropertyDefinitionKeyValue,
  isPropertyDefinitionSpread,
} from '../ast.mjs';
import {
  Assert,
  CopyDataProperties,
  CreateDataPropertyOrThrow,
  DefinePropertyOrThrow,
  OrdinaryFunctionCreate,
  GetValue,
  MakeMethod,
  OrdinaryObjectCreate,
  SetFunctionName,
  sourceTextMatchedBy,
} from '../abstract-ops/all.mjs';
import { Descriptor, Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, ReturnIfAbrupt, X } from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  DefineMethod,
  Evaluate_PropertyName,
  NamedEvaluation_Expression,
} from './all.mjs';

function hasNonConfigurableProperties(obj) {
  for (const desc of obj.properties.values()) {
    if (desc.Configurable === Value.false) {
      return true;
    }
  }
  return false;
}

// 12.2.6.8 #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinitionList : PropertyDefinitionList `,` PropertyDefinition
//
// (implicit)
//   PropertyDefinitionList : PropertyDefinition
export function* PropertyDefinitionEvaluation_PropertyDefinitionList(
  PropertyDefinitionList, object, enumerable,
) {
  Assert(PropertyDefinitionList.length > 0);

  let lastReturn;
  for (const PropertyDefinition of PropertyDefinitionList) {
    lastReturn = Q(yield* PropertyDefinitionEvaluation_PropertyDefinition(
      PropertyDefinition, object, enumerable,
    ));
  }
  return lastReturn;
}

// 12.2.6.8 #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinition : `...` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition_Spread(PropertyDefinition, object) {
  const AssignmentExpression = PropertyDefinition.argument;

  const exprValue = yield* Evaluate(AssignmentExpression);
  const fromValue = Q(GetValue(exprValue));
  const excludedNames = [];
  return Q(CopyDataProperties(object, fromValue, excludedNames));
}

// 12.2.6.8 #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinition : IdentifierReference
function* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(
  PropertyDefinition, object, enumerable,
) {
  const IdentifierReference = PropertyDefinition.key;
  const propName = new Value(IdentifierReference.name);
  const exprValue = yield* Evaluate(IdentifierReference);
  const propValue = Q(GetValue(exprValue));
  Assert(enumerable);
  // Assert: object is an ordinary object.
  Assert(object.Extensible === Value.true);
  Assert(!hasNonConfigurableProperties(object));
  return X(CreateDataPropertyOrThrow(object, propName, propValue));
}

// 12.2.6.8 #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinition : PropertyName `:` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition_KeyValue(
  PropertyDefinition, object, enumerable,
) {
  const { key: PropertyName, value: AssignmentExpression } = PropertyDefinition;
  const propKey = yield* Evaluate_PropertyName(PropertyName, PropertyDefinition.computed);
  ReturnIfAbrupt(propKey);
  let propValue;
  if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
    propValue = yield* NamedEvaluation_Expression(AssignmentExpression, propKey);
    ReturnIfAbrupt(propValue); // https://github.com/tc39/ecma262/issues/1605
  } else {
    const exprValueRef = yield* Evaluate(AssignmentExpression);
    propValue = Q(GetValue(exprValueRef));
  }
  Assert(enumerable);
  // Assert: object is an ordinary object.
  Assert(object.Extensible === Value.true);
  Assert(!hasNonConfigurableProperties(object));
  return X(CreateDataPropertyOrThrow(object, propKey, propValue));
}

// 14.3.8 #sec-method-definitions-runtime-semantics-propertydefinitionevaluation
//   MethodDefinition :
//     PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
//     `get` PropertyName `(` `)` `{` FunctionBody `}`
//     `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`
//
// (implicit)
//   MethodDefinition : GeneratorMethod
export function* PropertyDefinitionEvaluation_MethodDefinition(MethodDefinition, object, enumerable) {
  switch (true) {
    case isMethodDefinitionRegularFunction(MethodDefinition): {
      const methodDef = Q(yield* DefineMethod(MethodDefinition, object));
      X(SetFunctionName(methodDef.Closure, methodDef.Key));
      const desc = Descriptor({
        Value: methodDef.Closure,
        Writable: Value.true,
        Enumerable: enumerable ? Value.true : Value.false,
        Configurable: Value.true,
      });
      return Q(DefinePropertyOrThrow(object, methodDef.Key, desc));
    }

    case isGeneratorMethod(MethodDefinition):
      return yield* PropertyDefinitionEvaluation_GeneratorMethod(MethodDefinition, object, enumerable);

    case isAsyncMethod(MethodDefinition):
      return yield* PropertyDefinitionEvaluation_AsyncMethod(MethodDefinition, object, enumerable);

    case isAsyncGeneratorMethod(MethodDefinition):
      return yield* PropertyDefinitionEvaluation_AsyncGeneratorMethod(MethodDefinition, object, enumerable);

    case isMethodDefinitionGetter(MethodDefinition): {
      const PropertyName = MethodDefinition.key;

      const propKey = yield* Evaluate_PropertyName(PropertyName, MethodDefinition.computed);
      ReturnIfAbrupt(propKey);
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      const formalParameterList = [];
      const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), formalParameterList, MethodDefinition.value, 'non-lexical-this', scope));
      X(SetFunctionName(closure, propKey, new Value('get')));
      X(MakeMethod(closure, object));
      closure.SourceText = sourceTextMatchedBy(MethodDefinition);
      const desc = Descriptor({
        Get: closure,
        Enumerable: enumerable ? Value.true : Value.false,
        Configurable: Value.true,
      });
      return Q(DefinePropertyOrThrow(object, propKey, desc));
    }

    case isMethodDefinitionSetter(MethodDefinition): {
      const PropertyName = MethodDefinition.key;
      const PropertySetParameterList = MethodDefinition.value.params;

      const propKey = yield* Evaluate_PropertyName(PropertyName, MethodDefinition.computed);
      ReturnIfAbrupt(propKey);
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Function.prototype%'), PropertySetParameterList, MethodDefinition.value, 'non-lexical-this', scope));
      X(SetFunctionName(closure, propKey, new Value('set')));
      X(MakeMethod(closure, object));
      closure.SourceText = sourceTextMatchedBy(MethodDefinition);
      const desc = Descriptor({
        Set: closure,
        Enumerable: enumerable ? Value.true : Value.false,
        Configurable: Value.true,
      });
      return Q(DefinePropertyOrThrow(object, propKey, desc));
    }
    default:
      throw new OutOfRange('PropertyDefinitionEvaluation_MethodDefinition', MethodDefinition);
  }
}

// (implicit)
//   ClassElement :
//     MethodDefinition
//     `static` MethodDefinition
export const PropertyDefinitionEvaluation_ClassElement = PropertyDefinitionEvaluation_MethodDefinition;

// 14.4.12 #sec-generator-function-definitions-runtime-semantics-propertydefinitionevaluation
//   GeneratorMethod : `*` PropertyName `(` UniqueFormalParameters `)` `{` GeneratorBody `}`
function* PropertyDefinitionEvaluation_GeneratorMethod(GeneratorMethod, object, enumerable) {
  const {
    key: PropertyName,
    value: GeneratorExpression,
  } = GeneratorMethod;
  const UniqueFormalParameters = GeneratorExpression.params;

  const propKey = yield* Evaluate_PropertyName(PropertyName, GeneratorMethod.computed);
  ReturnIfAbrupt(propKey);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%Generator%'), UniqueFormalParameters, GeneratorExpression, 'non-lexical-this', scope));
  MakeMethod(closure, object);
  X(SetFunctionName(closure, propKey));
  const prototype = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Generator.prototype%'));
  X(DefinePropertyOrThrow(
    closure,
    new Value('prototype'),
    Descriptor({
      Value: prototype,
      Writable: Value.true,
      Enumerable: Value.false,
      Configurable: Value.false,
    }),
  ));
  closure.SourceText = sourceTextMatchedBy(GeneratorExpression);
  const desc = Descriptor({
    Value: closure,
    Writable: Value.true,
    Enumerable: enumerable ? Value.true : Value.false,
    Configurable: Value.true,
  });
  return Q(DefinePropertyOrThrow(object, propKey, desc));
}

// AsyncMethod : `async` PropertyName `(` UniqueFormalParameters `)` `{` AsyncFunctionBody `}`
function* PropertyDefinitionEvaluation_AsyncMethod(AsyncMethod, object, enumerable) {
  const {
    key: PropertyName,
    value: AsyncExpression,
  } = AsyncMethod;
  const UniqueFormalParameters = AsyncExpression.params;

  const propKey = yield* Evaluate_PropertyName(PropertyName, AsyncMethod.computed);
  ReturnIfAbrupt(propKey);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncFunction.prototype%'), UniqueFormalParameters, AsyncExpression, 'non-lexical-this', scope));
  X(MakeMethod(closure, object));
  X(SetFunctionName(closure, propKey));
  closure.SourceText = sourceTextMatchedBy(AsyncMethod);
  const desc = Descriptor({
    Value: closure,
    Writable: Value.true,
    Enumerable: enumerable ? Value.true : Value.false,
    Configurable: Value.true,
  });
  return Q(DefinePropertyOrThrow(object, propKey, desc));
}

// AsyncGeneratorMethod : `async` `*` PropertyName `(` UniqueFormalParameters `)` `{` AsyncGeneratorFunctionBody `}`
function* PropertyDefinitionEvaluation_AsyncGeneratorMethod(AsyncGeneratorMethod, object, enumerable) {
  const {
    key: PropertyName,
    value: AsyncGeneratorExpression,
  } = AsyncGeneratorMethod;
  const UniqueFormalParameters = AsyncGeneratorExpression.params;

  const propKey = yield* Evaluate_PropertyName(PropertyName, AsyncGeneratorMethod.computed);
  ReturnIfAbrupt(propKey);
  const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const closure = X(OrdinaryFunctionCreate(surroundingAgent.intrinsic('%AsyncGeneratorFunction.prototype%'), UniqueFormalParameters, AsyncGeneratorExpression, 'non-lexical-this', scope));
  X(MakeMethod(closure, object));
  X(SetFunctionName(closure, propKey));
  const prototype = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%AsyncGenerator.prototype%')));
  X(DefinePropertyOrThrow(closure, new Value('prototype'), Descriptor({
    Value: prototype,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));
  closure.SourceText = sourceTextMatchedBy(AsyncGeneratorMethod);
  const desc = Descriptor({
    Value: closure,
    Writable: Value.true,
    Enumerable: enumerable ? Value.true : Value.false,
    Configurable: Value.true,
  });
  return Q(DefinePropertyOrThrow(object, propKey, desc));
}

// (implicit)
//   PropertyDefinition : MethodDefinition
//
// Note: PropertyDefinition : CoverInitializedName is an early error.
function* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable) {
  switch (true) {
    case isPropertyDefinitionIdentifierReference(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(
        PropertyDefinition, object, enumerable,
      );

    case isPropertyDefinitionKeyValue(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_KeyValue(PropertyDefinition, object, enumerable);

    case isMethodDefinition(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_MethodDefinition(PropertyDefinition, object, enumerable);

    case isPropertyDefinitionSpread(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_Spread(
        PropertyDefinition, object, enumerable,
      );

    default:
      throw new OutOfRange('PropertyDefinitionEvaluation_PropertyDefinition', PropertyDefinition);
  }
}
