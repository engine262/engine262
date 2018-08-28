// LexicalDeclaration : LetOrConst BindingList ;
export function LexicalDeclaration_LetOrConst_BindingList(LetOrConst, BindingList) {
  let next = Evaluate(BindingList);
  ReturnIfAbrupt(next);
  return new NormalCompletion(undefined);
}

// BindingList : BindingList , LexicalBinding
export function BindingList_BindingList_LexicalBinding(BindingList, LexicalBinding) {
  let next = Evaluate(BindingList);
  ReturnIfAbrupt(next);
  return Evaluate(LexicalBinding);
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
// LexicalBinding : BindingIdentifier
export function LexicalBinding_BindingIdentifier(BindingIdentifier) {
  const lhs = ResolveBinding(NewValue(BindingIdentifier.name));
  return InitializeReferencedBinding(lhs, NewValue(undefined));
}

// #sec-let-and-const-declarations-runtime-semantics-evaluation
// LexicalBinding : BindingIdentifier Initializer
export function LexicalBinding_BindingIdentifier_Initializer(BindingIdentifier, Initializer) {
  const bindingId = NewValue(BindingIdentifier.name);
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
