import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  isIdentifierName,
  isNumericLiteral,
  isPropertyDefinitionIdentifierReference,
  isPropertyDefinitionKeyValue,
  isPropertyDefinitionSpread,
  isStringLiteral,
} from '../ast.mjs';
import {
  Assert,
  CopyDataProperties,
  CreateDataPropertyOrThrow,
  GetValue,
  HasOwnProperty,
  ObjectCreate,
  SetFunctionName,
  ToPropertyKey,
  ToString,
} from '../abstract-ops/all.mjs';
import { New as NewValue } from '../value.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  Q, ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-object-initializer-runtime-semantics-evaluation
//   LiteralPropertyName :
//     IdentifierName
//     StringLiteral
//     NumericLiteral
function Evaluate_LiteralPropertyName(LiteralPropertyName) {
  switch (true) {
    case isIdentifierName(LiteralPropertyName):
      return NewValue(LiteralPropertyName.name);
    case isStringLiteral(LiteralPropertyName):
      return NewValue(LiteralPropertyName.value);
    case isNumericLiteral(LiteralPropertyName): {
      const nbr = NewValue(LiteralPropertyName.value);
      return X(ToString(nbr));
    }

    default:
      throw outOfRange('Evaluate_LiteralPropertyName', LiteralPropertyName);
  }
}

// #sec-object-initializer-runtime-semantics-evaluation
//   ComputedPropertyName : `[` AssignmentExpression `]`
function* Evaluate_ComputedPropertyName(ComputedPropertyName) {
  const AssignmentExpression = ComputedPropertyName;
  const exprValue = yield* Evaluate_Expression(AssignmentExpression);
  const propName = Q(GetValue(exprValue));
  return Q(ToPropertyKey(propName));
}

// #sec-object-initializer-runtime-semantics-evaluation
//   PropertyName :
//     LiteralPropertyName
//     ComputedPropertyName
//
// Note: We need some out-of-band information on whether the PropertyName is
// computed.
export function* Evaluate_PropertyName(PropertyName, computed) {
  return computed
    ? yield* Evaluate_ComputedPropertyName(PropertyName)
    : Evaluate_LiteralPropertyName(PropertyName);
}

// #sec-object-initializer-runtime-semantics-propertydefinitionevaluation
//   PropertyDefinitionList : PropertyDefinitionList `,` PropertyDefinition
//
// (implicit)
//   PropertyDefinitionList : PropertyDefinition
function* PropertyDefinitionEvaluation_PropertyDefinitionList(
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
  const propName = NewValue(IdentifierReference.name);
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
    const hasNameProperty = Q(HasOwnProperty(propValue, NewValue('name')));
    if (hasNameProperty.isFalse()) {
      X(SetFunctionName(propValue, propKey));
    }
  }
  Assert(enumerable);
  return CreateDataPropertyOrThrow(object, propKey, propValue);
}

// Note: PropertyDefinition : CoverInitializedName is an early error.
function* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable) {
  switch (true) {
    case isPropertyDefinitionIdentifierReference(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(
        PropertyDefinition, object, enumerable,
      );

    case isPropertyDefinitionKeyValue(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_KeyValue(
        PropertyDefinition, object, enumerable,
      );

      // case isPropertyDefinitionMethodDefinition(PropertyDefinition):
      //   return PropertyDefinitionEvaluation_MethodDefinition(
      //     PropertyDefinition., object, enumerable);

    case isPropertyDefinitionSpread(PropertyDefinition):
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_Spread(
        PropertyDefinition, object, enumerable,
      );

    default:
      throw outOfRange('PropertyDefinitionEvaluation_PropertyDefinition', PropertyDefinition);
  }
}

// #sec-object-initializer-runtime-semantics-evaluation
//   ObjectLiteral :
//     `{` `}`
//     `{` PropertyDefintionList `}`
//     `{` PropertyDefintionList `,` `}`
export function* Evaluate_ObjectLiteral(ObjectLiteral) {
  if (ObjectLiteral.properties.length === 0) {
    return ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  }

  const PropertyDefintionList = ObjectLiteral.properties;

  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  Q(yield* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefintionList, obj, true));
  return obj;
}
