import { Evaluate_Expression } from '../evaluator.mjs';
import {
  ReturnIfAbrupt,
  NormalCompletion,
  Q,
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
  surroundingAgent,
  ResolveBinding,
} from '../engine.mjs';
import {
  SetFunctionName,
  GetValue,
  HasOwnProperty,
  InitializeReferencedBinding,
} from '../abstract-ops/all.mjs';
import {
  IsAnonymousFunctionDefinition,
} from '../static-semantics/all.mjs';
import { BindingInitialization } from './all.mjs';

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
  return BindingInitialization(BindingPattern, value, env);
}

export function Evaluate_LexicalBinding(LexicalBinding) {
  switch (true) {
    case isBindingIdentifier(LexicalBinding.id):
      return Evaluate_LexicalBinding_BindingIdentifier(LexicalBinding);

    case isBindingPattern(LexicalBinding.id):
      return Evaluate_LexicalBinding_BindingPattern(LexicalBinding);

    default:
      throw new RangeError(`LexicalBinding's LHS is not valid: ${LexicalBinding.id.type}`);
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
