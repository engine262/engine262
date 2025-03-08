import { Value } from '../value.mts';
import {
  Assert,
  GetValue,
  InitializeReferencedBinding,
  IteratorStep,
  IteratorValue,
  PutValue,
  ResolveBinding,
  ArrayCreate,
  CreateDataPropertyOrThrow,
  ToString,
  F,
  type IteratorRecord,
} from '../abstract-ops/all.mts';
import {
  AbruptCompletion,
  NormalCompletion,
  ReturnIfAbrupt,
  Q, X,
} from '../completion.mts';
import { Evaluate, type Evaluator } from '../evaluator.mts';
import {
  StringValue,
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { __ts_cast__ } from '../helpers.mts';
import { NamedEvaluation, BindingInitialization } from './all.mts';
import {
  UndefinedValue, type BooleanValue, type EnvironmentRecord, type FunctionDeclaration, type ObjectValue,
  type PlainCompletion,
} from '#self';

/** https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-iteratorbindinginitialization */
// FormalParameters :
//   [empty]
//   FormalParameterList `,` FunctionRestParameter
export function* IteratorBindingInitialization_FormalParameters(FormalParameters: ParseNode.FormalParameters, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue) {
  if (FormalParameters.length === 0) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  for (const FormalParameter of FormalParameters.slice(0, -1)) {
    Q(yield* IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment));
  }

  const last = FormalParameters[FormalParameters.length - 1];
  if (last.type === 'BindingRestElement') {
    return yield* IteratorBindingInitialization_FunctionRestParameter(last, iteratorRecord, environment);
  }
  return yield* IteratorBindingInitialization_FormalParameter(last, iteratorRecord, environment);
}

// FormalParameter : BindingElement
function IteratorBindingInitialization_FormalParameter(BindingElement: ParseNode.FormalParametersElement, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue) {
  // TODO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return IteratorBindingInitialization_BindingElement(BindingElement as any, iteratorRecord, environment);
}

// FunctionRestParameter : BindingRestElement
function IteratorBindingInitialization_FunctionRestParameter(FunctionRestParameter: ParseNode.FunctionRestParameter, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue) {
  return IteratorBindingInitialization_BindingRestElement(FunctionRestParameter, iteratorRecord, environment);
}

// BindingElement :
//   SingleNameBinding
//   BindingPattern
function IteratorBindingInitialization_BindingElement(BindingElement: ParseNode.BindingElement, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue) {
  if ('BindingPattern' in BindingElement) {
    return IteratorBindingInitialization_BindingPattern(BindingElement, iteratorRecord, environment);
  }
  return IteratorBindingInitialization_SingleNameBinding(BindingElement, iteratorRecord, environment);
}

// SingleNameBinding : BindingIdentifier Initializer?
function* IteratorBindingInitialization_SingleNameBinding({ BindingIdentifier, Initializer }: ParseNode.SingleNameBinding, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue): Evaluator<PlainCompletion<void>> {
  // 1. Let bindingId be StringValue of BindingIdentifier.
  const bindingId = StringValue(BindingIdentifier);
  // 2. Let lhs be ? ResolveBinding(bindingId, environment).
  const lhs = Q(ResolveBinding(bindingId, environment, BindingIdentifier.strict));
  let v;
  // 3. If iteratorRecord.[[Done]] is false, then
  if (iteratorRecord.Done === Value.false) {
    // a. Let next be IteratorStep(iteratorRecord).
    const next = IteratorStep(iteratorRecord);
    // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    // c. ReturnIfAbrupt(next).
    ReturnIfAbrupt(next);
    // d. If next is false, set iteratorRecord.[[Done]] to true.
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    } else { // e. Else,
      // i. Let v be IteratorValue(next).
      v = IteratorValue(next as ObjectValue);
      // ii. If v is an abrupt completion, set iteratorRecord.[[Done]] to true.
      if (v instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      // iii. ReturnIfAbrupt(v).
      ReturnIfAbrupt(v);
    }
  }
  // 4. If iteratorRecord.[[Done]] is true, let v be undefined.
  if (iteratorRecord.Done === Value.true) {
    v = Value.undefined;
  }
  // 5. If Initializer is present and v is undefined, then
  if (Initializer && v === Value.undefined) {
    if (IsAnonymousFunctionDefinition(Initializer)) {
      v = yield* NamedEvaluation(Initializer as FunctionDeclaration, bindingId);
    } else {
      const defaultValue = yield* Evaluate(Initializer);
      v = Q(GetValue(defaultValue));
    }
  }
  // 6. If environment is undefined, return ? PutValue(lhs, v).
  if (environment === Value.undefined) {
    return Q(PutValue(lhs, v!));
  }
  // 7. Return InitializeReferencedBinding(lhs, v).
  return InitializeReferencedBinding(lhs, X(v!));
}

// BindingRestElement :
//   `...` BindingIdentifier
//   `...` BindingPattern
function* IteratorBindingInitialization_BindingRestElement({ BindingIdentifier, BindingPattern }: ParseNode.BindingRestElement, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue) {
  if (BindingIdentifier) {
    // 1. Let lhs be ? ResolveBinding(StringValue of BindingIdentifier, environment).
    const lhs = Q(ResolveBinding(StringValue(BindingIdentifier), environment, BindingIdentifier.strict));
    // 2. Let A be ! ArrayCreate(0).
    const A = X(ArrayCreate(0));
    // 3. Let n be 0.
    let n = 0;
    // 4. Repeat,
    while (true) {
      let next;
      // a. If iteratorRecord.[[Done]] is false, then
      if (iteratorRecord.Done === Value.false) {
        // i. Let next be IteratorStep(iteratorRecord).
        next = IteratorStep(iteratorRecord);
        // ii. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
        if (next instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        }
        // iii. ReturnIfAbrupt(next).
        ReturnIfAbrupt(next);
        // iv. If next is false, set iteratorRecord.[[Done]] to true.
        if (next === Value.false) {
          iteratorRecord.Done = Value.true;
        }
      }
      // b. If iteratorRecord.[[Done]] is true, then
      if (iteratorRecord.Done === Value.true) {
        // i. If environment is undefined, return ? PutValue(lhs, A).
        if (environment === Value.undefined) {
          return Q(PutValue(lhs, A));
        }
        // ii. Return InitializeReferencedBinding(lhs, A).
        return InitializeReferencedBinding(lhs, A);
      }
      // c. Let nextValue be IteratorValue(next).
      const nextValue = IteratorValue(next as ObjectValue);
      // d. If nextValue is an abrupt completion, set iteratorRecord.[[Done]] to true.
      if (nextValue instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      // e. ReturnIfAbrupt(nextValue).
      ReturnIfAbrupt(nextValue);
      // f. Perform ! CreateDataPropertyOrThrow(A, ! ToString(𝔽(n)), nextValue).
      X(CreateDataPropertyOrThrow(A, X(ToString(F(n))), Q(nextValue)));
      // g. Set n to n + 1.
      n += 1;
    }
  } else {
    // 1. Let A be ! ArrayCreate(0).
    const A = X(ArrayCreate(0));
    // 2. Let n be 0.
    let n = 0;
    // 3. Repeat,
    while (true) {
      let next;
      // a. If iteratorRecord.[[Done]] is false, then
      if (iteratorRecord.Done === Value.false) {
        // i. Let next be IteratorStep(iteratorRecord).
        next = IteratorStep(iteratorRecord);
        // ii. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
        if (next instanceof AbruptCompletion) {
          iteratorRecord.Done = Value.true;
        }
        // iii. ReturnIfAbrupt(next).
        ReturnIfAbrupt(next);
        // iv. If next is false, set iteratorRecord.[[Done]] to true.
        if (next === Value.false) {
          iteratorRecord.Done = Value.true;
        }
      }
      // b. If iteratorRecord.[[Done]] is true, then
      if (iteratorRecord.Done === Value.true) {
        // i. Return the result of performing BindingInitialization of BindingPattern with A and environment as the arguments.
        return yield* BindingInitialization(BindingPattern!, A, environment);
      }
      // c. Let nextValue be IteratorValue(next).
      const nextValue = IteratorValue(next as ObjectValue);
      // d. If nextValue is an abrupt completion, set iteratorRecord.[[Done]] to true.
      if (nextValue instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      // e. ReturnIfAbrupt(nextValue).
      ReturnIfAbrupt(nextValue);
      // f. Perform ! CreateDataPropertyOrThrow(A, ! ToString(𝔽(n)), nextValue).
      X(CreateDataPropertyOrThrow(A, X(ToString(F(n))), Q(nextValue)));
      // g. Set n to n + 1.
      n += 1;
    }
  }
}

function* IteratorBindingInitialization_BindingPattern({ BindingPattern, Initializer }: ParseNode.BindingElement, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue) {
  let v;
  // 1. If iteratorRecord.[[Done]] is false, then
  if (iteratorRecord.Done === Value.false) {
    // a. Let next be IteratorStep(iteratorRecord).
    const next = IteratorStep(iteratorRecord);
    // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    // c. ReturnIfAbrupt(next).
    ReturnIfAbrupt(next);
    __ts_cast__<ObjectValue | BooleanValue>(next);
    // d. If next is false, set iteratorRecord.[[Done]] to true.
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    } else { // e. Else,
      // i. Let v be IteratorValue(next).
      v = IteratorValue(next as ObjectValue);
      // ii. If v is an abrupt completion, set iteratorRecord.[[Done]] to true.
      if (v instanceof AbruptCompletion) {
        iteratorRecord.Done = Value.true;
      }
      // iii. ReturnIfAbrupt(v).
      ReturnIfAbrupt(v);
    }
  }
  // 2. If iteratorRecord.[[Done]] is true, let v be undefined.
  if (iteratorRecord.Done === Value.true) {
    v = Value.undefined;
  }
  // 3. If Initializer is present and v is undefined, then
  if (Initializer && v instanceof UndefinedValue) {
    // a. Let defaultValue be the result of evaluating Initializer.
    const defaultValue = yield* Evaluate(Initializer);
    // b. Set v to ? GetValue(defaultValue).
    v = Q(GetValue(defaultValue));
  }
  // 4. Return the result of performing BindingInitialization of BindingPattern with v and environment as the arguments.
  return yield* BindingInitialization(BindingPattern, X(v!), environment);
}

function IteratorDestructuringAssignmentEvaluation(node: ParseNode.Elision, iteratorRecord: IteratorRecord): PlainCompletion<void> {
  Assert(node.type === 'Elision');
  // 1. If iteratorRecord.[[Done]] is false, then
  if (iteratorRecord.Done === Value.false) {
    // a. Let next be IteratorStep(iteratorRecord).
    let next = IteratorStep(iteratorRecord);
    // b. If next is an abrupt completion, set iteratorRecord.[[Done]] to true.
    if (next instanceof AbruptCompletion) {
      iteratorRecord.Done = Value.true;
    }
    // c. ReturnIfAbrupt(next).
    next = ReturnIfAbrupt(next);
    // d. If next is false, set iteratorRecord.[[Done]] to true.
    if (next === Value.false) {
      iteratorRecord.Done = Value.true;
    }
  }
  // 2. Return NormalCompletion(empty).
  return NormalCompletion(undefined);
}

export function* IteratorBindingInitialization_ArrayBindingPattern({ BindingElementList, BindingRestElement }: ParseNode.ArrayBindingPattern, iteratorRecord: IteratorRecord, environment: EnvironmentRecord | UndefinedValue): Evaluator<PlainCompletion<void>> {
  for (const BindingElement of BindingElementList) {
    if (BindingElement.type === 'Elision') {
      Q(IteratorDestructuringAssignmentEvaluation(BindingElement, iteratorRecord));
    } else {
      // TODO
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Q(yield* IteratorBindingInitialization_BindingElement(BindingElement as any, iteratorRecord, environment));
    }
  }

  if (BindingRestElement) {
    return Q(yield* IteratorBindingInitialization_BindingRestElement(BindingRestElement, iteratorRecord, environment));
  }
  return NormalCompletion(undefined);
}
