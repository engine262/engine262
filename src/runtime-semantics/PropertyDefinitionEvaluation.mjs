import { surroundingAgent } from '../engine.mjs';
import { Value, NullValue, ObjectValue } from '../value.mjs';
import {
  Assert,
  GetValue,
  CreateDataPropertyOrThrow,
  CopyDataProperties,
} from '../abstract-ops/all.mjs';
import {
  StringValue,
  IsAnonymousFunctionDefinition,
  IsComputedPropertyKey,
} from '../static-semantics/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  Q, X,
  ReturnIfAbrupt,
  NormalCompletion,
} from '../completion.mjs';
import { OutOfRange, kInternal } from '../helpers.mjs';
import { NamedEvaluation, MethodDefinitionEvaluation, Evaluate_PropertyName } from './all.mjs';

/** http://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation  */
//   PropertyDefinitionList :
//     PropertyDefinitionList `,` PropertyDefinition
export function* PropertyDefinitionEvaluation_PropertyDefinitionList(PropertyDefinitionList, object, enumerable) {
  let lastReturn;
  for (const PropertyDefinition of PropertyDefinitionList) {
    lastReturn = Q(yield* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable));
  }
  return lastReturn;
}

// PropertyDefinition :
//   `...` AssignmentExpression
//   IdentifierReference
//   PropertyName `:` AssignmentExpression
function* PropertyDefinitionEvaluation_PropertyDefinition(PropertyDefinition, object, enumerable) {
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
    const excludedNames = [];
    // 4. Return ? CopyDataProperties(object, fromValue, excludedNames).
    return Q(CopyDataProperties(object, fromValue, excludedNames));
  }
  // 1. Let propKey be the result of evaluating PropertyName.
  const propKey = yield* Evaluate_PropertyName(PropertyName);
  // 2. ReturnIfAbrupt(propKey).
  ReturnIfAbrupt(propKey);
  // 3. If this PropertyDefinition is contained within a Script which is being evaluated for JSON.parse, then
  let isProtoSetter;
  if (surroundingAgent.runningExecutionContext?.HostDefined?.[kInternal]?.json) {
    isProtoSetter = false;
  } else if (!IsComputedPropertyKey(PropertyName) && propKey.stringValue() === '__proto__') { // 3. Else, If _propKey_ is the String value *"__proto__"* and if IsComputedPropertyKey(|PropertyName|) is *false*,
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
    propValue = yield* NamedEvaluation(AssignmentExpression, propKey);
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
  return X(CreateDataPropertyOrThrow(object, propKey, propValue));
}

// PropertyDefinition : IdentifierReference
function* PropertyDefinitionEvaluation_PropertyDefinition_IdentifierReference(IdentifierReference, object, enumerable) {
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
