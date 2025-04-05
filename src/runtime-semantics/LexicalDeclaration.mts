import { Evaluate, type PlainEvaluator } from '../evaluator.mts';
import {
  ReturnIfAbrupt,
  Q, X,
} from '../completion.mts';
import { Value } from '../value.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  GetValue,
  InitializeReferencedBinding,
  ResolveBinding,
} from '../abstract-ops/all.mts';
import { IsAnonymousFunctionDefinition, StringValue, type FunctionDeclaration } from '../static-semantics/all.mts';
import { OutOfRange } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { NamedEvaluation, BindingInitialization } from './all.mts';

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
function* Evaluate_LexicalBinding_BindingIdentifier({ BindingIdentifier, Initializer, strict }: ParseNode.LexicalBinding): PlainEvaluator {
  if (Initializer) {
    // 1. Let bindingId be StringValue of BindingIdentifier.
    const bindingId = StringValue(BindingIdentifier!);
    // 2. Let lhs be ResolveBinding(bindingId).
    const lhs = X(ResolveBinding(bindingId, undefined, strict));
    let value: Value;
    // 3. If IsAnonymousFunctionDefinition(Initializer) is true, then
    if (IsAnonymousFunctionDefinition(Initializer)) {
      // a. Let value be NamedEvaluation of Initializer with argument bindingId.
      value = Q(yield* NamedEvaluation(Initializer as FunctionDeclaration, bindingId));
    } else { // 4. Else,
      // a. Let rhs be the result of evaluating Initializer.
      const rhs = Q(yield* Evaluate(Initializer));
      // b. Let value be ? GetValue(rhs).
      value = Q(yield* GetValue(rhs));
    }
    // 5. Return InitializeReferencedBinding(lhs, value).
    return yield* InitializeReferencedBinding(lhs, value);
  } else {
    // 1. Let lhs be ResolveBinding(StringValue of BindingIdentifier).
    const lhs = yield* ResolveBinding(StringValue(BindingIdentifier!), undefined, strict);
    // 2. Return InitializeReferencedBinding(lhs, undefined).
    return yield* InitializeReferencedBinding(lhs, Value.undefined);
  }
}

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalBinding : BindingPattern Initializer
function* Evaluate_LexicalBinding_BindingPattern(LexicalBinding: ParseNode.LexicalBinding) {
  const { BindingPattern, Initializer } = LexicalBinding;
  const rhs = Q(yield* Evaluate(Initializer!));
  const value = Q(yield* GetValue(rhs));
  const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  return yield* BindingInitialization(BindingPattern!, value, env);
}

export function* Evaluate_LexicalBinding(LexicalBinding: ParseNode.LexicalBinding) {
  switch (true) {
    case !!LexicalBinding.BindingIdentifier:
      return yield* Evaluate_LexicalBinding_BindingIdentifier(LexicalBinding);
    case !!LexicalBinding.BindingPattern:
      return yield* Evaluate_LexicalBinding_BindingPattern(LexicalBinding);
    default:
      throw new OutOfRange('Evaluate_LexicalBinding', LexicalBinding);
  }
}

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   BindingList : BindingList `,` LexicalBinding
//
// (implicit)
//   BindingList : LexicalBinding
export function* Evaluate_BindingList(BindingList: ParseNode.BindingList) {
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

/** https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation */
//   LexicalDeclaration : LetOrConst BindingList `;`
export function* Evaluate_LexicalDeclaration({ BindingList }: ParseNode.LexicalDeclaration): PlainEvaluator {
  // 1. Let next be the result of evaluating BindingList.
  // 2. ReturnIfAbrupt(next).
  ReturnIfAbrupt(yield* Evaluate_BindingList(BindingList));
  // 3. Return NormalCompletion(empty).
  return undefined;
}
