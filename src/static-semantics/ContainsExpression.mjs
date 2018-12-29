import {
  isArrayBindingPattern,
  isBindingElement,
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isBindingProperty,
  isBindingPropertyWithColon,
  isBindingPropertyWithSingleNameBinding,
  isBindingRestElement,
  isBindingRestProperty,
  isFormalParameter,
  isFunctionRestParameter,
  isObjectBindingPattern,
  isSingleNameBinding,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';

// 13.3.3.2 #sec-destructuring-binding-patterns-static-semantics-containsexpression
//   SingleNameBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
export function ContainsExpression_SingleNameBinding(SingleNameBinding) {
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      return false;
    case isBindingIdentifierAndInitializer(SingleNameBinding):
      return true;
    default:
      throw new OutOfRange('ContainsExpression_SingleNameBinding', SingleNameBinding);
  }
}

// 13.3.3.2 #sec-destructuring-binding-patterns-static-semantics-containsexpression
//   BindingElement : BindingPattern Initializer
//
// (implicit)
//   BindingElement :
//     SingleNameBinding
//     BindingPattern
export function ContainsExpression_BindingElement(BindingElement) {
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return ContainsExpression_SingleNameBinding(BindingElement);
    case isBindingPattern(BindingElement):
      return ContainsExpression_BindingPattern(BindingElement);
    case isBindingPatternAndInitializer(BindingElement):
      return true;
    default:
      throw new OutOfRange('ContainsExpression_BindingElement', BindingElement);
  }
}

// 13.3.3.2 #sec-destructuring-binding-patterns-static-semantics-containsexpression
//   BindingRestElement :
//     `...` BindingIdentifier
//     `...` BindingPattern
export function ContainsExpression_BindingRestElement(BindingRestElement) {
  switch (true) {
    case isBindingIdentifier(BindingRestElement.argument):
      return false;
    case isBindingPattern(BindingRestElement.argument):
      return ContainsExpression_BindingPattern(BindingRestElement.argument);
    default:
      throw new OutOfRange('ContainsExpression_BindingRestElement', BindingRestElement);
  }
}

// 13.3.3.2 #sec-destructuring-binding-patterns-static-semantics-containsexpression
//   ArrayBindingPattern :
//     `[` Elision `]`
//     `[` Elision BindingRestElement `]`
//     `[` BindingElementList `,` Elision `]`
//     `[` BindingElementList `,` Elision BindingRestElement `]`
//   BindingElementList : BindingElementList `,` BindingElisionElement
//   BindingElisionElement : Elision BindingElement
//
// (implicit)
//   BindingElementList : BindingElisionElement
//   BindingElisionElement : BindingElement
export function ContainsExpression_ArrayBindingPattern(ArrayBindingPattern) {
  for (const BindingElisionElementOrBindingRestElement of ArrayBindingPattern.elements) {
    switch (true) {
      case BindingElisionElementOrBindingRestElement === null:
        // This is an elision.
        break;

      case isBindingElement(BindingElisionElementOrBindingRestElement): {
        const BindingElement = BindingElisionElementOrBindingRestElement;
        const has = ContainsExpression_BindingElement(BindingElement);
        if (has === true) return true;
        break;
      }
      case isBindingRestElement(BindingElisionElementOrBindingRestElement): {
        const BindingRestElement = BindingElisionElementOrBindingRestElement;
        const has = ContainsExpression_BindingRestElement(BindingRestElement);
        if (has === true) return true;
        break;
      }
      default:
        throw new OutOfRange('ContainsExpression_ArrayBindingPattern element', BindingElisionElementOrBindingRestElement);
    }
  }
  return false;
}

// 13.3.3.2 #sec-destructuring-binding-patterns-static-semantics-containsexpression
//   BindingProperty : PropertyName `:` BindingElement
//
// (implicit)
//   BindingProperty : SingleNameBinding
export function ContainsExpression_BindingProperty(BindingProperty) {
  switch (true) {
    case isBindingPropertyWithColon(BindingProperty): {
      const has = BindingProperty.computed;
      if (has === true) return true;
      return ContainsExpression_BindingElement(BindingProperty.value);
    }

    case isBindingPropertyWithSingleNameBinding(BindingProperty):
      return ContainsExpression_SingleNameBinding(BindingProperty.value);

    default:
      throw new OutOfRange('ContainsExpression_BindingProperty', BindingProperty);
  }
}

// TODO(missing) from the spec:
//   BindingRestProperty : `...` BindingIdentifier
export function ContainsExpression_BindingRestProperty(BindingRestProperty) {
  if (!isBindingIdentifier(BindingRestProperty.argument)) {
    throw new OutOfRange('ContainsExpression_BindingRestProperty argument', BindingRestProperty.argument);
  }
  return false;
}

// 13.3.3.2 #sec-destructuring-binding-patterns-static-semantics-containsexpression
//   ObjectBindingPattern : `{` `}`
//
//   BindingPropertyList : BindingPropertyList `,` BindingProperty
//
// (implicit)
//   ObjectBindingPattern :
//     `{` BindingRestProperty `}`
//     `{` BindingPropertyList `}`
//     `{` BindingPropertyList `,` `}`
//
//   BindingPropertyList : BindingProperty
//
// TODO(missing) from spec:
//   ObjectBindingPattern : `{` BindingPropertyList `,` BindingRestProperty `}`
export function ContainsExpression_ObjectBindingPattern(ObjectBindingPattern) {
  for (const prop of ObjectBindingPattern.properties) {
    switch (true) {
      case isBindingProperty(prop): {
        const BindingProperty = prop;
        const has = ContainsExpression_BindingProperty(BindingProperty);
        if (has === true) return true;
        break;
      }

      case isBindingRestProperty(prop): {
        const BindingRestProperty = prop;
        const has = ContainsExpression_BindingRestProperty(BindingRestProperty);
        if (has === true) return true;
        break;
      }

      default:
        throw new OutOfRange('ContainsExpression_ObjectBindingPattern property', prop);
    }
  }
  return false;
}

// (implicit)
//   BindingPattern :
//     ObjectBindingPattern
//     ArrayBindingPattern
function ContainsExpression_BindingPattern(BindingPattern) {
  switch (true) {
    case isObjectBindingPattern(BindingPattern):
      return ContainsExpression_ObjectBindingPattern(BindingPattern);
    case isArrayBindingPattern(BindingPattern):
      return ContainsExpression_ArrayBindingPattern(BindingPattern);
    default:
      throw new OutOfRange('ContainsExpression_BindingPattern', BindingPattern);
  }
}

// (implicit)
//   FormalParameter : BindingElement
export const ContainsExpression_FormalParameter = ContainsExpression_BindingElement;

// (implicit)
//   FunctionRestParameter : BindingRestElement
export const ContainsExpression_FunctionRestParameter = ContainsExpression_BindingRestElement;

// 14.1.5 #sec-function-definitions-static-semantics-containsexpression
//   FormalParameters :
//     [empty]
//     FormalParameterList `,` FunctionRestParameter
//
//   FormalParameterList :
//     FormalParameterList `,` FormalParameter
//
// (implicit)
//   FormalParameters :
//     FunctionRestParameter
//     FormalParameterList
//     FormalParameterList `,`
//
//   FormalParameterList : FormalParameter
export function ContainsExpression_FormalParameters(FormalParameters) {
  for (const FormalParameterOrFunctionRestParameter of FormalParameters) {
    switch (true) {
      case isFormalParameter(FormalParameterOrFunctionRestParameter):
        if (ContainsExpression_FormalParameter(FormalParameterOrFunctionRestParameter) === true) {
          return true;
        }
        break;

      case isFunctionRestParameter(FormalParameterOrFunctionRestParameter):
        if (ContainsExpression_FunctionRestParameter(FormalParameterOrFunctionRestParameter) === true) {
          return true;
        }
        break;

      default:
        throw new OutOfRange('ContainsExpression_FormalParameters element', FormalParameterOrFunctionRestParameter);
    }
  }
  return false;
}
