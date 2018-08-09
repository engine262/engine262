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
  isClassDeclaration,
  isHoistableDeclaration,
  isLexicalDeclaration,
  isObjectBindingPattern,
  isSingleNameBinding,
} from '../ast.mjs';

// 12.1.2 #sec-identifiers-static-semantics-boundnames
//   BindingIdentifier : Identifier
//   BindingIdentifier : `yield`
//   BindingIdentifier : `await`
export function BoundNames_BindingIdentifier(BindingIdentifier) {
  return [BindingIdentifier.name];
}

// 13.3.1.2 #sec-let-and-const-declarations-static-semantics-boundnames
//   LexicalDeclaration : LetOrConst BindingList `;`
//   BindingList : BindingList `,` LexicalBinding
//   LexicalBinding : BindingIdentifier Initializer
//   LexicalBinding : BindingPattern Initializer
//
// (implicit)
//   BindingList : LexicalBinding
export function BoundNames_LexicalDeclaration(LexicalDeclaration) {
  const names = [];
  for (const declarator of LexicalDeclaration.declarations) {
    switch (true) {
      case isBindingIdentifier(declarator.id):
        names.push(...BoundNames_BindingIdentifier(declarator.id));
        break;
      case isBindingPattern(declarator.id):
        names.push(...BoundNames_BindingPattern(declarator.id));
        break;
      default:
        throw new TypeError(`Invalid LexicalBinding: ${declarator.id.type}`);
    }
  }
  return names;
}

// 13.3.2.1 #sec-variable-statement-static-semantics-boundnames
//   VariableDeclarationList : VariableDeclarationList `,` VariableDeclaration
//
// (implicit)
//   VariableDeclarationList : VariableDeclaration
export function BoundNames_VariableDeclarationList(VariableDeclarationList) {
  const names = [];
  for (const VariableDeclaration of VariableDeclarationList) {
    names.push(...BoundNames_VariableDeclaration(VariableDeclaration));
  }
  return names;
}

// 13.3.2.1 #sec-variable-statement-static-semantics-boundnames
//   VariableDeclaration : BindingIdentifier Initializer
//   VariableDeclaration : BindingPattern Initializer
export function BoundNames_VariableDeclaration(VariableDeclaration) {
  switch (true) {
    case isBindingIdentifier(VariableDeclaration.id):
      return BoundNames_BindingIdentifier(VariableDeclaration.id);
    case isBindingPattern(VariableDeclaration.id):
      return BoundNames_BindingPattern(VariableDeclaration.id);
    default:
      throw new Error(`Invalid VariableDeclaration: ${VariableDeclaration.id.type}`);
  }
}

// (implicit)
//   VariableStatement : `var` VariableDeclarationList `;`
export function BoundNames_VariableStatement(VariableStatement) {
  return BoundNames_VariableDeclarationList(VariableStatement.declarations);
}

// 13.3.3.1 #sec-destructuring-binding-patterns-static-semantics-boundnames
//   SingleNameBinding : BindingIdentifier Initializer
//
// (implicit)
//   SingleNameBinding : BindingIdentifier
export function BoundNames_SingleNameBinding(SingleNameBinding) {
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      return BoundNames_BindingIdentifier(SingleNameBinding);
    case isBindingIdentifierAndInitializer(SingleNameBinding):
      return BoundNames_BindingIdentifier(SingleNameBinding.left);
    default:
      throw new TypeError(`Invalid SingleNameBinding: ${SingleNameBinding.type}`);
  }
}

// 13.3.3.1 #sec-destructuring-binding-patterns-static-semantics-boundnames
//   BindingElement : BindingPattern Initializer
//
// (implicit)
//   BindingElement : SingleNameBinding
//   BindingElement : BindingPattern
export function BoundNames_BindingElement(BindingElement) {
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return BoundNames_SingleNameBinding(BindingElement);
    case isBindingPattern(BindingElement):
      return BoundNames_BindingPattern(BindingElement);
    case isBindingPatternAndInitializer(BindingElement):
      return BoundNames_BindingPattern(BindingElement.left);
    default:
      throw new TypeError(`Invalid BindingElement: ${BindingElement.type}`);
  }
}

// (implicit)
//   BindingRestElement : `...` BindingIdentifier
//   BindingRestElement : `...` BindingPattern
export function BoundNames_BindingRestElement(BindingRestElement) {
  switch (true) {
    case isBindingIdentifier(BindingRestElement.argument):
      return BoundNames_BindingIdentifier(BindingRestElement.argument);
    case isBindingPattern(BindingRestElement.argument):
      return BoundNames_BindingPattern(BindingRestElement.argument);
    default:
      throw new TypeError(`Invalid binding of BindingRestElement: ${BindingRestElement.argument.type}`);
  }
}

// 13.3.3.1 #sec-destructuring-binding-patterns-static-semantics-boundnames
//   ArrayBindingPattern : `[` Elision `]`
//   ArrayBindingPattern : `[` Elision BindingRestElement `]`
//   ArrayBindingPattern : `[` BindingElementList `,` Elision `]`
//   ArrayBindingPattern : `[` BindingElementList `,` Elision BindingRestElement `]`
//   BindingElementList : BindingElementList `,` BindingElisionElement
//   BindingElisionElement : Elision BindingElement
export function BoundNames_ArrayBindingPattern(ArrayBindingPattern) {
  const names = [];
  for (const BindingElisionElementOrBindingRestElement of ArrayBindingPattern.elements) {
    switch (true) {
      case isBindingElement(BindingElisionElementOrBindingRestElement): {
        const BindingElement = BindingElisionElementOrBindingRestElement;
        names.push(...BoundNames_BindingElement(BindingElement));
        break;
      }
      case isBindingRestElement(BindingElisionElementOrBindingRestElement): {
        const BindingRestElement = BindingElisionElementOrBindingRestElement;
        names.push(...BoundNames_BindingRestElement(BindingRestElement));
        break;
      }
      default:
        throw new TypeError(`Invalid element of ArrayBindingPattern: ${BindingElisionElementOrBindingRestElement.type}`);
    }
  }
  return names;
}

// 13.3.3.1 #sec-destructuring-binding-patterns-static-semantics-boundnames
//   BindingProperty : PropertyName `:` BindingElement
//
// (implicit)
//   BindingProperty : SingleNameBinding
export function BoundNames_BindingProperty(BindingProperty) {
  switch (true) {
    case isSingleNameBinding(BindingProperty.value):
      return BoundNames_SingleNameBinding(BindingProperty.value);
    case isBindingElement(BindingProperty.value):
      return BoundNames_BindingElement(BindingProperty.value);
    default:
      throw new TypeError(`Invalid BindingProperty: ${BindingProperty.value.type}`);
  }
}

// (implicit)
//   BindingRestProperty : `...` BindingIdentifier
export function BoundNames_BindingRestProperty(BindingRestProperty) {
  if (!isBindingIdentifier(BindingRestProperty.argument)) {
    throw new TypeError(`Invalid binding of BindingRestProperty: ${BindingRestProperty.argument.type}`);
  }
  return BoundNames_BindingIdentifier(BindingRestProperty.argument);
}

// 13.3.3.1 #sec-destructuring-binding-patterns-static-semantics-boundnames
//   ObjectBindingPattern : `{` `}`
//   ObjectBindingPattern : `{` BindingRestProperty `}`
//   BindingPropertyList : BindingPropertyList `,` BindingProperty
//
// (implicit)
//   ObjectBindingPattern : `{` BindingPropertyList `}`
//   ObjectBindingPattern : `{` BindingPropertyList `,` `}`
//   ObjectBindingPattern : `{` BindingPropertyList `,` BindingRestProperty `}`
function BoundNames_ObjectBindingPattern(ObjectBindingPattern) {
  const names = [];
  for (const BindingPropertyOrBindingRestProperty of ObjectBindingPattern.properties) {
    switch (true) {
      case isBindingProperty(BindingPropertyOrBindingRestProperty): {
        const BindingProperty = BindingPropertyOrBindingRestProperty;
        names.push(...BoundNames_BindingProperty(BindingProperty));
        break;
      }
      case isBindingRestProperty(BindingPropertyOrBindingRestProperty): {
        const BindingRestProperty = BindingPropertyOrBindingRestProperty;
        names.push(...BoundNames_BindingRestProperty(BindingRestProperty));
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
function BoundNames_BindingPattern(BindingPattern) {
  switch (true) {
    case isObjectBindingPattern(BindingPattern):
      return BoundNames_ObjectBindingPattern(BindingPattern);
    case isArrayBindingPattern(BindingPattern):
      return BoundNames_ArrayBindingPattern(BindingPattern);
    default:
      throw new TypeError(`Invalid BindingPattern: ${BindingPattern.type}`);
  }
}

// 13.7.5.2 #sec-for-in-and-for-of-statements-static-semantics-boundnames
//   ForDeclaration : LetOrConst ForBinding
export function BoundNames_ForDeclaration(ForDeclaration) {
  const ForBinding = ForDeclaration.declarations[0].id;
  return BoundNames_ForBinding(ForBinding);
}

// (implicit)
//   ForBinding : BindingIdentifier
//   ForBinding : BindingPattern
export function BoundNames_ForBinding(ForBinding) {
  switch (true) {
    case isBindingIdentifier(ForBinding):
      return BoundNames_BindingIdentifier(ForBinding);
    case isBindingPattern(ForBinding):
      return BoundNames_BindingPattern(ForBinding);
    default:
      throw new TypeError(`Invalid ForBinding: ${ForBinding.type}`);
  }
}

// 14.1.3 #sec-function-definitions-static-semantics-boundnames
//   FunctionDeclaration :
//     `function` BindingIdentifier `(` FormalParameters `)` `{` FunctionBody `}`
//   FunctionDeclaration :
//     `function` `(` FormalParameters `)` `{` FunctionBody `}`
//
// 14.4.2 #sec-generator-function-definitions-static-semantics-boundnames
//   GeneratorDeclaration :
//     `function` `*` BindingIdentifier `(` FormalParameters `)` `{` GeneratorBody `}`
//   GeneratorDeclaration :
//     `function` `*` `(` FormalParameters `)` `{` GeneratorBody `}`
//
// 14.5.2 #sec-async-generator-function-definitions-static-semantics-boundnames
//   AsyncGeneratorDeclaration :
//     `async` `function` `*` BindingIdentifier `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//   AsyncGeneratorDeclaration :
//     `async` `function` `*` `(` FormalParameters `)` `{` AsyncGeneratorBody `}`
//
// 14.7.2 #sec-async-function-definitions-static-semantics-BoundNames
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
export function BoundNames_HoistableDeclaration(HoistableDeclaration) {
  if (HoistableDeclaration.id === null) {
    return ['*default*'];
  }
  return BoundNames_BindingIdentifier(HoistableDeclaration.id);
}

export const BoundNames_FunctionDeclaration = BoundNames_HoistableDeclaration;
export const BoundNames_GeneratorDeclaration = BoundNames_HoistableDeclaration;
export const BoundNames_AsyncFunctionDeclaration = BoundNames_HoistableDeclaration;
export const BoundNames_AsyncGeneratorDeclaration = BoundNames_HoistableDeclaration;

// 14.6.2 #sec-class-definitions-static-semantics-boundnames
//   ClassDeclaration : `class` BindingIdentifier ClassTail
//   ClassDeclaration : `class` ClassTail
export function BoundNames_ClassDeclaration(ClassDeclaration) {
  if (ClassDeclaration.id === null) {
    return ['*default*'];
  }
  return BoundNames_BindingIdentifier(ClassDeclaration.id);
}

// (implicit)
//   Declaration : HoistableDeclaration
//   Declaration : ClassDeclaration
//   Declaration : LexicalDeclaration
export function BoundNames_Declaration(Declaration) {
  switch (true) {
    case isHoistableDeclaration(Declaration):
      return BoundNames_HoistableDeclaration(Declaration);
    case isClassDeclaration(Declaration):
      return BoundNames_ClassDeclaration(Declaration);
    case isLexicalDeclaration(Declaration):
      return BoundNames_LexicalDeclaration(Declaration);
    default:
      throw new TypeError(`Unexpected Declaration: ${Declaration.type}`);
  }
}
