import {
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isSingleNameBinding,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';

// #sec-destructuring-binding-patterns-static-semantics-hasinitializer
//   SingleNameBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
export function HasInitializer_SingleNameBinding(SingleNameBinding) {
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      return false;

    case isBindingIdentifierAndInitializer(SingleNameBinding):
      return true;

    default:
      throw new OutOfRange('HasInitializer_SingleNameBinding', SingleNameBinding);
  }
}

// #sec-destructuring-binding-patterns-static-semantics-hasinitializer
//   BindingElement :
//     BindingPattern
//     BindingPattern Initializer
//
// (implicit)
//   BindingElement : SingleNameBinding
export function HasInitializer_BindingElement(BindingElement) {
  switch (true) {
    case isBindingPattern(BindingElement):
      return false;

    case isBindingPatternAndInitializer(BindingElement):
      return true;

    case isSingleNameBinding(BindingElement):
      return HasInitializer_SingleNameBinding(BindingElement);

    default:
      throw new OutOfRange('HasInitializer_BindingElement', BindingElement);
  }
}

// #sec-function-definitions-static-semantics-hasinitializer
//   FormalParameterList : FormalParameterList `,` FormalParameter
// is implemented directly as part of ExpectedArgumentCount for FormalParameters.
