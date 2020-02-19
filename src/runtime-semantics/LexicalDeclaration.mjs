import { Evaluate } from '../evaluator.mjs';
import {
  NormalCompletion,
  ReturnIfAbrupt,
  Q, X,
} from '../completion.mjs';
import { Value } from '../value.mjs';
import { surroundingAgent } from '../engine.mjs';
import {
  GetValue,
  InitializeReferencedBinding,
  ResolveBinding,
} from '../abstract-ops/all.mjs';
import { IsAnonymousFunctionDefinition, StringValue } from '../static-semantics/all.mjs';
import { OutOfRange } from '../helpers.mjs';
import { NamedEvaluation } from './all.mjs';

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   LexicalBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
function* Evaluate_LexicalBinding_BindingIdentifier({ BindingIdentifier, Initializer, strict }) {
  // 1. Let bindingId be StringValue of BindingIdentifier.
  const bindingId = StringValue(BindingIdentifier);
  if (Initializer) {
    // 2. Let lhs be ResolveBinding(bindingId).
    const lhs = X(ResolveBinding(bindingId, undefined, strict));
    let value;
    // 3. If IsAnonymousFunctionDefinition(Initializer) is true, then
    if (IsAnonymousFunctionDefinition(Initializer)) {
      // a. Let value be NamedEvaluation of Initializer with argument bindingId.
      value = NamedEvaluation(Initializer, bindingId);
    } else { // 4. Else,
      // a. Let rhs be the result of evaluating Initializer.
      const rhs = yield* Evaluate(Initializer);
      // b. Let value be ? GetValue(rhs).
      value = Q(GetValue(rhs));
    }
    // 5. Return InitializeReferencedBinding(lhs, value).
    return InitializeReferencedBinding(lhs, value);
  } else {
    // 2. Return InitializeReferencedBinding(StringValue of BindingIdentifier, undefined).
    return InitializeReferencedBinding(StringValue(BindingIdentifier), Value.undefined);
  }
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   LexicalBinding : BindingPattern Initializer
function* Evaluate_LexicalBinding_BindingPattern(LexicalBinding) {
  const { id: BindingPattern, init: Initializer } = LexicalBinding;
  const rhs = yield* Evaluate(Initializer);
  const value = Q(GetValue(rhs));
  const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  return yield* BindingInitialization_BindingPattern(BindingPattern, value, env);
}

export function* Evaluate_LexicalBinding(LexicalBinding) {
  switch (true) {
    case LexicalBinding.BindingIdentifier !== null:
      return yield* Evaluate_LexicalBinding_BindingIdentifier(LexicalBinding);
    case LexicalBinding.BindingPattern !== null:
      return yield* Evaluate_LexicalBinding_BindingPattern(LexicalBinding);
    default:
      throw new OutOfRange('Evaluate_LexicalBinding', LexicalBinding);
  }
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   BindingList : BindingList `,` LexicalBinding
//
// (implicit)
//   BindingList : LexicalBinding
export function* Evaluate_BindingList(BindingList) {
  // 1. Let next be the result of evaluating BindingList.
  // 2. ReturnIfAbrupt(next).
  // 3. Return the result of evaluating LexicalBinding.
  let next;
  for (const LexicalBinding of BindingList) {
    next = yield* Evaluate_LexicalBinding(LexicalBinding);
    ReturnIfAbrupt(next);
  }
  return next;
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   LexicalDeclaration : LetOrConst BindingList `;`
export function* Evaluate_LexicalDeclaration({ BindingList }) {
  // 1. Let next be the result of evaluating BindingList.
  const next = yield* Evaluate_BindingList(BindingList);
  // 2. ReturnIfAbrupt(next).
  ReturnIfAbrupt(next);
  // 3. Return NormalCompletion(empty).
  return new NormalCompletion(undefined);
}
