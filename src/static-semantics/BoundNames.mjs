import {
  isBindingIdentifier,
  isBindingPattern,
} from '../ast.mjs';

// #sec-identifiers-static-semantics-boundnames
//   BindingIdentifier : Identifier
//   BindingIdentifier : `yield`
//   BindingIdentifier : `await`
function BoundNamesBindingIdentifier(BindingIdentifier) {
  return [BindingIdentifier.name];
}

// #sec-destructuring-binding-patterns-static-semantics-boundnames
//   ObjectBindingPattern : `{` `}`
//   ArrayBindingPattern : `[` Elision `]`
//   ArrayBindingPattern : `[` Elision BindingRestElement `]`
//   ArrayBindingPattern : `[` BindingElementList `,` Elision `]`
function BoundNamesBindingPattern(BindingPattern) {
  return [BindingIdentifier.name];
}

// #sec-let-and-const-declarations-static-semantics-boundnames
//   LexicalDeclaration : LetOrConst BindingList `;`
//   BindingList : BindingList `,` LexicalBinding
//   LexicalBinding : BindingIdentifier Initializer
//   LexicalBinding : BindingPattern Initializer
function BoundNamesLexicalDeclaration(LexicalDeclaration) {
  const names = [];
  for (const declarator of LexicalDeclaration.declarations) {
    switch (true) {
      case isBindingIdentifier(declarator.id):
        names.push(...BoundNamesBindingIdentifier(declarator.id));
        break;
      case isBindingPattern(declarator.id):
        names.push(...BoundNamesBindingPattern(declarator.id));
        break;
      default:
        throw new TypeError(`Invalid LexicalBinding: ${declarator.id}`);
    }
  }
}
