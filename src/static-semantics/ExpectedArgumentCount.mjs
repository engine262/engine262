import { Assert } from '../abstract-ops/all.mjs';
import {
  isBindingElement,
  isFunctionRestParameter,
} from '../ast.mjs';
import { HasInitializer_BindingElement } from './all.mjs';

// #sec-function-definitions-static-semantics-expectedargumentcount
//   FormalParameters :
//     [empty]
//     FormalParameterList `,` FunctionRestParameter
//
//   FormalParameterList : FormalParameterList `,` FormalParameter
//
// (implicit)
//   FormalParameters :
//     FunctionRestParameter
//     FormalParameterList
//     FormalParameterList `,`
//
//   FormalParameterList : FormalParameter
export function ExpectedArgumentCount_FormalParameters(FormalParameters) {
  if (FormalParameters.length === 0) {
    return 0;
  }

  let count = 0;
  for (const FormalParameter of FormalParameters.slice(0, -1)) {
    Assert(isBindingElement(FormalParameter));
    const BindingElement = FormalParameter;
    if (HasInitializer_BindingElement(BindingElement)) {
      return count;
    }
    count += 1;
  }

  const last = FormalParameters[FormalParameters.length - 1];
  if (isFunctionRestParameter(last)) {
    return count;
  }
  Assert(isBindingElement(last));
  if (HasInitializer_BindingElement(last)) {
    return count;
  }
  return count + 1;
}

// #sec-arrow-function-definitions-static-semantics-expectedargumentcount
//   ArrowParameters : BindingIdentifier
//
// (implicit)
//   ArrowParameters : CoverParenthesizedExpressionAndArrowParameterList
//   ArrowFormalParameters : `(` UniqueFormalParameters `)`
//   UniqueFormalParameters : FormalParameters
export const ExpectedArgumentCount_ArrowParameters = ExpectedArgumentCount_FormalParameters;

// #sec-method-definitions-static-semantics-expectedargumentcount
//   PropertySetParameterList : FormalParameter
//
// Not implemented. Use ExpectedArgumentCount_FormalParameters instead.

// #sec-async-arrow-function-definitions-static-semantics-ExpectedArgumentCount
//   AsyncArrowBindingIdentifier : BindingIdentifier
//
// Not implemented. Use ExpectedArgumentCount_ArrowParameters instead.
