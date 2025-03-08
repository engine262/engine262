import { surroundingAgent } from '../engine.mts';
import {
  Value, NullValue, ObjectValue, type PropertyKeyValue, JSStringValue, BooleanValue,
} from '../value.mts';
import {
  Assert,
  GetValue,
  CreateDataPropertyOrThrow,
  CopyDataProperties,
} from '../abstract-ops/all.mts';
import {
  StringValue,
  IsAnonymousFunctionDefinition,
  IsComputedPropertyKey,
  type FunctionDeclaration,
} from '../static-semantics/all.mts';
import { Evaluate, type Evaluator, type ExpressionEvaluator } from '../evaluator.mts';
import {
  Q, X,
  ReturnIfAbrupt,
  NormalCompletion,
  type PlainCompletion,
} from '../completion.mts';
import { OutOfRange, kInternal } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { NamedEvaluation, MethodDefinitionEvaluation, Evaluate_PropertyName } from './all.mts';

/** https://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation */
//   PropertyDefinitionList :
//     PropertyDefinitionList `,` PropertyDefinition
export function* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList: ParseNode.PropertyDefinitionList, object: ObjectValue, enumerable: BooleanValue<true>): Evaluator<PlainCompletion<void>> {
  for (const PropertyDefinition of PropertyDefinitionList) {
    Q(yield* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable));
  }
}

// PropertyDefinition :
//   `...` AssignmentExpression
//   IdentifierReference
//   PropertyName `:` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition: ParseNode.PropertyDefinitionLike, object: ObjectValue, enumerable: BooleanValue<true>) {
  switch (PropertyDefinition.type) {
    case 'IdentifierReference':
      return yield* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(PropertyDefinition, object, enumerable);
    case 'PropertyDefinition':
      break;
    case 'MethodDefinition':
    case 'GeneratorMethod':
    case 'AsyncMethod':
    case 'AsyncGeneratorMethod':
      return yield* MethodDefinitionEvaluation(PropertyDefinition, object, enumerable);
    default:
      throw new OutOfRange('PropertyDefinitionEvaluation_PropertyDefinition', PropertyDefinition);
  }
  // PropertyDefinition :
  //   PropertyName `:` AssignmentExpression
  //   `...` AssignmentExpression
  const { PropertyName, AssignmentExpression } = PropertyDefinition;
  if (!PropertyName) {
    // 1. Let exprValue be the result of evaluating AssignmentExpression.
    const exprValue = yield* Evaluate(AssignmentExpression);
    // 2. Let fromValue be ? GetValue(exprValue).
    const fromValue = Q(GetValue(exprValue));
    // 3. Let excludedNames be a new empty List.
    const excludedNames: PropertyKeyValue[] = [];
    // 4. Return ? CopyDataProperties(object, fromValue, excludedNames).
    return Q(CopyDataProperties(object, fromValue, excludedNames));
  }
  // 1. Let propKey be the result of evaluating PropertyName.
  const propKey = ReturnIfAbrupt(yield* Evaluate_PropertyName(PropertyName));
  // 2. ReturnIfAbrupt(propKey).
  // 3. If this PropertyDefinition is contained within a Script which is being evaluated for JSON.parse, then
  let isProtoSetter;
  if (surroundingAgent.runningExecutionContext?.HostDefined?.[kInternal]?.json) {
    isProtoSetter = false;
  } else if (!IsComputedPropertyKey(PropertyName) && (propKey as JSStringValue).stringValue() === '__proto__') { // 3. Else, If _propKey_ is the String value *"__proto__"* and if IsComputedPropertyKey(|PropertyName|) is *false*,
    // a. Let isProtoSetter be true.
    isProtoSetter = true;
  } else { // 4. Else,
    // a. Let isProtoSetter be false.
    isProtoSetter = false;
  }
  let propValue;
  // 5. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and isProtoSetter is false, then
  if (IsAnonymousFunctionDefinition(AssignmentExpression) && !isProtoSetter) {
    // a. Let propValue be NamedEvaluation of AssignmentExpression with argument propKey.
    propValue = yield* NamedEvaluation(AssignmentExpression as FunctionDeclaration, propKey);
  } else { // 6. Else,
    // a. Let exprValueRef be the result of evaluating AssignmentExpression.
    const exprValueRef = yield* Evaluate(AssignmentExpression);
    // b. Let propValue be ? GetValue(exprValueRef).
    propValue = Q(GetValue(exprValueRef));
  }
  // 7. If isProtoSetter is true, then
  if (isProtoSetter) {
    // a. If Type(propValue) is either Object or Null, then
    if (propValue instanceof ObjectValue || propValue instanceof NullValue) {
      // i. Return object.[[SetPrototypeOf]](propValue).
      return object.SetPrototypeOf(propValue);
    }
    // b. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }
  // 8. Assert: enumerable is true.
  Assert(enumerable === Value.true);
  // 9. Assert: object is an ordinary, extensible object with no non-configurable properties.
  // 10. Return ! CreateDataPropertyOrThrow(object, propKey, propValue).
  return X(CreateDataPropertyOrThrow(object, propKey as PropertyKeyValue, X(propValue)));
}

// PropertyDefinition : IdentifierReference
function* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(IdentifierReference: ParseNode.IdentifierReference, object: ObjectValue, enumerable: BooleanValue<true>): ExpressionEvaluator {
  // 1. Let propName be StringValue of IdentifierReference.
  const propName = StringValue(IdentifierReference);
  // 2. Let exprValue be the result of evaluating IdentifierReference.
  const exprValue = yield* Evaluate(IdentifierReference);
  // 3. Let propValue be ? GetValue(exprValue).
  const propValue = Q(GetValue(exprValue));
  // 4. Assert: enumerable is true.
  Assert(enumerable === Value.true);
  // 5. Assert: object is an ordinary, extensible object with no non-configurable properties.
  // 6. Return ! CreateDataPropertyOrThrow(object, propName, propValue).
  return X(CreateDataPropertyOrThrow(object, propName, propValue));
}
