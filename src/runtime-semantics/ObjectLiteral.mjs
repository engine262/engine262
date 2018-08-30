import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  ObjectCreate,
  GetValue,
  CopyDataProperties,
  CreateDataPropertyOrThrow,
  HasOwnProperty,
  SetFunctionName,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  isStringLiteral,
  isNumericLiteral,
  isIdentifierName,
} from '../ast.mjs';
import { New as NewValue } from '../value.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  Q, X,
  ReturnIfAbrupt,
  NormalCompletion,
} from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';

function Evaluate_LiteralPropertyName(PropertyName) {
  switch (true) {
    case isStringLiteral(PropertyName):
      return NewValue(PropertyName.value);
    case isNumericLiteral(PropertyName): {
      const nbr = NewValue(PropertyName.value);
      return X(ToString(nbr));
    }
    case isIdentifierName(PropertyName):
      return NewValue(PropertyName.name);

    default:
      throw outOfRange('Evaluate_LiteralPropertyName', PropertyName);
  }
}

function PropertyDefinitionEvaluation(arg, object, enumerable) {
  if (Array.isArray(arg)) {
    if (arg.length === 0) {
      return new NormalCompletion(undefined);
    }

    // PropertyDefinitionList : PropertyDefinitionList , PropertyDefinition
    const PropertyDefintionList = arg;
    const PropertyDefinition = PropertyDefintionList.pop();

    Q(PropertyDefinitionEvaluation(PropertyDefintionList, object, enumerable));
    return PropertyDefinitionEvaluation(PropertyDefinition, object, enumerable);
  } else {
    // PropertyDefinition :
    //   `...` AssignmentExpression
    //   IdentifierReference
    //   PropertyName `:` AssignmentExpression
    const PropertyDefinition = arg;

    // `...` AssignmentExpression
    if (PropertyDefinition.type === 'SpreadElement') {
      const AssignmentExpression = PropertyDefinition.argument;

      const exprValue = Evaluate_Expression(AssignmentExpression);
      const fromValue = Q(GetValue(exprValue));
      const excludedNames = [];
      return Q(CopyDataProperties(object, fromValue, excludedNames));
    }

    // IdentifierReference
    if (PropertyDefinition.shorthand) {
      const IdentifierReference = PropertyDefinition.key;

      const propName = NewValue(IdentifierReference.name);
      const exprValue = Evaluate_Expression(IdentifierReference);
      const propValue = GetValue(exprValue);
      Assert(enumerable);
      return CreateDataPropertyOrThrow(object, propName, propValue);
    }

    if (PropertyDefinition.key) {
      // PropertyName `:` AssignmentExpression
      const { key: PropertyName, value: AssignmentExpression } = PropertyDefinition;
      let propKey = PropertyDefinition.computed
        ? Evaluate_Expression(PropertyName)
        : Evaluate_LiteralPropertyName(PropertyName);
      ReturnIfAbrupt(propKey);
      const exprValueRef = Evaluate_Expression(AssignmentExpression);
      const propValue = Q(GetValue(exprValueRef));
      if (IsAnonymousFunctionDefinition(AssignmentExpression)) {
        const hasNameProperty = Q(HasOwnProperty(propValue, NewValue('name')));
        if (hasNameProperty.isFalse()) {
          SetFunctionName(propValue, propKey);
        }
      }
      Assert(enumerable);
      return CreateDataPropertyOrThrow(object, propKey, propValue);
    }

    throw outOfRange('PropertyDefinitionEvaluation', PropertyDefinition);
  }
}

export function Evaluate_ObjectLiteral(ObjectLiteral) {
  // ObjectLiteral : `{` `}`
  if (ObjectLiteral.properties.length === 0) {
    return ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  }

  const PropertyDefintionList = ObjectLiteral.properties;

  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  Q(PropertyDefinitionEvaluation(PropertyDefintionList, obj, true));
  return obj;
}
