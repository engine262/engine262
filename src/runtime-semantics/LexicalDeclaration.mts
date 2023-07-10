// @ts-nocheck
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
import type { ParseNode } from '../parser/ParseNode.mjs';
import { NamedEvaluation, BindingInitialization } from './all.mjs';

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
function* BindingEvaluation_LexicalBinding_BindingIdentifier({ BindingIdentifier, Initializer, strict }, hint: 'normal' | 'sync-dispose' | 'async-dispose') {
  if (Initializer) {
    // 1. Let bindingId be StringValue of BindingIdentifier.
    const bindingId = StringValue(BindingIdentifier);
    // 2. Let lhs be ResolveBinding(bindingId).
    const lhs = X(ResolveBinding(bindingId, undefined, strict));
    let value;
    // 3. If IsAnonymousFunctionDefinition(Initializer) is true, then
    if (IsAnonymousFunctionDefinition(Initializer)) {
      // a. Let value be NamedEvaluation of Initializer with argument bindingId.
      value = yield* NamedEvaluation(Initializer, bindingId);
    } else { // 4. Else,
      // a. Let rhs be the result of evaluating Initializer.
      const rhs = yield* Evaluate(Initializer);
      // b. Let value be ? GetValue(rhs).
      value = Q(GetValue(rhs));
    }
    // 5. Return InitializeReferencedBinding(lhs, value).
    return InitializeReferencedBinding(lhs, value, hint);
  } else {
    Assert(hint === 'normal');
    // 1. Let lhs be ResolveBinding(StringValue of BindingIdentifier).
    const lhs = ResolveBinding(StringValue(BindingIdentifier), undefined, strict);
    // 2. Return InitializeReferencedBinding(lhs, undefined).
    return InitializeReferencedBinding(lhs, Value.undefined, 'normal');
  }
}

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalBinding : BindingPattern Initializer
function* BindingEvaluation_LexicalBinding_BindingPattern(LexicalBinding, hint: 'normal' | 'sync-dispose' | 'async-dispose') {
  Assert(hint === 'normal');
  const { BindingPattern, Initializer } = LexicalBinding;
  const rhs = yield* Evaluate(Initializer);
  const value = Q(GetValue(rhs));
  const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  return yield* BindingInitialization(BindingPattern, value, env);
}

function* BindingEvaluation_LexicalBinding(LexicalBinding, hint: 'normal' | 'sync-dispose' | 'async-dispose') {
  switch (true) {
    case !!LexicalBinding.BindingIdentifier:
      return yield* BindingEvaluation_LexicalBinding_BindingIdentifier(LexicalBinding, hint);
    case !!LexicalBinding.BindingPattern:
      return yield* BindingEvaluation_LexicalBinding_BindingPattern(LexicalBinding, hint);
    default:
      throw new OutOfRange('Evaluate_LexicalBinding', LexicalBinding);
  }
}

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   BindingList : BindingList `,` LexicalBinding
//
// (implicit)
//   BindingList : LexicalBinding
function* BindingEvaluation_BindingList(BindingList, hint: 'normal' | 'sync-dispose' | 'async-dispose') {
  // 1. Let next be the result of evaluating BindingList.
  // 2. ReturnIfAbrupt(next).
  // 3. Return the result of evaluating LexicalBinding.
  let next;
  for (const LexicalBinding of BindingList) {
    next = yield* BindingEvaluation_LexicalBinding(LexicalBinding, hint);
    ReturnIfAbrupt(next);
  }
  return next;
}

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalDeclaration : LetOrConst BindingList `;`
function* Evaluate_LexicalDeclaration_LetOrConst({ BindingList }) {
  // 1. Perform ? BindingEvaluation of BindingList with argument normal.
  Q(yield* BindingEvaluation_BindingList(BindingList, 'normal'));
  // 2. Return empty.
  return NormalCompletion(undefined);
}

//   UsingDeclaration : `using` BindingList `;`
function* Evaluate_UsingDeclaration({ BindingList }) {
  // 1. Perform ? BindingEvaluation of BindingList with argument sync-dispose.
  Q(yield* BindingEvaluation_BindingList(BindingList, 'sync-dispose'));
  // 2. Return empty.
  return NormalCompletion(undefined);
}

//   AwaitUsingDeclaration : CoverAwaitExpressionAndAwaitUsingDeclarationHead BindingList `;`
function* Evaluate_AwaitUsingDeclaration({ BindingList }) {
  // 1. Perform ? BindingEvaluation of BindingList with argument async-dispose.
  Q(yield* BindingEvaluation_BindingList(BindingList, 'async-dispose'));
  // 2. Return empty.
  return NormalCompletion(undefined);
}

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalDeclaration :
//     LetOrConst BindingList `;`
//     UsingDeclaration
//     AwaitUsingDeclaration
export function* Evaluate_LexicalDeclaration(LexicalDeclaration: ParseNode.LexicalDeclarationLike) {
  switch (LexicalDeclaration.type) {
    case 'LexicalDeclaration':
      return yield* Evaluate_LexicalDeclaration_LetOrConst(LexicalDeclaration);
    case 'UsingDeclaration':
      return yield* Evaluate_UsingDeclaration(LexicalDeclaration);
    case 'AwaitUsingDeclaration':
      return yield* Evaluate_AwaitUsingDeclaration(LexicalDeclaration);
    default:
      throw new OutOfRange('Evaluate_LexicalDeclaration', LexicalDeclaration);
  }
}
