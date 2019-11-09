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
import { EvaluateCall, EvaluateStaticPropertyAccess, EvaluateDynamicPropertyAccess } from './all.mjs';

// https://tc39.es/proposal-optional-chaining/#prod-OptionalExpression
// OptionalExpression :
//   MemberExpression OptionalChain
//   CallExpression OptionalChain
//   OptionalExpression OptionalChain
export function* Evaluate_OptionalExpression(OptionalExpression) {
  const baseReference = yield* Evaluate(OptionalExpression.object);
  const baseValue = Q(GetValue(baseReference));
  if (baseValue === Value.undefined || baseValue === Value.null) {
    return Value.undefined;
  }
  Assert(isOptionalChain(OptionalExpression.chain));
  return Q(yield* ChainEvaluation(OptionalExpression.chain, baseValue, baseReference));
}

// https://tc39.es/proposal-optional-chaining/#sec-optional-chaining-chain-evaluation
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
        return Q(yield* EvaluateDynamicPropertyAccess(newValue, OptionalChain.property, strict));
      // OptionalChain : OptionalChain `?.` IdentifierName
      case isOptionalChainWithIdentifierName(OptionalChain):
        return Q(EvaluateStaticPropertyAccess(newValue, OptionalChain.property, strict));
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
      return Q(yield* EvaluateDynamicPropertyAccess(baseValue, OptionalChain.property, strict));
    // OptionalChain : `?.` IdentifierName
    case isOptionalChainWithIdentifierName(OptionalChain):
      return Q(EvaluateStaticPropertyAccess(baseValue, OptionalChain.property, strict));
    // OptionalChain : `?.` Arguments
    case isOptionalChainWithArguments(OptionalChain): {
      const tailCall = IsInTailPosition(OptionalChain);
      return Q(yield* EvaluateCall(baseValue, baseReference, OptionalChain.arguments, tailCall));
    }
    default:
      throw new OutOfRange('ChainEvaluation', OptionalChain);
  }
}
