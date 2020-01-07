import {
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isBindingRestElement,
  isFormalParameter,
  isFunctionRestParameter,
  isSingleNameBinding,
} from '../ast.mjs';
import {
  ArrayCreate,
  Assert,
  CreateDataProperty,
  GetValue,
  InitializeReferencedBinding,
  IteratorStep,
  IteratorValue,
  PutValue,
  ResolveBinding,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  Type,
  Value,
} from '../value.mjs';
import {
  BindingInitialization_BindingPattern,
  IteratorDestructuringAssignmentEvaluation_Elision,
  NamedEvaluation_Expression,
} from './all.mjs';

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   ArrayBindingPattern :
//     `[` `]`
//     `[` Elision `]`
//     `[` Elision BindingRestElement `]`
//     `[` BindingElementList `]`
//     `[` BindingElementList `,` `]`
//     `[` BindingElementList `,` Elision `]`
//     `[` BindingElementList `,` Elision BindingRestElement `]`
export function* IteratorBindingInitialization_ArrayBindingPattern(ArrayBindingPattern, iteratorRecord, environment) {
  let Elision;
  let BindingElementList = ArrayBindingPattern.elements;
  let BindingRestElement;
  // Members of the BindingElementList may be null, so add a truthyness check.
  if (BindingElementList.length > 0 && BindingElementList[BindingElementList.length - 1]
      && isBindingRestElement(BindingElementList[BindingElementList.length - 1])) {
    BindingRestElement = BindingElementList[BindingElementList.length - 1];
    BindingElementList = BindingElementList.slice(0, -1);
  }
  if (BindingElementList.length > 0) {
    let begin;
    for (begin = BindingElementList.length; begin > 0; begin -= 1) {
      if (BindingElementList[begin - 1] !== null) {
        break;
      }
    }
    if (begin !== BindingElementList.length) {
      Elision = BindingElementList.slice(begin);
      BindingElementList = BindingElementList.slice(0, begin);
    }
  }

  let status = new NormalCompletion(undefined);
  if (BindingElementList.length > 0) {
    status = Q(yield* IteratorBindingInitialization_BindingElementList(BindingElementList, iteratorRecord, environment));
  }
  if (Elision !== undefined) {
    status = Q(IteratorDestructuringAssignmentEvaluation_Elision(Elision, iteratorRecord));
  }
  if (BindingRestElement !== undefined) {
    status = Q(yield* IteratorBindingInitialization_BindingRestElement(BindingRestElement, iteratorRecord, environment));
  }
  return status;
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingElement : BindingPattern Initializer
function* IteratorBindingInitialization_BindingElement_BindingPattern(BindingElement, iteratorRecord, environment) {
  let BindingPattern;
  let Initializer;
  switch (true) {
    case isBindingPattern(BindingElement):
      BindingPattern = BindingElement;
      Initializer = undefined;
      break;
    case isBindingPatternAndInitializer(BindingElement):
      BindingPattern = BindingElement.left;
      Initializer = BindingElement.right;
      break;
    default:
      throw new OutOfRange(
        'IteratorBindingInitialization_BindingElement_BindingPattern', BindingElement,
      );
  }
  let v;
  if (iteratorRecord.Done === Value.false) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    } else {
      v = IteratorValue(next);
      if (v instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      ReturnIfAbrupt(v);
    }
  }
  if (iteratorRecord.Done === Value.true) {
    v = Value.undefined;
  }
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = yield* Evaluate(Initializer);
    v = Q(GetValue(defaultValue));
  }
  return yield* BindingInitialization_BindingPattern(BindingPattern, v, environment);
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   SingleNameBinding : BindingIdentifier Initializer
function* IteratorBindingInitialization_SingleNameBinding(SingleNameBinding, iteratorRecord, environment) {
  let BindingIdentifier;
  let Initializer;
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      BindingIdentifier = SingleNameBinding;
      Initializer = undefined;
      break;
    case isBindingIdentifierAndInitializer(SingleNameBinding):
      BindingIdentifier = SingleNameBinding.left;
      Initializer = SingleNameBinding.right;
      break;
    default:
      throw new OutOfRange('IteratorBindingInitialization_SingleNameBinding', SingleNameBinding);
  }
  const bindingId = new Value(BindingIdentifier.name);
  const lhs = Q(ResolveBinding(bindingId, environment, BindingIdentifier.strict));
  let v;
  if (iteratorRecord.Done === Value.false) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(next);
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    } else {
      v = IteratorValue(next);
      if (v instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      ReturnIfAbrupt(v);
    }
  }
  if (iteratorRecord.Done === Value.true) {
    v = Value.undefined;
  }
  if (Initializer !== undefined && v === Value.undefined) {
    if (IsAnonymousFunctionDefinition(Initializer)) {
      v = yield* NamedEvaluation_Expression(Initializer, bindingId);
    } else {
      const defaultValue = yield* Evaluate(Initializer);
      v = Q(GetValue(defaultValue));
    }
  }
  if (Type(environment) === 'Undefined') {
    return Q(PutValue(lhs, v));
  }
  return InitializeReferencedBinding(lhs, v);
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingElementList : BindingElementList `,` BindingElisionElement
//
// (implicit)
//   BindingElementList : BindingElisionElement
function* IteratorBindingInitialization_BindingElementList(BindingElementList, iteratorRecord, environment) {
  Assert(BindingElementList.length > 0);
  let result;
  for (const BindingElisionElement of BindingElementList) {
    result = Q(yield* IteratorBindingInitialization_BindingElisionElement(BindingElisionElement, iteratorRecord, environment));
  }
  return result;
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingElisionElement :
//     BindingElement
//     Elision BindingElement
function* IteratorBindingInitialization_BindingElisionElement(BindingElisionElement, iteratorRecord, environment) {
  if (!BindingElisionElement) {
    // This is an elision.
    return Q(IteratorDestructuringAssignmentEvaluation_Elision([BindingElisionElement], iteratorRecord));
  }
  return yield* IteratorBindingInitialization_BindingElement(BindingElisionElement, iteratorRecord, environment);
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingElement : SingleNameBinding
function* IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment) {
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return yield* IteratorBindingInitialization_SingleNameBinding(BindingElement, iteratorRecord, environment);
    case isBindingPattern(BindingElement) || isBindingPatternAndInitializer(BindingElement):
      return yield* IteratorBindingInitialization_BindingElement_BindingPattern(BindingElement, iteratorRecord, environment);
    default:
      throw new OutOfRange('IteratorBindingInitialization_BindingElement', BindingElement);
  }
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingRestElement : `...` BindingIdentifier
function IteratorBindingInitialization_BindingRestElement_Identifier(BindingRestElement, iteratorRecord, environment) {
  const BindingIdentifier = BindingRestElement.argument;
  const lhs = Q(ResolveBinding(new Value(BindingIdentifier.name), environment, BindingIdentifier.strict));
  const A = X(ArrayCreate(new Value(0)));
  let n = 0;
  while (true) {
    let next;
    if (iteratorRecord.Done === Value.false) {
      next = IteratorStep(iteratorRecord);
      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      ReturnIfAbrupt(next);
      if (next === Value.false) {
        iteratorRecord.Done = Value.true;
      }
    }
    if (iteratorRecord.Done === Value.true) {
      if (Type(environment) === 'Undefined') {
        return Q(PutValue(lhs, A));
      }
      return InitializeReferencedBinding(lhs, A);
    }
    const nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(nextValue);
    const nStr = X(ToString(new Value(n)));
    const status = X(CreateDataProperty(A, nStr, nextValue));
    Assert(status === Value.true);
    n += 1;
  }
}

// 13.3.3.8 #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingRestElement :
//     `...` BindingPattern
function* IteratorBindingInitialization_BindingRestElement_Pattern(BindingRestElement, iteratorRecord, environment) {
  const BindingPattern = BindingRestElement.argument;
  const A = X(ArrayCreate(new Value(0)));
  let n = 0;
  while (true) {
    let next;
    if (iteratorRecord.Done === Value.false) {
      next = IteratorStep(iteratorRecord);
      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      ReturnIfAbrupt(next);
      if (next === Value.false) {
        iteratorRecord.Done = Value.true;
      }
    }
    if (iteratorRecord.Done === Value.true) {
      return yield* BindingInitialization_BindingPattern(BindingPattern, A, environment);
    }
    const nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    ReturnIfAbrupt(nextValue);
    const nStr = X(ToString(new Value(n)));
    const status = X(CreateDataProperty(A, nStr, nextValue));
    Assert(status === Value.true);
    n += 1;
  }
}

function* IteratorBindingInitialization_BindingRestElement(BindingRestElement, iteratorRecord, environment) {
  switch (true) {
    case isBindingIdentifier(BindingRestElement.argument):
      return IteratorBindingInitialization_BindingRestElement_Identifier(BindingRestElement, iteratorRecord, environment);
    case isBindingPattern(BindingRestElement.argument):
      return yield* IteratorBindingInitialization_BindingRestElement_Pattern(BindingRestElement, iteratorRecord, environment);
    default:
      throw new OutOfRange('IteratorBindingInitialization_BindingRestElement', BindingRestElement);
  }
}

// 14.1.19 #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
//   FormalParameter : BindingElement
function IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment) {
  const BindingElement = FormalParameter;
  return IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment);
}

// 14.1.19 #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
//   FunctionRestParameter : BindingRestElement
function IteratorBindingInitialization_FunctionRestParameter(FunctionRestParameter, iteratorRecord, environment) {
  const BindingRestElement = FunctionRestParameter;
  return IteratorBindingInitialization_BindingRestElement(BindingRestElement, iteratorRecord, environment);
}

// 14.1.19 #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
//   FormalParameters :
//     [empty]
//     FormalParameterList `,` FunctionRestParameter
//   FormalParameterList : FormalParameterList `,` FormalParameter
//
// (implicit)
//   FormalParameters :
//     FunctionRestParameter
//     FormalParameterList
//     FormalParameterList `,`
//   FormalParameterList : FormalParameter
export function* IteratorBindingInitialization_FormalParameters(
  FormalParameters, iteratorRecord, environment,
) {
  if (FormalParameters.length === 0) {
    return new NormalCompletion(undefined);
  }

  for (const FormalParameter of FormalParameters.slice(0, -1)) {
    Assert(isFormalParameter(FormalParameter));
    Q(yield* IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment));
  }

  const last = FormalParameters[FormalParameters.length - 1];
  if (isFunctionRestParameter(last)) {
    return yield* IteratorBindingInitialization_FunctionRestParameter(last, iteratorRecord, environment);
  }
  Assert(isFormalParameter(last));
  return yield* IteratorBindingInitialization_FormalParameter(last, iteratorRecord, environment);
}
