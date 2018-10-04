import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  isPropertyDefinitionIdentifierReference,
  isPropertyDefinitionKeyValue,
  isPropertyDefinitionSpread,
  isPropertyDefinitionMethodDefinition,
} from '../ast.mjs';
import {
  Assert,
  CopyDataProperties,
  CreateDataPropertyOrThrow,
  GetValue,
  HasOwnProperty,
  SetFunctionName,
  DefinePropertyOrThrow,
  MakeMethod,
  FunctionCreate,
} from '../abstract-ops/all.mjs';
import { Value, Descriptor } from '../value.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  DefineMethod,
  Evaluate_PropertyName,
} from './all.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Q, X, ReturnIfAbrupt } from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
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

// #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinition : `...` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition_Spread(PropertyDefinition, object) {
  const AssignmentExpression = PropertyDefinition.argument;

  const exprValue = yield* Evaluate_Expression(AssignmentExpression);
  const fromValue = Q(GetValue(exprValue));
  const excludedNames = [];
  return Q(CopyDataProperties(object, fromValue, excludedNames));
}

// #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinition : IdentifierReference
function* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(
  PropertyDefinition, object, enumerable,
) {
  const IdentifierReference = PropertyDefinition.key;
  const propName = new Value(IdentifierReference.name);
  const exprValue = yield* Evaluate_Expression(IdentifierReference);
  const propValue = Q(GetValue(exprValue));
  Assert(enumerable);
  return CreateDataPropertyOrThrow(object, propName, propValue);
}

// #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinition : PropertyName `:` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition_KeyValue(
  PropertyDefinition, object, enumerable,
) {
  const { key: PropertyName, value: AssignmentExpression } = PropertyDefinition;
  const propKey = yield* Evaluate_PropertyName(PropertyName, PropertyDefinition.computed);
  ReturnIfAbrupt(propKey);
  const exprValueRef = yield* Evaluate_Expression(AssignmentExpression);
  const propValue = Q(GetValue(exprValueRef));
  if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
    const hasNameProperty = Q(HasOwnProperty(propValue, new Value('name')));
    if (hasNameProperty.isFalse()) {
      X(SetFunctionName(propValue, propKey));
    }
  }
  Assert(enumerable);
  return CreateDataPropertyOrThrow(object, propKey, propValue);
}

// #sec-method-definitions-runtime-semantics-propertydefinitionevaluation
//   MethodDefinition :
//     PropertyName `(` UniqueFormalParameters `)` `{` FunctionBody `}`
//     `get` PropertyName `(` `)` `{` FunctionBody `}`
//     `set` PropertyName `(` PropertySetParameterList `)` `{` FunctionBody `}`
//
// (implicit)
//   MethodDefinition : GeneratorMethod
function* PropertyDefinitionEvaluation_MethodDefinition(MethodDefinition, object, enumerable) {
  switch (MethodDefinition.kind) {
    case 'init': {
      const methodDef = yield* DefineMethod(MethodDefinition, object);
      ReturnIfAbrupt(methodDef);
      SetFunctionName(methodDef.Closure, methodDef.Key);
      const desc = Descriptor({
        Value: methodDef.Closure,
        Writable: new Value(true),
        Enumerable: new Value(enumerable),
        Configurable: new Value(true),
      });
      return Q(DefinePropertyOrThrow(object, methodDef.Key, desc));
    }
    case 'get': {
      const PropertyName = MethodDefinition.key;

      const propKey = yield* Evaluate_PropertyName(PropertyName);
      ReturnIfAbrupt(propKey);
      // If the function code for this MethodDefinition is strict mode code, let strict be true. Otherwise let strict be false.
      const strict = true;
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      const formalParameterList = [];
      const closure = FunctionCreate('Method', formalParameterList, MethodDefinition.value, scope, strict);
      SetFunctionName(closure, propKey, new Value('get'));
      const desc = Descriptor({
        Get: closure,
        Enumerable: new Value(enumerable),
        Configurable: new Value(true),
      });
      return Q(DefinePropertyOrThrow(object, propKey, desc));
    }
    case 'set': {
      const PropertyName = MethodDefinition.key;
      const PropertySetParameterList = MethodDefinition.value.params;

      const propKey = yield* Evaluate_PropertyName(PropertyName);
      ReturnIfAbrupt(propKey);
      // If the function code for this MethodDefinition is strict mode code, let strict be true. Otherwise let strict be false.
      const strict = true;
      const scope = surroundingAgent.runningExecutionContext.LexicalEnvironment;
      const closure = FunctionCreate('Method', PropertySetParameterList, MethodDefinition.value, scope, strict);
      MakeMethod(closure, object);
      SetFunctionName(closure, propKey, new Value('set'));
      const desc = Descriptor({
        Set: closure,
        Enumerable: new Value(enumerable),
        Configurable: new Value(true),
      });
      return Q(DefinePropertyOrThrow(object, propKey, desc));
    }
    default:
      throw outOfRange('PropertyDefinitionEvaluation_MethodDefinition', MethodDefinition.kind);
  }
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

    case isPropertyDefinitionMethodDefinition(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_MethodDefinition(PropertyDefinition, object, enumerable);

    case isPropertyDefinitionSpread(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_Spread(
        PropertyDefinition, object, enumerable,
      );

    default:
      throw outOfRange('PropertyDefinitionEvaluation_PropertyDefinition', PropertyDefinition);
  }
}
