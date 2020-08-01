import { surroundingAgent } from '../engine.mjs';
import { Value } from '../value.mjs';
import {
  ArrayCreate,
  CopyDataProperties,
  CreateDataPropertyOrThrow,
  GetIterator,
  GetReferencedName,
  GetV,
  GetValue,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryObjectCreate,
  PutValue,
  ResolveBinding,
  RequireObjectCoercible,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
  StringValue,
} from '../static-semantics/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  Q, X,
  Completion,
  AbruptCompletion,
  NormalCompletion,
  ReturnIfAbrupt,
  EnsureCompletion,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  Evaluate_PropertyName,
  NamedEvaluation,
  refineLeftHandSideExpression,
} from './all.mjs';

// ObjectAssignmentPattern :
//  `{` `}`
//  `{` AssignmentPropertyList `}`
//  `{` AssignmentPropertyList `,` `}`
//  `{` AssignmentPropertyList `,` AssignmentRestProperty? `}`
function* DestructuringAssignmentEvaluation_ObjectAssignmentPattern({ AssignmentPropertyList, AssignmentRestProperty }, value) {
  // 1. Perform ? RequireObjectCoercible(value).
  Q(RequireObjectCoercible(value));
  // 2. Perform ? PropertyDestructuringAssignmentEvaluation for AssignmentPropertyList using value as the argument.
  const excludedNames = Q(yield* PropertyDestructuringAssignmentEvaluation(AssignmentPropertyList, value));
  if (AssignmentRestProperty) {
    Q(yield* RestDestructuringAssignmentEvaluation(AssignmentRestProperty, value, excludedNames));
  }
  // 3. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}

// #sec-runtime-semantics-restdestructuringassignmentevaluation
// AssignmentRestProperty : `...` DestructuringAssignmentTarget
function* RestDestructuringAssignmentEvaluation({ DestructuringAssignmentTarget }, value, excludedNames) {
  // 1. Let lref be the result of evaluating DestructuringAssignmentTarget.
  const lref = yield* Evaluate(DestructuringAssignmentTarget);
  // 2. ReturnIfAbrupt(lref).
  ReturnIfAbrupt(lref);
  // 3. Let restObj be OrdinaryObjectCreate(%Object.prototype%).
  const restObj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  // 4. Perform ? CopyDataProperties(restObj, value, excludedNames).
  Q(CopyDataProperties(restObj, value, excludedNames));
  // 5. Return PutValue(lref, restObj).
  return PutValue(lref, restObj);
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
      const name = yield* Evaluate_PropertyName(AssignmentProperty.PropertyName);
      // 2. ReturnIfAbrupt(name).
      ReturnIfAbrupt(name);
      // 3. Perform ? KeyedDestructuringAssignmentEvaluation of AssignmentElement with value and name as the arguments.
      Q(yield* KeyedDestructuringAssignmentEvaluation(AssignmentProperty.AssignmentElement, value, name));
      // 4. Return a new List containing name.
      propertyNames.push(name);
    }
  }
  return propertyNames;
}

// AssignmentElement : DestructuringAssignmentTarget Initializer?
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

// ArrayAssignmentPattern :
//   `[` `]`
//   `[` AssignmentElementList `]`
//   `[` AssignmentElementList `,` AssignmentRestElement? `]`
function* DestructuringAssignmentEvaluation_ArrayAssignmentPattern({ AssignmentElementList, AssignmentRestElement }, value) {
  // 1. Let iteratorRecord be ? GetIterator(value).
  const iteratorRecord = Q(GetIterator(value));
  // 2. Let status be IteratorDestructuringAssignmentEvaluation of AssignmentElementList with argument iteratorRecord.
  let status = EnsureCompletion(yield* IteratorDestructuringAssignmentEvaluation(AssignmentElementList, iteratorRecord));
  // 3. If status is an abrupt completion, then
  if (status instanceof AbruptCompletion) {
    // a. If iteratorRecord.[[Done]] is false, return ? IteratorClose(iteratorRecord, status).
    if (iteratorRecord.Done === Value.false) {
      return Q(IteratorClose(iteratorRecord, status));
    }
    // b. Return Completion(status).
    return Completion(status);
  }
  // 4. If Elision is present, then
  // ...
  // 5. If AssignmentRestElement is present, then
  if (AssignmentRestElement) {
    // a. Set status to the result of performing IteratorDestructuringAssignmentEvaluation of AssignmentRestElement with iteratorRecord as the argument.
    status = EnsureCompletion(yield* IteratorDestructuringAssignmentEvaluation(AssignmentRestElement, iteratorRecord));
  }
  // 6. If iteratorRecord.[[Done]] is false, return ? IteratorClose(iteratorRecord, status).
  if (iteratorRecord.Done === Value.false) {
    return Q(IteratorClose(iteratorRecord, status));
  }
  return Completion(status);
}

function* IteratorDestructuringAssignmentEvaluation(node, iteratorRecord) {
  if (Array.isArray(node)) {
    for (const n of node) {
      Q(yield* IteratorDestructuringAssignmentEvaluation(n, iteratorRecord));
    }
    return NormalCompletion(undefined);
  }
  switch (node.type) {
    case 'Elision':
      // 1. If iteratorRecord.[[Done]] is false, then
      if (iteratorRecord.Done === Value.false) {
        // a. Let next be IteratorStep(iteratorRecord).
        const next = IteratorStep(iteratorRecord);
        // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
        if (next instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        }
        // c. ReturnIfAbrupt(next)
        ReturnIfAbrupt(next);
        // d. If next is false, set iteratorRecord.[[Done]] to true.
        if (next === Value.false) {
          iteratorRecord.Done = Value.true;
        }
      }
      // 2. Return NormalCompletion(empty).
      return NormalCompletion(undefined);
    case 'AssignmentElement': {
      const { DestructuringAssignmentTarget, Initializer } = node;
      let lref;
      // 1. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then
      if (DestructuringAssignmentTarget.type !== 'ObjectLiteral'
          && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
        lref = yield* Evaluate(DestructuringAssignmentTarget);
        ReturnIfAbrupt(lref);
      }
      let value;
      // 2. If iteratorRecord.[[Done]] is false, then
      if (iteratorRecord.Done === Value.false) {
        // a. Let next be IteratorStep(iteratorRecord).
        const next = IteratorStep(iteratorRecord);
        // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
        if (next instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        }
        // c. ReturnIfAbrupt(next);
        ReturnIfAbrupt(next);
        // d. If next is false, set iteratorRecord.[[Done]] to true.
        if (next === Value.false) {
          iteratorRecord.Done = Value.true;
        } else { // e. Else,
          // i. Let value be IteratorValue(next).
          value = IteratorValue(next);
          // ii. If value is an abrupt completion, set iteratorRecord.[[Done]] to true.
          if (value instanceof AbruptCompletion) {
            iteratorRecord.Done = Value.true;
          }
          // iii. ReturnIfAbrupt(value).
          ReturnIfAbrupt(value);
        }
      }
      // 3. If iteratorRecord.[[Done]] is true, let value be undefined.
      if (iteratorRecord.Done === Value.true) {
        value = Value.undefined;
      }
      let v;
      // 4. If Initializer is present and value is undefined, then
      if (Initializer && value === Value.undefined) {
        // a. If IsAnonymousFunctionDefinition(AssignmentExpression) is true and IsIdentifierRef of LeftHandSideExpression is true, then
        if (IsAnonymousFunctionDefinition(Initializer) && IsIdentifierRef(DestructuringAssignmentTarget)) {
          // i. Let v be NamedEvaluation of Initializer with argument GetReferencedName(lref).
          v = yield* NamedEvaluation(Initializer, GetReferencedName(lref));
        } else { // b. Else,
          // i. Let defaultValue be the result of evaluating Initializer.
          const defaultValue = yield* Evaluate(Initializer);
          // ii. Let v be ? GetValue(defaultValue).
          v = Q(GetValue(defaultValue));
        }
      } else { // 5. Else, let v be value.
        v = value;
      }
      // 6. If DestructuringAssignmentTarget is an ObjectLiteral or an ArrayLiteral, then
      if (DestructuringAssignmentTarget.type === 'ObjectLiteral'
          || DestructuringAssignmentTarget.type === 'ArrayLiteral') {
        // a. Let nestedAssignmentPattern be the AssignmentPattern that is covered by DestructuringAssignmentTarget.
        const nestedAssignmentPattern = refineLeftHandSideExpression(DestructuringAssignmentTarget);
        // b. Return the result of performing DestructuringAssignmentEvaluation of nestedAssignmentPattern with v as the argument.
        return yield* DestructuringAssignmentEvaluation(nestedAssignmentPattern, v);
      }
      // 7. Return ? PutValue(lref, v).
      return Q(PutValue(lref, v));
    }
    case 'AssignmentRestElement': {
      const { DestructuringAssignmentTarget } = node;
      let lref;
      // 1. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then
      if (DestructuringAssignmentTarget.type !== 'ObjectLiteral'
          && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
        lref = yield* Evaluate(DestructuringAssignmentTarget);
        ReturnIfAbrupt(lref);
      }
      // 2. Let A be ! ArrayCreate(0).
      const A = X(ArrayCreate(new Value(0)));
      // 3. Let n be 0.
      let n = 0;
      // 4. Repeat, while iteratorRecord.[[Done]] is false,
      while (iteratorRecord.Done === Value.false) {
        // a. Let next be IteratorStep(iteratorRecord).
        const next = IteratorStep(iteratorRecord);
        // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
        if (next instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        }
        // c. ReturnIfAbrupt(next);
        ReturnIfAbrupt(next);
        // d. If next is false, set iteratorRecord.[[Done]] to true.
        if (next === Value.false) {
          iteratorRecord.Done = Value.true;
        } else { // e. Else,
          // i. Let nextValue be IteratorValue(next).
          const nextValue = IteratorValue(next);
          // ii. If nextValue is an abrupt completion, set iteratorRecord.[[Done]] to true.
          if (nextValue instanceof AbruptCompletion) {
            iteratorRecord.Done = Value.true;
          }
          // iii. ReturnIfAbrupt(nextValue).
          ReturnIfAbrupt(nextValue);
          // iv. Perform ! CreateDataPropertyOrThrow(A, ! ToString(n), nextValue).
          X(CreateDataPropertyOrThrow(A, X(ToString(new Value(n))), nextValue));
          // v. Set n to n + 1.
          n += 1;
        }
      }
      // 5. If DestructuringAssignmentTarget is neither an ObjectLiteral nor an ArrayLiteral, then
      if (DestructuringAssignmentTarget.type !== 'ObjectLiteral'
          && DestructuringAssignmentTarget.type !== 'ArrayLiteral') {
        return Q(PutValue(lref, A));
      }
      // 6. Let nestedAssignmentPattern be the AssignmentPattern that is covered by DestructuringAssignmentTarget.
      const nestedAssignmentPattern = refineLeftHandSideExpression(DestructuringAssignmentTarget);
      // 7. Return the result of performing DestructuringAssignmentEvaluation of nestedAssignmentPattern with A as the argument.
      return yield* DestructuringAssignmentEvaluation(nestedAssignmentPattern, A);
    }
    default:
      throw new OutOfRange('IteratorDestructuringAssignmentEvaluation', node);
  }
}

export function DestructuringAssignmentEvaluation(node, value) {
  switch (node.type) {
    case 'ObjectAssignmentPattern':
      return DestructuringAssignmentEvaluation_ObjectAssignmentPattern(node, value);
    case 'ArrayAssignmentPattern':
      return DestructuringAssignmentEvaluation_ArrayAssignmentPattern(node, value);
    default:
      throw new OutOfRange('DestructuringAssignmentEvaluation', node);
  }
}
