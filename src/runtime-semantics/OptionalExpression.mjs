import { Value } from '../value.mjs';
import { GetValue } from '../abstract-ops/all.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Q } from '../completion.mjs';
import { IsInTailPosition } from '../static-semantics/all.mjs';
import { OutOfRange } from '../helpers.mjs';
import {
  EvaluateCall,
  EvaluatePropertyAccessWithExpressionKey,
  EvaluatePropertyAccessWithIdentifierKey,
} from './all.mjs';

// #sec-optional-chaining-evaluation
//   OptionalExpression :
//     MemberExpression OptionalChain
//     CallExpression OptionalChain
//     OptionalExpression OptionalChain
export function* Evaluate_OptionalExpression({ MemberExpression, OptionalChain }) {
  // 1. Let baseReference be the result of evaluating MemberExpression.
  const baseReference = yield* Evaluate(MemberExpression);
  // 2. Let baseValue be ? GetValue(baseReference).
  const baseValue = Q(GetValue(baseReference));
  // 3. If baseValue is undefined or null, then
  if (baseValue === Value.undefined || baseValue === Value.null) {
    // a. Return undefined.
    return Value.undefined;
  }
  // 4. Return the result of performing ChainEvaluation of OptionalChain with arguments baseValue and baseReference.
  return yield* ChainEvaluation(OptionalChain, baseValue, baseReference);
}

// #sec-optional-chaining-chain-evaluation
//   OptionalChain :
//     `?.` Arguments
//     `?.` `[` Expression `]`
//     `?.` IdentifierName
//     OptionalChain Arguments
//     OptionalChain `[` Expression `]`
//     OptionalChain `.` IdentifierName
function* ChainEvaluation(node, baseValue, baseReference) {
  const {
    OptionalChain,
    Arguments,
    Expression,
    IdentifierName,
  } = node;
  if (Arguments) {
    if (OptionalChain) {
      // 1. Let optionalChain be OptionalChain.
      const optionalChain = OptionalChain;
      // 2. Let newReference be ? ChainEvaluation of optionalChain with arguments baseValue and baseReference.
      const newReference = Q(yield* ChainEvaluation(optionalChain, baseValue, baseReference));
      // 3. Let newValue be ? GetValue(newReference).
      const newValue = Q(GetValue(newReference));
      // 4. Let thisChain be this OptionalChain.
      const thisChain = node;
      // 5. Let tailCall be IsInTailPosition(thisChain).
      const tailCall = IsInTailPosition(thisChain);
      // 6. Return ? EvaluateCall(newValue, newReference, Arguments, tailCall).
      return Q(yield* EvaluateCall(newValue, newReference, Arguments, tailCall));
    }
    // 1. Let thisChain be this OptionalChain.
    const thisChain = node;
    // 2. Let tailCall be IsInTailPosition(thisChain).
    const tailCall = IsInTailPosition(thisChain);
    // 3. Return ? EvaluateCall(baseValue, baseReference, Arguments, tailCall).
    return Q(yield* EvaluateCall(baseValue, baseReference, Arguments, tailCall));
  }
  if (Expression) {
    if (OptionalChain) {
      // 1. Let optionalChain be OptionalChain.
      const optionalChain = OptionalChain;
      // 2. Let newReference be ? ChainEvaluation of optionalChain with arguments baseValue and baseReference.
      const newReference = Q(yield* ChainEvaluation(optionalChain, baseValue, baseReference));
      // 3. Let newValue be ? GetValue(newReference).
      const newValue = Q(GetValue(newReference));
      // 4. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.
      const strict = node.strict;
      // 5. Return ? EvaluatePropertyAccessWithExpressionKey(newValue, Expression, strict).
      return Q(yield* EvaluatePropertyAccessWithExpressionKey(newValue, Expression, strict));
    }
    // 1. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.
    const strict = node.strict;
    // 2. Return ? EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict).
    return Q(yield* EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict));
  }
  if (IdentifierName) {
    if (OptionalChain) {
      // 1. Let optionalChain be OptionalChain.
      const optionalChain = OptionalChain;
      // 2. Let newReference be ? ChainEvaluation of optionalChain with arguments baseValue and baseReference.
      const newReference = Q(yield* ChainEvaluation(optionalChain, baseValue, baseReference));
      // 3. Let newValue be ? GetValue(newReference).
      const newValue = Q(GetValue(newReference));
      // 4. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.
      const strict = node.strict;
      // 5. Return ? EvaluatePropertyAccessWithIdentifierKey(newValue, IdentifierName, strict).
      return Q(EvaluatePropertyAccessWithIdentifierKey(newValue, IdentifierName, strict));
    }
    // 1. If the code matched by this OptionalChain is strict mode code, let strict be true; else let strict be false.
    const strict = node.strict;
    // 2. Return ? EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict).
    return Q(EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict));
  }
  throw new OutOfRange('ChainEvaluation', node);
}
