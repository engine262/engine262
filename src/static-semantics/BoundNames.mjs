import {
  isArrayBindingPattern,
  isBindingElement,
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isBindingProperty,
  isBindingRestElement,
  isBindingRestProperty,
  isObjectBindingPattern,
  isSingleNameBinding,
} from '../ast.mjs';

// #sec-identifiers-static-semantics-boundnames
//   BindingIdentifier : Identifier
//   BindingIdentifier : `yield`
//   BindingIdentifier : `await`
export function BoundNamesBindingIdentifier(BindingIdentifier) {
  return [BindingIdentifier.name];
}

// #sec-destructuring-binding-patterns-static-semantics-boundnames
//   SingleNameBinding : BindingIdentifier Initializer
//
// (implicit)
//   SingleNameBinding : BindingIdentifier
export function BoundNamesSingleNameBinding(SingleNameBinding) {
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      return BoundNamesBindingIdentifier(SingleNameBinding);
    case isBindingIdentifierAndInitializer(SingleNameBinding):
      return BoundNamesBindingIdentifier(SingleNameBinding.left);
    default:
      throw new TypeError(`Invalid SingleNameBinding: ${SingleNameBinding.type}`);
  }
}

// #sec-destructuring-binding-patterns-static-semantics-boundnames
//   BindingElement : BindingPattern Initializer
//
// (implicit)
//   BindingElement : SingleNameBinding
//   BindingElement : BindingPattern
export function BoundNamesBindingElement(BindingElement) {
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return BoundNamesSingleNameBinding(BindingElement);
    case isBindingPattern(BindingElement):
      return BoundNamesBindingPattern(BindingElement);
    case isBindingPatternAndInitializer(BindingElement):
      return BoundNamesBindingPattern(BindingElement.left);
    default:
      throw new TypeError(`Invalid BindingElement: ${BindingElement.type}`);
  }
}

// (implicit)
//   BindingRestElement : `...` BindingIdentifier
//   BindingRestElement : `...` BindingPattern
export function BoundNamesBindingRestElement(BindingRestElement) {
  switch (true) {
    case isBindingIdentifier(BindingRestElement.argument):
      return BoundNamesBindingIdentifier(BindingRestElement.argument);
    case isBindingPattern(BindingRestElement.argument):
      return BoundNamesBindingPattern(BindingRestElement.argument);
    default:
      throw new TypeError(`Invalid binding of BindingRestElement: ${BindingRestElement.argument.type}`);
  }
}

// #sec-destructuring-binding-patterns-static-semantics-boundnames
//   ArrayBindingPattern : `[` Elision `]`
//   ArrayBindingPattern : `[` Elision BindingRestElement `]`
//   ArrayBindingPattern : `[` BindingElementList `,` Elision `]`
//   ArrayBindingPattern : `[` BindingElementList `,` Elision BindingRestElement `]`
//   BindingElementList : BindingElementList `,` BindingElisionElement
//   BindingElisionElement : Elision BindingElement
export function BoundNamesArrayBindingPattern(ArrayBindingPattern) {
  const names = [];
  for (const BindingElisionElementOrBindingRestElement of ArrayBindingPattern.elements) {
    switch (true) {
      case isBindingElement(BindingElisionElementOrBindingRestElement): {
        const BindingElement = BindingElisionElementOrBindingRestElement;
        names.push(...BoundNamesBindingElement(BindingElement));
        break;
      }
      case isBindingRestElement(BindingElisionElementOrBindingRestElement): {
        const BindingRestElement = BindingElisionElementOrBindingRestElement;
        names.push(...BoundNamesBindingRestElement(BindingRestElement));
        break;
      }
      default:
        throw new TypeError(`Invalid element of ArrayBindingPattern: ${BindingElisionElementOrBindingRestElement.type}`);
    }
  }
  return names;
}

// #sec-destructuring-binding-patterns-static-semantics-boundnames
//   BindingProperty : PropertyName `:` BindingElement
//
// (implicit)
//   BindingProperty : SingleNameBinding
export function BoundNamesBindingProperty(BindingProperty) {
  switch (true) {
    case isSingleNameBinding(BindingProperty.value):
      return BoundNamesSingleNameBinding(BindingProperty.value);
    case isBindingElement(BindingProperty.value):
      return BoundNamesBindingElement(BindingProperty.value);
    default:
      throw new TypeError(`Invalid BindingProperty: ${BindingProperty.value.type}`);
  }
}

// (implicit)
//   BindingRestProperty : `...` BindingIdentifier
export function BoundNamesBindingRestProperty(BindingRestProperty) {
  if (!isBindingIdentifier(BindingRestProperty.argument)) {
    throw new TypeError(`Invalid binding of BindingRestProperty: ${BindingRestProperty.argument.type}`);
  }
  return BoundNamesBindingIdentifier(BindingRestProperty.argument);
}

// #sec-destructuring-binding-patterns-static-semantics-boundnames
//   ObjectBindingPattern : `{` `}`
//   ObjectBindingPattern : `{` BindingRestProperty `}`
//   BindingPropertyList : BindingPropertyList `,` BindingProperty
//
// (implicit)
//   ObjectBindingPattern : `{` BindingPropertyList `}`
//   ObjectBindingPattern : `{` BindingPropertyList `,` `}`
//   ObjectBindingPattern : `{` BindingPropertyList `,` BindingRestProperty `}`
function BoundNamesObjectBindingPattern(ObjectBindingPattern) {
  const names = [];
  for (const BindingPropertyOrBindingRestProperty of ObjectBindingPattern.properties) {
    switch (true) {
      case isBindingProperty(BindingPropertyOrBindingRestProperty): {
        const BindingProperty = BindingPropertyOrBindingRestProperty;
        names.push(...BoundNamesBindingProperty(BindingProperty));
        break;
      }
      case isBindingRestProperty(BindingPropertyOrBindingRestProperty): {
        const BindingRestProperty = BindingPropertyOrBindingRestProperty;
        names.push(...BoundNamesBindingRestProperty(BindingRestProperty));
        break;
      }
      default:
        throw new TypeError(`Invalid element of ObjectBindingPattern: ${BindingPropertyOrBindingRestProperty.type}`);
    }
  }
  return names;
}

// (implicit)
//   BindingPattern : ObjectBindingPattern
//   BindingPattern : ArrayBindingPattern
function BoundNamesBindingPattern(BindingPattern) {
  switch (true) {
    case isObjectBindingPattern(BindingPattern):
      return BoundNamesObjectBindingPattern(BindingPattern);
    case isArrayBindingPattern(BindingPattern):
      return BoundNamesArrayBindingPattern(BindingPattern);
    default:
      throw new TypeError(`Invalid BindingPattern: ${BindingPattern.type}`);
  }
}

// #sec-let-and-const-declarations-static-semantics-boundnames
//   LexicalDeclaration : LetOrConst BindingList `;`
//   BindingList : BindingList `,` LexicalBinding
//   LexicalBinding : BindingIdentifier Initializer
//   LexicalBinding : BindingPattern Initializer
//
// (implicit)
//   BindingList : LexicalBinding
export function BoundNamesLexicalDeclaration(LexicalDeclaration) {
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
        throw new TypeError(`Invalid LexicalBinding: ${declarator.id.type}`);
    }
  }
  return names;
}

// (implicit)
//   VariableStatement : `var` VariableDeclarationList `;`
export function BoundNamesVariableStatement(VariableStatement) {
  return BoundNamesVariableDeclarationList(VariableStatement.declarations);
}

// #sec-variable-statement-static-semantics-boundnames
//   VariableDeclarationList : VariableDeclarationList `,` VariableDeclaration
//
// (implicit)
//   VariableDeclarationList : VariableDeclaration
export function BoundNamesVariableDeclarationList(VariableDeclarationList) {
  const names = [];
  for (const VariableDeclaration of VariableDeclarationList) {
    names.push(...BoundNamesVariableDeclaration(VariableDeclaration));
  }
  return names;
}

// #sec-variable-statement-static-semantics-boundnames
//   VariableDeclaration : BindingIdentifier Initializer
//   VariableDeclaration : BindingPattern Initializer
export function BoundNamesVariableDeclaration(VariableDeclaration) {
  switch (true) {
    case isBindingIdentifier(VariableDeclaration.id):
      return BoundNamesBindingIdentifier(VariableDeclaration.id);
    case isBindingPattern(VariableDeclaration.id):
      return BoundNamesBindingPattern(VariableDeclaration.id);
    default:
      throw new Error(`Invalid VariableDeclaration: ${VariableDeclaration.id.type}`);
  }
}

// #sec-function-definitions-static-semantics-boundnames
//   FunctionDeclaration :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//   FunctionDeclaration :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//
// #sec-generator-function-definitions-static-semantics-boundnames
//   GeneratorDeclaration :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//   GeneratorDeclaration :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//
// #sec-async-generator-function-definitions-static-semantics-boundnames
//   AsyncGeneratorDeclaration :
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//   AsyncGeneratorDeclaration :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//
// #sec-async-function-definitions-static-semantics-BoundNames
//   AsyncFunctionDeclaration :
//     `async` [no LineTerminator here] `function` BindingIdentifier `(` FormalParameters `)`
//     `{` AsyncFunctionBody `}`
//   AsyncFunctionDeclaration : `async` [no LineTerminator here] `function` `(` FormalParameters `)`
//     `{` AsyncFunctionBody `}`
//
// (implicit)
//   HoistableDeclaration : FunctionDeclaration
//   HoistableDeclaration : GeneratorDeclaration
//   HoistableDeclaration : AsyncFunctionDeclaration
//   HoistableDeclaration : AsyncGeneratorDeclaration
export function BoundNamesHoistableDeclaration(HoistableDeclaration) {
  if (HoistableDeclaration.id === null) {
    return ['*default*'];
  }
  return BoundNamesBindingIdentifier(HoistableDeclaration.id);
}

export const BoundNamesFunctionDeclaration = BoundNamesHoistableDeclaration;
export const BoundNamesGeneratorDeclaration = BoundNamesHoistableDeclaration;
export const BoundNamesAsyncFunctionDeclaration = BoundNamesHoistableDeclaration;
export const BoundNamesAsyncGeneratorDeclaration = BoundNamesHoistableDeclaration;
