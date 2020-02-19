import { Value } from '../value.mjs';
import {
  GetReferencedName,
  GetV,
  GetValue,
  PutValue,
  ResolveBinding,
  RequireObjectCoercible,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
  StringValue,
} from '../static-semantics/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  Q,
  NormalCompletion,
  ReturnIfAbrupt,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  NamedEvaluation,
  refineLeftHandSideExpression,
} from './all.mjs';

// ObjectAssignmentPattern :
//  `{` `}`
//  `{` AssignmentPropertyList `}`
//  `{` AssignmentPropertyList `,` `}`
function* DestructuringAssignmentEvaluation_ObjectAssignmentPattern(ObjectAssignmentPattern, value) {
  // 1. Perform ? RequireObjectCoercible(value).
  Q(RequireObjectCoercible(value));
  // 2. Perform ? PropertyDestructuringAssignmentEvaluation for AssignmentPropertyList using value as the argument.
  Q(yield* PropertyDestructuringAssignmentEvaluation(ObjectAssignmentPattern.AssignmentPropertyList, value));
  // 3. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}

function* PropertyDestructuringAssignmentEvaluation(AssignmentPropertyList, value) {
  const propertyNames = [];
  for (const AssignmentProperty of AssignmentPropertyList) {
    if (AssignmentProperty.IdentifierReference) {
      // 1. Let P be StringValue of IdentifierReference.
      const P = StringValue(AssignmentProperty.IdentifierReference);
      // 2. Let lref be ? ResolveBinding(P).
      const lref = Q(ResolveBinding(P));
      // 3. Let v be ? GetV(value, P).
      let v = Q(GetV(value, P));
      // 4. If Initializer? is present and v is undefined, then
      if (AssignmentProperty.Initializer && v === Value.undefined) {
        // a. If IsAnonymousFunctionDefinition(Initializer) is true, then
        if (IsAnonymousFunctionDefinition(AssignmentProperty.Initializer)) {
          // i. Set v to the result of performing NamedEvaluation for Initializer with argument P.
          v = yield* NamedEvaluation(AssignmentProperty.Initializer, P);
        } else { // b. Else,
          // i. Let defaultValue be the result of evaluating Initializer.
          const defaultValue = yield* Evaluate(AssignmentProperty.Initializer);
          // ii. Set v to ? GetValue(defaultValue)
          v = Q(GetValue(defaultValue));
        }
      }
      // 5. Perform ? PutValue(lref, v).
      Q(PutValue(lref, v));
      // 6. Return a new List containing P.
      propertyNames.push(P);
    } else {
      // 1. Let name be the result of evaluating PropertyName.
      const name = yield* Evaluate(AssignmentProperty.PropertyName);
      // 2. ReturnIfAbrupt(name).
      ReturnIfAbrupt(name);
      // 3. Perform ? KeyedDestructuringAssignmentEvaluation of AssignmentElement with value and name as the arguments.
      Q(KeyedDestructuringAssignmentEvaluation(AssignmentProperty.AssignmentElement, value, name));
      // 4. Return a new List containing name.
      propertyNames.push(name);
    }
  }
  return propertyNames;
}

// AssignmentElement : DestructuringAssignment TargetInitializer?
function* KeyedDestructuringAssignmentEvaluation({
  DestructuringAssignmentTarget,
  Initializer,
}, value, propertyName) {
  // 1. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then
  let lref;
  if (DestructuringAssignmentTarget.type !== 'ObjectLiteral'
      && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
    // a. Let lref be the result of evaluating DestructuringAssignmentTarget.
    lref = yield* Evaluate(DestructuringAssignmentTarget);
    // b. ReturnIfAbrupt(lref).
    ReturnIfAbrupt(lref);
  }
  // 2. Let v be ? GetV(value, propertyName).
  const v = Q(GetV(value, propertyName));
  // 3. If Initializer is present and v is undefined, then
  let rhsValue;
  if (Initializer && v === Value.undefined) {
    // a. If IsAnonymousFunctionDefinition(Initializer) and IsIdentifierRef of DestructuringAssignmentTarget are both true, then
    if (IsAnonymousFunctionDefinition(Initializer) && IsIdentifierRef(DestructuringAssignmentTarget)) {
      // i. Let rhsValue be NamedEvaluation of Initializer with argument GetReferencedName(lref).
      rhsValue = yield* NamedEvaluation(Initializer, GetReferencedName(lref));
    } else {
      // i. Let defaultValue be the result of evaluating Initializer.
      const defaultValue = yield* Evaluate(Initializer);
      // ii. Let rhsValue be ? GetValue(defaultValue).
      rhsValue = Q(GetValue(defaultValue));
    }
  } else { // 4. Else, let rhsValue be v.
    rhsValue = v;
  }
  // 5. If DestructuringAssignmentTarget is an ObjectLiteral or an ArrayLiteral, then
  if (DestructuringAssignmentTarget.type === 'ObjectLiteral'
      || DestructuringAssignmentTarget.type === 'ArrayLiteral') {
    // a. Let assignmentPattern be the AssignmentPattern that is covered by DestructuringAssignmentTarget.
    const assignmentPattern = refineLeftHandSideExpression(DestructuringAssignmentTarget);
    // b. Return the result of performing DestructuringAssignmentEvaluation of assignmentPattern with rhsValue as the argument.
    return yield* DestructuringAssignmentEvaluation(assignmentPattern, rhsValue);
  }
  // 6. Return ? PutValue(lref, rhsValue).
  return Q(PutValue(lref, rhsValue));
}

export function DestructuringAssignmentEvaluation(node, value) {
  switch (node) {
    case 'ObjectAssignmentPattern':
      return DestructuringAssignmentEvaluation_ObjectAssignmentPattern(node, value);
    case 'ArrayAssignmentPattern':
      return DestructuringAssignmentEvaluation_ArrayAssignmentPattern(node, value);
    default:
      throw new OutOfRange('DestructuringAssignmentEvaluation', node);
  }
}
