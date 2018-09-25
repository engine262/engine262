import {
  ArrayCreate,
  Assert,
  CopyDataProperties,
  CreateDataProperty,
  GetIterator,
  GetReferencedName,
  GetV,
  GetValue,
  HasOwnProperty,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  ObjectCreate,
  PutValue,
  RequireObjectCoercible,
  ResolveBinding,
  SetFunctionName,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  isArrayAssignmentPattern,
  isAssignmentPattern,
  isAssignmentRestProperty,
  isObjectAssignmentPattern,
} from '../ast.mjs';
import {
  Q, X,
  ReturnIfAbrupt,
  AbruptCompletion,
  Completion,
  NormalCompletion,
} from '../completion.mjs';
import { outOfRange } from '../helpers.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
} from '../static-semantics/all.mjs';
import { Evaluate_PropertyName } from './all.mjs';
import { Type, New as NewValue } from '../value.mjs';

// (implicit)
//   AssignmentPattern :
//     ObjectAssignmentPattern
//     ArrayAssignmentPattern
export function DestructuringAssignmentEvaluation_AssignmentPattern(AssignmentPattern, value) {
  switch (true) {
    case isObjectAssignmentPattern(AssignmentPattern):
      return DestructuringAssignmentEvaluation_ObjectAssignmentPattern(AssignmentPattern, value);

    case isArrayAssignmentPattern(AssignmentPattern):
      return DestructuringAssignmentEvaluation_ArrayAssignmentPattern(AssignmentPattern, value);

    default:
      throw outOfRange('DestructuringAssignmentEvaluation_AssignmentPattern', AssignmentPattern);
  }
}

// 12.15.5.2 #sec-runtime-semantics-destructuringassignmentevaluation
//   ObjectAssignmentPattern :
//     `{` `}`
//     `{` AssignmentRestProperty `}`
//     `{` AssignmentPropertyList `}`
//     `{` AssignmentPropertyList `,` `}`
//     `{` AssignmentPropertyList `,` AssignmentRestProperty `}`
function DestructuringAssignmentEvaluation_ObjectAssignmentPattern(ObjectAssignmentPattern, value) {
  let AssignmentPropertyList = ObjectAssignmentPattern.properties;
  let AssignmentRestProperty;
  // Members of the AssignmentPropertyList may be null, so add a truthyness check.
  if (AssignmentPropertyList.length > 0 && AssignmentPropertyList[AssignmentPropertyList.length - 1]
      && isAssignmentRestProperty(AssignmentPropertyList[AssignmentPropertyList.length - 1])) {
    AssignmentRestProperty = AssignmentPropertyList[AssignmentPropertyList.length - 1];
    AssignmentPropertyList = AssignmentPropertyList.slice(0, -1);
  }

  Q(RequireObjectCoercible(value));
  let excludedNames = [];
  if (AssignmentPropertyList.length > 0) {
    excludedNames = Q(PropertyDestructuringAssignmentEvaluation_AssignmentPropertyList(
      AssignmentPropertyList, value,
    ));
  }
  if (AssignmentRestProperty === undefined) {
    return new NormalCompletion(undefined);
  }
  return RestDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, value, excludedNames);
}

// 12.15.5.2 #sec-runtime-semantics-destructuringassignmentevaluation
//   ArrayAssignmentPattern :
//     `[` `]`
//     `[` Elision `]`
//     `[` Elision_opt AssignmentRestProperty `]`
//     `[` AssignmentElementList `]`
//     `[` AssignmentElementList `,` Elision_opt AssignmentRestProperty_opt `]`
function DestructuringAssignmentEvaluation_ArrayAssignmentPattern(ArrayAssignmentPattern, value) {
  let Elision;
  let AssignmentElementList = ArrayAssignmentPattern.elements;
  let AssignmentRestProperty;
  // Members of the AssignmentElementList may be null, so add a truthyness check.
  if (AssignmentElementList.length > 0 && AssignmentElementList[AssignmentElementList.length - 1]
      && isAssignmentRestProperty(AssignmentElementList[AssignmentElementList.length - 1])) {
    AssignmentRestProperty = AssignmentElementList[AssignmentElementList.length - 1];
    AssignmentElementList = AssignmentElementList.slice(0, -1);
  }
  if (AssignmentElementList.length > 0) {
    let begin;
    for (begin = AssignmentElementList.length; begin > 0; begin -= 1) {
      if (AssignmentElementList[begin - 1] !== null) {
        break;
      }
    }
    if (begin !== AssignmentElementList.length) {
      Elision = AssignmentElementList.slice(begin);
      AssignmentElementList = AssignmentElementList.slice(0, begin);
    }
  }

  const iteratorRecord = Q(GetIterator(value));
  let status;
  if (AssignmentElementList.length > 0) {
    status = IteratorDestructuringAssignmentEvaluation_AssignmentElementList(AssignmentElementList, iteratorRecord);
    if (status instanceof AbruptCompletion) {
      if (iteratorRecord.Done.isFalse()) {
        return Q(IteratorClose(iteratorRecord, status));
      }
      return Completion(status);
    }
  }
  if (Elision !== undefined) {
    status = IteratorDestructuringAssignmentEvaluation_Elision(Elision, iteratorRecord);
    if (AssignmentRestProperty === undefined) {
      // ArrayAssignmentPattern : `[` Elision `]`
    } else {
      // ArrayAssignmentPattern :
      //   `[` Elision AssignmentRestElement `]`
      //   `[` AssignmentElementList `,` Elision AssignmentRestElement_opt `]`
      if (status instanceof AbruptCompletion) {
        Assert(iteratorRecord.Done.isTrue());
        return Completion(status);
      }
    }
  }
  if (AssignmentRestProperty !== undefined) {
    status = IteratorDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, iteratorRecord);
  }
  // ArrayAssignmentPattern : `[` `]`
  if (status === undefined) {
    return Q(IteratorClose(iteratorRecord, new NormalCompletion(undefined)));
  }
  if (iteratorRecord.Done.isFalse()) {
    return Q(IteratorClose(iteratorRecord, status));
  }
  return Completion(status);
}

// 12.15.5.3 #sec-runtime-semantics-propertydestructuringassignmentevaluation
//   AssignmentPropertyList : AssignmentPropertyList `,` AssignmentProperty
//
// (implicit)
//   AssignmentPropertyList : AssignmentProperty
function PropertyDestructuringAssignmentEvaluation_AssignmentPropertyList(AssignmentPropertyList, value) {
  const names = [];
  for (const AssignmentProperty of AssignmentPropertyList) {
    names.push(...PropertyDestructuringAssignmentEvaluation_AssignmentProperty(AssignmentProperty, value));
  }
  return names;
}

// 12.15.5.3 #sec-runtime-semantics-propertydestructuringassignmentevaluation
//   AssignmentProperty :
//     IdentifierReference Initializer_opt
//     PropertyName `:` AssignmentElement
function PropertyDestructuringAssignmentEvaluation_AssignmentProperty(AssignmentProperty, value) {
  if (AssignmentProperty.shorthand) {
    // AssignmentProperty : IdentifierReference Initializer_opt
    const IdentifierReference = AssignmentProperty.key;
    let Initializer;
    if (AssignmentProperty.value.type === 'AssignmentPattern') {
      Initializer = AssignmentProperty.value.right;
    }

    const P = IdentifierReference.name;
    const lref = Q(ResolveBinding(P));
    let v = Q(GetV(value, P));
    if (Initializer !== undefined && Type(v) === 'Undefined') {
      const defaultValue = Evaluate_Expression(Initializer);
      v = Q(GetValue(defaultValue));
      if (IsAnonymousFunctionDefinition(Initializer)) {
        const hasNameProperty = Q(HasOwnProperty(v, NewValue('name')));
        if (hasNameProperty.isFalse()) {
          X(SetFunctionName(v, P));
        }
      }
    }
    Q(PutValue(lref, v));
    return [P];
  }

  const {
    key: PropertyName,
    value: AssignmentElement,
  } = AssignmentProperty;

  let name = Evaluate_PropertyName(PropertyName, AssignmentProperty.computed);
  ReturnIfAbrupt(name);
  Q(KeyedDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElement, value, name));
  return [name];
}

// 12.15.5.4 #sec-runtime-semantics-restdestructuringassignmentevaluation
//   AssignmentRestProperty : `...` DestructuringAssignmentTarget
function RestDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, value, excludedNames) {
  const DestructuringAssignmentTarget = AssignmentRestProperty.argument;
  let lref = Evaluate_Expression(DestructuringAssignmentTarget);
  ReturnIfAbrupt(lref);
  const restObj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  Q(CopyDataProperties(restObj, value, excludedNames));
  return PutValue(lref, restObj);
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentElementList :
//     AssignmentElisionElement
//     AssignmentElementList `,` AssignmentElisionElement
function IteratorDestructuringAssignmentEvaluation_AssignmentElementList(AssignmentElementList, iteratorRecord) {
  Assert(AssignmentElementList.length > 0);
  let result;
  for (const AssignmentElisionElement of AssignmentElementList) {
    result = Q(IteratorDestructuringAssignmentEvaluation_AssignmentElisionElement(AssignmentElisionElement, iteratorRecord));
  }
  return result;
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentElisionElement :
//     AssignmentElement
//     Elision AssignmentElement
function IteratorDestructuringAssignmentEvaluation_AssignmentElisionElement(AssignmentElisionElement, iteratorRecord) {
  if (!AssignmentElisionElement) {
    // This is an elision.
    return IteratorDestructuringAssignmentEvaluation_Elision([AssignmentElisionElement], iteratorRecord);
  }
  return IteratorDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElisionElement, iteratorRecord);
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentElement : DestructuringAssignmentTarget Initializer_opt
function IteratorDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElement, iteratorRecord) {
  let DestructuringAssignmentTarget = AssignmentElement;
  let Initializer;
  if (AssignmentElement.type === 'AssignmentPattern') {
    DestructuringAssignmentTarget = AssignmentElement.left;
    Initializer = AssignmentElement.right;
  }

  let lref;
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    lref = Evaluate_Expression(DestructuringAssignmentTarget);
    ReturnIfAbrupt(lref);
  }
  let value;
  if (iteratorRecord.Done.isFalse()) {
    let next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(next);
    if (next.isFalse()) {
      iteratorRecord.Done = NewValue(true);
    } else {
      value = IteratorValue(next);
      if (value instanceof AbruptCompletion) {
        iteratorRecord.Done = NewValue(true);
      }
      ReturnIfAbrupt(value);
    }
  }
  if (iteratorRecord.Done.isTrue()) {
    value = NewValue(undefined);
  }
  let v;
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = Evaluate_Expression(Initializer);
    v = Q(GetValue(defaultValue));
  } else {
    v = value;
  }
  if (isAssignmentPattern(DestructuringAssignmentTarget)) {
    const nestedAssignmentPattern = DestructuringAssignmentTarget;
    return DestructuringAssignmentEvaluation_AssignmentPattern(nestedAssignmentPattern, v);
  }
  if (Initializer !== undefined
      && Type(v) === 'Undefined'
      && IsAnonymousFunctionDefinition(Initializer)
      && IsIdentifierRef(DestructuringAssignmentTarget)) {
    const hasNameProperty = Q(HasOwnProperty(v, NewValue('name')));
    if (hasNameProperty.isFalse()) {
      X(SetFunctionName(v, GetReferencedName(lref)));
    }
  }
  return Q(PutValue(lref, v));
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   Elision :
//     `,`
//     Elision `,`
function IteratorDestructuringAssignmentEvaluation_Elision(Elision, iteratorRecord) {
  let remaining = Elision.length;
  while (remaining > 0 && iteratorRecord.Done.isFalse()) {
    let next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(next);
    if (next.isFalse()) {
      iteratorRecord.Done = NewValue(true);
    }
  }
  return new NormalCompletion(undefined);
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentRestElement : `...` DestructuringAssignmentTarget
function IteratorDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, iteratorRecord) {
  const DestructuringAssignmentTarget = AssignmentRestProperty.argument;
  let lref;
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    lref = Evaluate_Expression(DestructuringAssignmentTarget);
    ReturnIfAbrupt(lref);
  }
  const A = X(ArrayCreate(NewValue(0)));
  let n = 0;
  while (iteratorRecord.Done.isFalse()) {
    let next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(next);
    if (next.isFalse()) {
      iteratorRecord.Done = NewValue(true);
    } else {
      let nextValue = IteratorValue(next);
      if (nextValue instanceof AbruptCompletion) {
        iteratorRecord.Done = NewValue(true);
      }
      ReturnIfAbrupt(nextValue);
      const status = X(CreateDataProperty(A, ToString(NewValue(n)), nextValue));
      Assert(status.isTrue());
      n += 1;
    }
  }
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    return Q(PutValue(lref, A));
  }
  const nestedAssignmentPattern = DestructuringAssignmentTarget;
  return DestructuringAssignmentEvaluation_AssignmentPattern(nestedAssignmentPattern, A);
}

// 12.15.5.6 #sec-runtime-semantics-keyeddestructuringassignmentevaluation
//   AssignmentElement : DestructuringAssignmentTarget Initializer_opt
function KeyedDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElement, value, propertyName) {
  let DestructuringAssignmentTarget = AssignmentElement;
  let Initializer;
  if (AssignmentElement.type === 'AssignmentPattern') {
    DestructuringAssignmentTarget = AssignmentElement.left;
    Initializer = AssignmentElement.right;
  }

  let lref;
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    lref = Evaluate_Expression(DestructuringAssignmentTarget);
    ReturnIfAbrupt(lref);
  }
  const v = Q(GetV(value, propertyName));
  let rhsValue;
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = Evaluate_Expression(Initializer);
    rhsValue = Q(GetValue(defaultValue));
  } else {
    rhsValue = v;
  }
  if (isAssignmentPattern(DestructuringAssignmentTarget)) {
    const assignmentPattern = DestructuringAssignmentTarget;
    return DestructuringAssignmentEvaluation_AssignmentPattern(assignmentPattern, rhsValue);
  }
  if (Initializer !== undefined
      && Type(v) === 'Undefined'
      && IsAnonymousFunctionDefinition(Initializer)
      && IsIdentifierRef(DestructuringAssignmentTarget)) {
    const hasNameProperty = Q(HasOwnProperty(rhsValue, NewValue('name')));
    if (hasNameProperty.isFalse()) {
      X(SetFunctionName(rhsValue, GetReferencedName(lref)));
    }
  }
  return Q(PutValue(lref, rhsValue));
}
