import {
  isBindingIdentifier,
  isBindingIdentifierAndInitializer,
  isBindingPattern,
  isBindingPatternAndInitializer,
  isFunctionRestParameter,
  isSingleNameBinding,
} from '../ast.mjs';
import { OutOfRange } from '../helpers.mjs';

// 13.3.3.4 #sec-destructuring-binding-patterns-static-semantics-issimpleparameterlist
//   BindingElement :
//     BindingPattern
//     BindingPattern Initializer
//
// (implicit)
//   BindingElement : SingleNameBinding
export function IsSimpleParameterList_BindingElement(BindingElement) {
  switch (true) {
    case isSingleNameBinding(BindingElement):
      return IsSimpleParameterList_SingleNameBinding(BindingElement);

    case isBindingPattern(BindingElement):
    case isBindingPatternAndInitializer(BindingElement):
      return false;

    default:
      throw new OutOfRange('IsSimpleParameterList_BindingElement', BindingElement);
  }
}

// 13.3.3.4 #sec-destructuring-binding-patterns-static-semantics-issimpleparameterlist
//   SingleNameBinding :
//     BindingIdentifier
//     BindingIdentifier Initializer
export function IsSimpleParameterList_SingleNameBinding(SingleNameBinding) {
  switch (true) {
    case isBindingIdentifier(SingleNameBinding):
      return true;
    case isBindingIdentifierAndInitializer(SingleNameBinding):
      return false;
    default:
      throw new OutOfRange('IsSimpleParameterList_SingleNameBinding', SingleNameBinding);
  }
}

// 14.1.13 #sec-function-definitions-static-semantics-issimpleparameterlist
//   FormalParameters :
//     [empty]
//     FormalParameterList `,` FunctionRestParameter
//
// (implicit)
//   FormalParameters :
//     FormalParameterList
//     FormalParameterList `,`
//
// https://github.com/tc39/ecma262/pull/1301
//   FormalParameters : FunctionRestParameter
export function IsSimpleParameterList_FormalParameters(FormalParameters) {
  if (FormalParameters.length === 0) {
    return true;
  }
  if (isFunctionRestParameter(FormalParameters[FormalParameters.length - 1])) {
    return false;
  }
  return IsSimpleParameterList_FormalParameterList(FormalParameters);
}

// 14.1.13 #sec-function-definitions-static-semantics-issimpleparameterlist
//   FormalParameterList :
//     FormalParameter
//     FormalParameterList `,` FormalParameter
export function IsSimpleParameterList_FormalParameterList(FormalParameterList) {
  for (const FormalParameter of FormalParameterList) {
    if (IsSimpleParameterList_FormalParameter(FormalParameter) === false) {
      return false;
    }
  }
  return true;
}

// TODO(TimothyGu): does not need to be explicitly declared
// 14.1.13 #sec-function-definitions-static-semantics-issimpleparameterlist
//   FormalParameter : BindingElement
export const IsSimpleParameterList_FormalParameter = IsSimpleParameterList_BindingElement;
