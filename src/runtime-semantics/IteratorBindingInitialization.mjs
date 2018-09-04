import {
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isFormalParameter,
  isFunctionRestParameter,
  isSingleNameBinding,
} from '../ast.mjs';
import {
  ArrayCreate,
  Assert,
  CreateDataProperty,
  GetValue,
  HasOwnProperty,
  InitializeReferencedBinding,
  IteratorStep,
  IteratorValue,
  PutValue,
  SetFunctionName,
  ToString,
} from '../abstract-ops/all.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  Q,
  X,
  ReturnIfAbrupt,
} from '../completion.mjs';
import {
  surroundingAgent,
  ResolveBinding,
} from '../engine.mjs';
import { NewDeclarativeEnvironment } from '../environment.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { outOfRange } from '../helpers.mjs';
import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import {
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  BindingInitialization_BindingPattern,
} from './all.mjs';

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   ArrayBindingPattern :
//     `[` `]`
//     `[` Elision `]`
//     `[` Elision BindingRestElement `]`
//     `[` BindingElementList `]`
//     `[` BindingElementList `,` `]`
//     `[` BindingElementList `,` Elision `]`
//     `[` BindingElementList `,` Elision BindingRestElement `]`
export function IteratorBindingInitialization_ArrayBindingPattern(ArrayBindingPattern) {
  switch (true) {
    default:
      throw outOfRange('IteratorBindingInitialization_ArrayBindingPattern', ArrayBindingPattern);
  }
}

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingElement : BindingPattern Initializer
export function IteratorBindingInitialization_BindingElement_BindingPattern(BindingElement, iteratorRecord, environment) {
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
      throw outOfRange(
        'IteratorBindingInitialization_BindingElement_BindingPattern', BindingElement,
      );
  }
  let v;
  if (iteratorRecord.Done.isFalse()) {
    const next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(next);
    if (Type(next) === 'Boolean' && next.isFalse()) {
      iteratorRecord.Done = NewValue(true);
    } else {
      v = IteratorValue(next);
      if (v instanceof AbruptCompletion) {
        iteratorRecord.Done = NewValue(true);
      }
      ReturnIfAbrupt(v);
    }
  }
  if (iteratorRecord.Done.isTrue()) {
    v = NewValue(undefined);
  }
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = Evaluate_Expression(Initializer);
    v = Q(GetValue(defaultValue));
  }
  return BindingInitialization_BindingPattern(BindingPattern, v, environment);
}

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   SingleNameBinding : BindingIdentifier Initializer
export function IteratorBindingInitialization_SingleNameBinding(SingleNameBinding, iteratorRecord, environment) {
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
      throw outOfRange('IteratorBindingInitialization_SingleNameBinding', SingleNameBinding);
  }
  const bindingId = NewValue(BindingIdentifier.name);
  const lhs = Q(ResolveBinding(bindingId, environment));
  let v;
  if (iteratorRecord.Done.isFalse()) {
    let next = IteratorStep(iteratorRecord);
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(next);
    if (Type(next) === 'Boolean' && next.isFalse()) {
      iteratorRecord.Done = NewValue(true);
    } else {
      v = IteratorValue(next);
      if (v instanceof AbruptCompletion) {
        iteratorRecord.Done = NewValue(true);
      }
      ReturnIfAbrupt(v);
    }
  }
  if (iteratorRecord.Done.isTrue()) {
    v = NewValue(undefined);
  }
  if (Initializer !== undefined && Type(v) === 'Undefined') {
    const defaultValue = Evaluate_Expression(Initializer);
    v = Q(GetValue(defaultValue));
    if (IsAnonymousFunctionDefinition(Initializer)) {
      const hasNameProperty = Q(HasOwnProperty(v, NewValue('name')));
      if (hasNameProperty.isFalse()) {
        X(SetFunctionName(v, bindingId));
      }
    }
  }
  if (Type(environment) === 'Undefined') {
    return Q(PutValue(lhs, v));
  }
  return InitializeReferencedBinding(lhs, v);
}

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingElement : SingleNameBinding
export function IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment) {
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return IteratorBindingInitialization_SingleNameBinding(BindingElement, iteratorRecord, environment);
    case isBindingPattern(BindingElement) || isBindingPatternAndInitializer(BindingElement):
      return IteratorBindingInitialization_BindingElement_BindingPattern(BindingElement, iteratorRecord, environment);
    default:
      throw outOfRange('IteratorBindingInitialization_BindingElement', BindingElement);
  }
}

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingRestElement : `...` BindingIdentifier
export function IteratorBindingInitialization_BindingRestElement_Identifier(BindingRestElement, iteratorRecord, environment) {
  const BindingIdentifier = BindingRestElement.argument;
  const lhs = Q(ResolveBinding(BindingIdentifier, environment));
  const A = X(ArrayCreate(0));
  let n = 0;
  while (true) {
    let next;
    if (iteratorRecord.Done.isFalse()) {
      next = IteratorStep(iteratorRecord);
      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = NewValue(true);
      }
      ReturnIfAbrupt(next);
      if (next.isFalse()) {
        iteratorRecord.Done = NewValue(true);
      }
    }
    if (iteratorRecord.Done.isTrue()) {
      if (Type(environment) === 'Undefined') {
        return Q(PutValue(lhs, A));
      }
      return InitializeReferencedBinding(lhs, A);
    }
    let nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(nextValue);
    const nStr = X(ToString(n));
    const status = X(CreateDataProperty(A, nStr, nextValue));
    Assert(status.isTrue());
    n += 1;
  }
}

// #sec-destructuring-binding-patterns-runtime-semantics-iteratorbindinginitialization
//   BindingRestElement :
//     `...` BindingPattern
export function IteratorBindingInitialization_BindingRestElement_Pattern(BindingRestElement, iteratorRecord, environment) {
  const BindingPattern = BindingRestElement.argument;
  const A = X(ArrayCreate(0));
  let n = 0;
  while (true) {
    let next;
    if (iteratorRecord.Done.isFalse()) {
      next = IteratorStep(iteratorRecord);
      if (next instanceof AbruptCompletion) {
        iteratorRecord.Done = NewValue(true);
      }
      ReturnIfAbrupt(next);
      if (next.isFalse()) {
        iteratorRecord.Done = NewValue(true);
      }
    }
    if (iteratorRecord.Done.isTrue()) {
      return BindingInitialization_BindingPattern(BindingPattern, A, environment);
    }
    let nextValue = IteratorValue(next);
    if (nextValue instanceof AbruptCompletion) {
      iteratorRecord.Done = NewValue(true);
    }
    ReturnIfAbrupt(nextValue);
    const nStr = X(ToString(n));
    const status = X(CreateDataProperty(A, nStr, nextValue));
    Assert(status.isTrue());
    n += 1;
  }
}

export function IteratorBindingInitialization_BindingRestElement(BindingRestElement, iteratorRecord, environment) {
  switch (true) {
    case isBindingIdentifier(BindingRestElement.argument):
      return IteratorBindingInitialization_BindingRestElement_Identifier(BindingRestElement, iteratorRecord, environment);
    case isBindingPattern(BindingRestElement.arguement):
      return IteratorBindingInitialization_BindingRestElement_Pattern(BindingRestElement, iteratorRecord, environment);
    default:
      throw outOfRange('IteratorBindingInitialization_BindingRestElement', BindingRestElement);
  }
}

// #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
//   FormalParameter : BindingElement
export function IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment) {
  const BindingElement = FormalParameter;
  // if (!ContainsExpression_BindingElement(BindingElement)) {
  //   return IteratorBindingInitialization_BindingElement(
  //     BindingElement, iteratorRecord, environment,
  //   );
  // }
  const currentContext = surroundingAgent.runningExecutionContext;
  const originalEnv = currentContext.VariableEnvironment;
  Assert(currentContext.VariableEnvironment === currentContext.LexicalEnvironment);
  Assert(environment === originalEnv);
  const paramVarEnv = NewDeclarativeEnvironment(originalEnv);
  currentContext.VariableEnvironment = paramVarEnv;
  currentContext.LexicalEnvironment = paramVarEnv;
  const result = IteratorBindingInitialization_BindingElement(
    BindingElement, iteratorRecord, environment,
  );
  currentContext.VariableEnvironment = originalEnv;
  currentContext.LexicalEnvironment = originalEnv;
  return result;
}

// #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
//   FunctionRestParameter : BindingRestElement
export function IteratorBindingInitialization_FunctionRestParameter(FunctionRestParameter, iteratorRecord, environment) {
  const BindingRestElement = FunctionRestParameter;
  // if (!ContainsExpression_BindingRestElement(BindingRestElement)) {
  //   return IteratorBindingInitialization_BindingRestElement(
  //     BindingRestElement, iteratorRecord, environment,
  //   );
  // }
  const currentContext = surroundingAgent.runningExecutionContext;
  const originalEnv = currentContext.VariableEnvironment;
  Assert(currentContext.VariableEnvironment === currentContext.LexicalEnvironment);
  Assert(environment === originalEnv);
  const paramVarEnv = NewDeclarativeEnvironment(originalEnv);
  currentContext.VariableEnvironment = paramVarEnv;
  currentContext.LexicalEnvironment = paramVarEnv;
  const result = IteratorBindingInitialization_BindingRestElement(
    BindingRestElement, iteratorRecord, environment,
  );
  currentContext.VariableEnvironment = originalEnv;
  currentContext.LexicalEnvironment = originalEnv;
  return result;
}

// #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
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
export function IteratorBindingInitialization_FormalParameters(
  FormalParameters, iteratorRecord, environment,
) {
  if (FormalParameters.length === 0) {
    return new NormalCompletion(undefined);
  }

  for (const FormalParameter of FormalParameters.slice(0, -1)) {
    Assert(isFormalParameter(FormalParameter));
    Q(IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment));
  }

  const last = FormalParameters[FormalParameters.length - 1];
  if (isFunctionRestParameter(last)) {
    return IteratorBindingInitialization_FunctionRestParameter(last, iteratorRecord, environment);
  }
  Assert(isFormalParameter(last));
  return IteratorBindingInitialization_FormalParameter(last, iteratorRecord, environment);
}
