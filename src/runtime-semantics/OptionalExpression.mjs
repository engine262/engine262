import {
  isOptionalChain,
  isOptionalChainWithExpression,
  isOptionalChainWithIdentifierName,
  isOptionalChainWithArguments,
  isOptionalChainWithOptionalChain,
} from '../ast.mjs';
import { GetValue, Assert } from '../abstract-ops/all.mjs';
import { Value } from '../value.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { IsInTailPosition } from '../static-semantics/all.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  EvaluateCall,
  EvaluatePropertyAccessWithIdentifierKey,
  EvaluatePropertyAccessWithExpressionKey,
} from './all.mjs';

// #prod-OptionalExpression
// OptionalExpression :
//   MemberExpression OptionalChain
//   CallExpression OptionalChain
//   OptionalExpression OptionalChain
export function* Evaluate_OptionalExpression({ object: MemberExpression, chain: OptionalChain }) {
  // 1. Let baseReference be the result of evaluating MemberExpression.
  const baseReference = yield* Evaluate(MemberExpression);
  // 2. Let baseValue be ? GetValue(baseReference).
  const baseValue = Q(GetValue(baseReference));
  // 3. If baseValue is undefined or null, then
  if (baseValue === Value.undefined || baseValue === Value.null) {
    // a. Return undefined.
    return Value.undefined;
  }
  // Return the result of performing ChainEvaluation of OptionalChain with arguments baseValue and baseReference.
  return Q(yield* ChainEvaluation(OptionalChain, baseValue, baseReference));
}

// #sec-optional-chaining-chain-evaluation
// OptionalChain :
//   `?.` `[` Expression `]`
//   `?.` IdentifierName
//   `?.` Arguments
//   OptionalChain `[` Expression `]`
//   OptionalChain `.` IdentifierName
//   OptionalChain Arguments
function* ChainEvaluation(OptionalChain, baseValue, baseReference) {
  const strict = OptionalChain.strict;

  if (isOptionalChainWithOptionalChain(OptionalChain)) {
    Assert(isOptionalChain(OptionalChain.base));
    const newReference = yield* ChainEvaluation(OptionalChain.base, baseValue, baseReference);
    const newValue = Q(GetValue(newReference));
    switch (true) {
      // OptionalChain : OptionalChain `?.` `[` Expression `]`
      case isOptionalChainWithExpression(OptionalChain):
        return Q(yield* EvaluatePropertyAccessWithExpressionKey(newValue, OptionalChain.property, strict));
      // OptionalChain : OptionalChain `?.` IdentifierName
      case isOptionalChainWithIdentifierName(OptionalChain):
        return Q(EvaluatePropertyAccessWithIdentifierKey(newValue, OptionalChain.property, strict));
      // OptionalChain : OptionalChain `?.` Arguments
      case isOptionalChainWithArguments(OptionalChain): {
        const tailCall = IsInTailPosition(OptionalChain);
        return Q(yield* EvaluateCall(newValue, newReference, OptionalChain.arguments, tailCall));
      }
      default:
        throw new OutOfRange('ChainEvaluation', OptionalChain);
    }
  }

  switch (true) {
    // OptionalChain : `?.` `[` Expression `]`
    case isOptionalChainWithExpression(OptionalChain):
      return Q(yield* EvaluatePropertyAccessWithExpressionKey(baseValue, OptionalChain.property, strict));
    // OptionalChain : `?.` IdentifierName
    case isOptionalChainWithIdentifierName(OptionalChain):
      return Q(EvaluatePropertyAccessWithIdentifierKey(baseValue, OptionalChain.property, strict));
    // OptionalChain : `?.` Arguments
    case isOptionalChainWithArguments(OptionalChain): {
      const tailCall = IsInTailPosition(OptionalChain);
      return Q(yield* EvaluateCall(baseValue, baseReference, OptionalChain.arguments, tailCall));
    }
    default:
      throw new OutOfRange('ChainEvaluation', OptionalChain);
  }
}
