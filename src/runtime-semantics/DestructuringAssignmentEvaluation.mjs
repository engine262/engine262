import {
  ArrayCreate,
  Assert,
  CopyDataProperties,
  CreateDataProperty,
  GetIterator,
  GetReferencedName,
  GetV,
  GetValue,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  OrdinaryObjectCreate,
  PutValue,
  RequireObjectCoercible,
  ResolveBinding,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  isArrayAssignmentPattern,
  isAssignmentPattern,
  isAssignmentRestProperty,
  isObjectAssignmentPattern,
} from '../ast.mjs';
import {
  AbruptCompletion, Completion,
  NormalCompletion,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import { OutOfRange } from '../helpers.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  IsAnonymousFunctionDefinition,
  IsIdentifierRef,
} from '../static-semantics/all.mjs';
import { Type, Value } from '../value.mjs';
import { Evaluate_PropertyName, NamedEvaluation_Expression } from './all.mjs';

// (implicit)
//   AssignmentPattern :
//     ObjectAssignmentPattern
//     ArrayAssignmentPattern
export function* DestructuringAssignmentEvaluation_AssignmentPattern(AssignmentPattern, value) {
  switch (true) {
    case isObjectAssignmentPattern(AssignmentPattern):
      return yield* DestructuringAssignmentEvaluation_ObjectAssignmentPattern(AssignmentPattern, value);

    case isArrayAssignmentPattern(AssignmentPattern):
      return yield* DestructuringAssignmentEvaluation_ArrayAssignmentPattern(AssignmentPattern, value);

    default:
      throw new OutOfRange('DestructuringAssignmentEvaluation_AssignmentPattern', AssignmentPattern);
  }
}

// 12.15.5.2 #sec-runtime-semantics-destructuringassignmentevaluation
//   ObjectAssignmentPattern :
//     `{` `}`
//     `{` AssignmentRestProperty `}`
//     `{` AssignmentPropertyList `}`
//     `{` AssignmentPropertyList `,` `}`
//     `{` AssignmentPropertyList `,` AssignmentRestProperty `}`
function* DestructuringAssignmentEvaluation_ObjectAssignmentPattern(ObjectAssignmentPattern, value) {
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
    excludedNames = Q(yield* PropertyDestructuringAssignmentEvaluation_AssignmentPropertyList(
      AssignmentPropertyList, value,
    ));
  }
  if (AssignmentRestProperty === undefined) {
    return new NormalCompletion(undefined);
  }
  return yield* RestDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, value, excludedNames);
}

// 12.15.5.2 #sec-runtime-semantics-destructuringassignmentevaluation
//   ArrayAssignmentPattern :
//     `[` `]`
//     `[` Elision `]`
//     `[` Elision_opt AssignmentRestProperty `]`
//     `[` AssignmentElementList `]`
//     `[` AssignmentElementList `,` Elision_opt AssignmentRestProperty_opt `]`
function* DestructuringAssignmentEvaluation_ArrayAssignmentPattern(ArrayAssignmentPattern, value) {
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
  // ArrayAssignmentPattern : `[` `]`
  if (AssignmentElementList.length === 0 && Elision === undefined && AssignmentRestProperty === undefined) {
    return Q(IteratorClose(iteratorRecord, new NormalCompletion(undefined)));
  }
  let status;
  if (AssignmentElementList.length > 0) {
    status = yield* IteratorDestructuringAssignmentEvaluation_AssignmentElementList(AssignmentElementList, iteratorRecord);
    if (status instanceof AbruptCompletion) {
      if (iteratorRecord.Done === Value.false) {
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
        Assert(iteratorRecord.Done === Value.true);
        return Completion(status);
      }
    }
  }
  if (AssignmentRestProperty !== undefined) {
    status = yield* IteratorDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, iteratorRecord);
  }
  if (iteratorRecord.Done === Value.false) {
    return Q(IteratorClose(iteratorRecord, status));
  }
  return Completion(status);
}

// 12.15.5.3 #sec-runtime-semantics-propertydestructuringassignmentevaluation
//   AssignmentPropertyList : AssignmentPropertyList `,` AssignmentProperty
//
// (implicit)
//   AssignmentPropertyList : AssignmentProperty
function* PropertyDestructuringAssignmentEvaluation_AssignmentPropertyList(AssignmentPropertyList, value) {
  const propertyNames = [];
  for (const AssignmentProperty of AssignmentPropertyList) {
    const nextNames = Q(yield* PropertyDestructuringAssignmentEvaluation_AssignmentProperty(AssignmentProperty, value));
    propertyNames.push(...nextNames);
  }
  return propertyNames;
}

// 12.15.5.3 #sec-runtime-semantics-propertydestructuringassignmentevaluation
//   AssignmentProperty :
//     IdentifierReference Initializer_opt
//     PropertyName `:` AssignmentElement
function* PropertyDestructuringAssignmentEvaluation_AssignmentProperty(AssignmentProperty, value) {
  if (AssignmentProperty.shorthand) {
    // AssignmentProperty : IdentifierReference Initializer_opt
    const IdentifierReference = AssignmentProperty.key;
    let Initializer;
    if (AssignmentProperty.value.type === 'AssignmentPattern') {
      Initializer = AssignmentProperty.value.right;
    }

    const P = new Value(IdentifierReference.name);
    const lref = Q(ResolveBinding(P, undefined, IdentifierReference.strict));
    let v = Q(GetV(value, P));
    if (Initializer !== undefined && Type(v) === 'Undefined') {
      if (IsAnonymousFunctionDefinition(Initializer)) {
        v = yield* NamedEvaluation_Expression(Initializer, P);
      } else {
        const defaultValue = yield* Evaluate(Initializer);
        v = Q(GetValue(defaultValue));
      }
    }
    Q(PutValue(lref, v));
    return [P];
  }

  const {
    key: PropertyName,
    value: AssignmentElement,
  } = AssignmentProperty;

  const name = yield* Evaluate_PropertyName(PropertyName, AssignmentProperty.computed);
  ReturnIfAbrupt(name);
  Q(yield* KeyedDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElement, value, name));
  return [name];
}

// 12.15.5.4 #sec-runtime-semantics-restdestructuringassignmentevaluation
//   AssignmentRestProperty : `...` DestructuringAssignmentTarget
function* RestDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, value, excludedNames) {
  const DestructuringAssignmentTarget = AssignmentRestProperty.argument;
  const lref = yield* Evaluate(DestructuringAssignmentTarget);
  ReturnIfAbrupt(lref);
  const restObj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  Q(CopyDataProperties(restObj, value, excludedNames));
  return PutValue(lref, restObj);
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentElementList :
//     AssignmentElisionElement
//     AssignmentElementList `,` AssignmentElisionElement
function* IteratorDestructuringAssignmentEvaluation_AssignmentElementList(AssignmentElementList, iteratorRecord) {
  Assert(AssignmentElementList.length > 0);
  let result;
  for (const AssignmentElisionElement of AssignmentElementList) {
    result = Q(yield* IteratorDestructuringAssignmentEvaluation_AssignmentElisionElement(AssignmentElisionElement, iteratorRecord));
  }
  return result;
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentElisionElement :
//     AssignmentElement
//     Elision AssignmentElement
function* IteratorDestructuringAssignmentEvaluation_AssignmentElisionElement(AssignmentElisionElement, iteratorRecord) {
  if (!AssignmentElisionElement) {
    // This is an elision.
    return IteratorDestructuringAssignmentEvaluation_Elision([AssignmentElisionElement], iteratorRecord);
  }
  return yield* IteratorDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElisionElement, iteratorRecord);
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentElement : DestructuringAssignmentTarget Initializer_opt
function* IteratorDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElement, iteratorRecord) {
  let DestructuringAssignmentTarget = AssignmentElement;
  let Initializer;
  if (AssignmentElement.type === 'AssignmentPattern') {
    DestructuringAssignmentTarget = AssignmentElement.left;
    Initializer = AssignmentElement.right;
  }

  let lref;
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    lref = yield* Evaluate(DestructuringAssignmentTarget);
    ReturnIfAbrupt(lref);
  }
  let value;
  if (iteratorRecord.Done === Value.false) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    } else {
      value = IteratorValue(next);
      if (value instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      ReturnIfAbrupt(value);
    }
  }
  if (iteratorRecord.Done === Value.true) {
    value = Value.undefined;
  }
  let v;
  if (Initializer !== undefined && value === Value.undefined) {
    if (IsAnonymousFunctionDefinition(Initializer)
        && IsIdentifierRef(DestructuringAssignmentTarget)) {
      v = yield* NamedEvaluation_Expression(Initializer, GetReferencedName(lref));
    } else {
      const defaultValue = yield* Evaluate(Initializer);
      v = Q(GetValue(defaultValue));
    }
  } else {
    v = value;
  }
  if (isAssignmentPattern(DestructuringAssignmentTarget)) {
    const nestedAssignmentPattern = DestructuringAssignmentTarget;
    return yield* DestructuringAssignmentEvaluation_AssignmentPattern(nestedAssignmentPattern, v);
  }
  return Q(PutValue(lref, v));
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   Elision :
//     `,`
//     Elision `,`
export function IteratorDestructuringAssignmentEvaluation_Elision(Elision, iteratorRecord) {
  let remaining = Elision.length;
  while (remaining > 0 && iteratorRecord.Done === Value.false) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    }
    remaining -= 1;
  }
  return new NormalCompletion(undefined);
}

// 12.15.5.5 #sec-runtime-semantics-iteratordestructuringassignmentevaluation
//   AssignmentRestElement : `...` DestructuringAssignmentTarget
function* IteratorDestructuringAssignmentEvaluation_AssignmentRestProperty(AssignmentRestProperty, iteratorRecord) {
  const DestructuringAssignmentTarget = AssignmentRestProperty.argument;
  let lref;
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    lref = yield* Evaluate(DestructuringAssignmentTarget);
    ReturnIfAbrupt(lref);
  }
  const A = X(ArrayCreate(new Value(0)));
  let n = 0;
  while (iteratorRecord.Done === Value.false) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    } else {
      const nextValue = IteratorValue(next);
      if (nextValue instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      ReturnIfAbrupt(nextValue);
      const status = X(CreateDataProperty(A, ToString(new Value(n)), nextValue));
      Assert(status === Value.true);
      n += 1;
    }
  }
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    return Q(PutValue(lref, A));
  }
  const nestedAssignmentPattern = DestructuringAssignmentTarget;
  return yield* DestructuringAssignmentEvaluation_AssignmentPattern(nestedAssignmentPattern, A);
}

// 12.15.5.6 #sec-runtime-semantics-keyeddestructuringassignmentevaluation
//   AssignmentElement : DestructuringAssignmentTarget Initializer_opt
function* KeyedDestructuringAssignmentEvaluation_AssignmentElement(AssignmentElement, value, propertyName) {
  let DestructuringAssignmentTarget = AssignmentElement;
  let Initializer;
  if (AssignmentElement.type === 'AssignmentPattern') {
    DestructuringAssignmentTarget = AssignmentElement.left;
    Initializer = AssignmentElement.right;
  }

  let lref;
  if (!isAssignmentPattern(DestructuringAssignmentTarget)) {
    lref = yield* Evaluate(DestructuringAssignmentTarget);
    ReturnIfAbrupt(lref);
  }
  const v = Q(GetV(value, propertyName));
  let rhsValue;
  if (Initializer !== undefined && v === Value.undefined) {
    if (IsAnonymousFunctionDefinition(Initializer)
        && IsIdentifierRef(DestructuringAssignmentTarget)) {
      rhsValue = yield* NamedEvaluation_Expression(Initializer, GetReferencedName(lref));
    } else {
      const defaultValue = yield* Evaluate(Initializer);
      rhsValue = Q(GetValue(defaultValue));
    }
  } else {
    rhsValue = v;
  }
  if (isAssignmentPattern(DestructuringAssignmentTarget)) {
    const assignmentPattern = DestructuringAssignmentTarget;
    return yield* DestructuringAssignmentEvaluation_AssignmentPattern(assignmentPattern, rhsValue);
  }
  return Q(PutValue(lref, rhsValue));
}
