import { Evaluate_Expression } from '../evaluator.mjs';
import {
  NormalCompletion,
  Q,
  ReturnIfAbrupt,
  X,
} from '../completion.mjs';
import {
  isBindingIdentifier,
  isBindingPattern,
} from '../ast.mjs';
import {
  New as NewValue,
} from '../value.mjs';
import {
  ResolveBinding,
  surroundingAgent,
} from '../engine.mjs';
import {
  GetValue,
  HasOwnProperty,
  InitializeReferencedBinding,
  SetFunctionName,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import { BindingInitialization_BindingPattern } from './all.mjs';
import { outOfRange } from '../helpers.mjs';

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   LexicalBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
function Evaluate_LexicalBinding_BindingIdentifier(LexicalBinding) {
  const { id: BindingIdentifier, init: Initializer } = LexicalBinding;
  const bindingId = NewValue(BindingIdentifier.name);
  const lhs = X(ResolveBinding(bindingId));

  if (Initializer) {
    const rhs = Evaluate_Expression(Initializer);
    const value = Q(GetValue(rhs));
    if (IsAnonymousFunctionDefinition(Initializer)) {
      const hasNameProperty = Q(HasOwnProperty(value, NewValue('name')));
      if (hasNameProperty.isFalse()) {
        SetFunctionName(value, bindingId);
      }
    }
    return InitializeReferencedBinding(lhs, value);
  } else {
    return InitializeReferencedBinding(lhs, NewValue(undefined));
  }
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   LexicalBinding : BindingPattern Initializer
function Evaluate_LexicalBinding_BindingPattern(LexicalBinding) {
  const { id: BindingPattern, init: Initializer } = LexicalBinding;
  const rhs = Q(Evaluate_Expression(Initializer));
  const value = Q(GetValue(rhs));
  const env = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  return BindingInitialization_BindingPattern(BindingPattern, value, env);
}

export function Evaluate_LexicalBinding(LexicalBinding) {
  switch (true) {
    case isBindingIdentifier(LexicalBinding.id):
      return Evaluate_LexicalBinding_BindingIdentifier(LexicalBinding);

    case isBindingPattern(LexicalBinding.id):
      return Evaluate_LexicalBinding_BindingPattern(LexicalBinding);

    default:
      throw outOfRange('Evaluate_LexicalBinding', LexicalBinding.id);
  }
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   BindingList : BindingList `,` LexicalBinding
//
// (implicit)
//   BindingList : LexicalBinding
export function Evaluate_BindingList(BindingList) {
  let last;
  for (const LexicalBinding of BindingList) {
    last = Evaluate_LexicalBinding(LexicalBinding);
    ReturnIfAbrupt(last);
  }
  return last;
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
//   LexicalDeclaration : LetOrConst BindingList `;`
export function Evaluate_LexicalDeclaration({ declarations: BindingList }) {
  let next = Evaluate_BindingList(BindingList);
  ReturnIfAbrupt(next);
  return new NormalCompletion(undefined);
}
