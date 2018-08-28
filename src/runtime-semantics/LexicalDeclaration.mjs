import { Evaluate } from '../evaluator.mjs';
import {
  ReturnIfAbrupt,
  NormalCompletion,
  Q,
} from '../completion.mjs';
import {
  isLexicalBindingWithBindingIdentifierAndInitializer,
} from '../ast.mjs';
import {
  New as NewValue,
} from '../value.mjs';
import {
  ResolveBinding,
} from '../engine.mjs';
import {
  SetFunctionName,
  GetValue,
  HasOwnProperty,
  InitializeReferencedBinding,
  IsAnonymousFunctionDefinition,
} from '../abstract-ops/all.mjs';

export function Evaluate_LexicalDeclaration({ declarations: BindingList }) {
  let next = Evaluate(BindingList);
  ReturnIfAbrupt(next);
  return new NormalCompletion(undefined);
}

function LexicalBinding_BindingIdentifier_Initializer(BindingIdentifier, Initializer) {
  const bindingId = NewValue(BindingIdentifier);
  const lhs = ResolveBinding(bindingId);
  const rhs = Evaluate(Initializer);
  const value = Q(GetValue(rhs));
  if (IsAnonymousFunctionDefinition(Initializer).isTrue()) {
    const hasNameProperty = Q(HasOwnProperty(value, NewValue('name')));
    if (hasNameProperty.isFalse()) {
      SetFunctionName(value, bindingId);
    }
  }
  return InitializeReferencedBinding(lhs, value);
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
// LexicalBinding :
//   BindingList , LexicalBinding
//   BindingIdentifier
//   BindingIdentifier Initializer
export function Evaluate_LexicalBinding(LexicalBinding) {
  switch (true) {
    case isLexicalBindingWithBindingIdentifierAndInitializer(LexicalBinding):
      return LexicalBinding_BindingIdentifier_Initializer(
        LexicalBinding.id.name, LexicalBinding.init,
      );

    default:
      throw new RangeError();
  }
}
