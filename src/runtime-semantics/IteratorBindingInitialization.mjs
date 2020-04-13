import { Value } from '../value.mjs';
import {
  GetValue,
  InitializeReferencedBinding,
  IteratorStep,
  IteratorValue,
  PutValue,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import {
  AbruptCompletion,
  NormalCompletion,
  ReturnIfAbrupt,
  Q,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import {
  StringValue,
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';

// #sec-function-definitions-runtime-semantics-iteratorbindinginitialization
// FormalParameters :
//   [empty]
//   FormalParameterList `,` FunctionRestParameter
export function* IteratorBindingInitialization_FormalParameters(FormalParameters, iteratorRecord, environment) {
  if (FormalParameters.length === 0) {
    // 1. Return NormalCompletion(empty).
    return NormalCompletion(undefined);
  }

  for (const FormalParameter of FormalParameters.slice(0, -1)) {
    Q(yield* IteratorBindingInitialization_FormalParameter(FormalParameter, iteratorRecord, environment));
  }

  const last = FormalParameters[FormalParameters.length - 1];
  if (last.type === 'RestElement') {
    return yield* IteratorBindingInitialization_FunctionRestParameter(last, iteratorRecord, environment);
  }
  return yield* IteratorBindingInitialization_FormalParameter(last, iteratorRecord, environment);
}

// FormalParameter : BindingElement
function IteratorBindingInitialization_FormalParameter(BindingElement, iteratorRecord, environment) {
  return IteratorBindingInitialization_BindingElement(BindingElement, iteratorRecord, environment);
}

// BindingElement : SingleNameBinding
function IteratorBindingInitialization_BindingElement(SingleNameBinding, iteratorRecord, environment) {
  return IteratorBindingInitialization_SingleNameBinding(SingleNameBinding, iteratorRecord, environment);
}

// SingleNameBinding : BindingIdentifier Initializer?
function* IteratorBindingInitialization_SingleNameBinding({ BindingIdentifier, Initializer }, iteratorRecord, environment) {
  // 1. Let bindingId be StringValue of BindingIdentifier.
  const bindingId = StringValue(BindingIdentifier);
  // 2. Let lhs be ? ResolveBinding(bindingId, environment).
  const lhs = Q(ResolveBinding(bindingId, environment));
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
      v = IteratorValue(next);
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
  if (Initializer !== null && v === Value.undefined) {
    if (IsAnonymousFunctionDefinition(Initializer)) {
      v = NamedEvaluation(Initializer, bindingId);
    } else {
      const defaultValue = yield* Evaluate(Initializer);
      v = Q(GetValue(defaultValue));
    }
  }
  // 6. If environment is undefined, return ? PutValue(lhs, v).
  if (environment === Value.undefined) {
    return Q(PutValue(lhs, v));
  }
  // 7. Return InitializeReferencedBinding(lhs, v).
  return InitializeReferencedBinding(lhs, v);
}
