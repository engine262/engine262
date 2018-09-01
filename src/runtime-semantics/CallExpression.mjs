import {
  surroundingAgent,
} from '../engine.mjs';
import {
  New as NewValue,
  Type,
  Value,
} from '../value.mjs';
import {
  Assert,
  Call,
  GetBase,
  GetReferencedName,
  GetThisValue,
  GetValue,
  IsCallable,
  IsPropertyReference,
  PrepareForTailCall,
} from '../abstract-ops/all.mjs';
import {
  ArgumentListEvaluation,
} from './all.mjs';
import {
  AbruptCompletion,
  Q,
  ReturnIfAbrupt,
} from '../completion.mjs';
import {
  Evaluate_Expression,
} from '../evaluator.mjs';


function IsInTailPosition() {
  return false;
}

function EvaluateCall(func, ref, args, tailPosition) {
  let thisValue;
  if (Type(ref) === 'Reference') {
    if (IsPropertyReference(ref).isTrue()) {
      thisValue = GetThisValue(ref);
    } else {
      const refEnv = GetBase(ref);
      thisValue = refEnv.WithBaseObject();
    }
  } else {
    thisValue = NewValue(undefined);
  }
  let argList = ArgumentListEvaluation(args);
  ReturnIfAbrupt(argList);
  if (Type(func) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  if (IsCallable(func).isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  if (tailPosition) {
    PrepareForTailCall();
  }
  const result = Call(func, thisValue, argList);
  // Assert: If tailPosition is true, the above call will not return here
  // but instead evaluation will continue as if the following return has already occurred.
  if (!(result instanceof AbruptCompletion)) {
    Assert(result instanceof Value);
  }
  return result;
}

// #sec-function-calls-runtime-semantics-evaluation
// CallExpression :
//   CoverCallExpressionAndAsyncArrowHead
//   CallExpression Arguments
export function Evaluate_CallExpression(CallExpression) {
  const ref = Q(Evaluate_Expression(CallExpression.callee));
  const func = Q(GetValue(ref));
  if (Type(ref) === 'Reference' && !IsPropertyReference(ref)
    && (Type(GetReferencedName(ref)) === 'String'
      && GetReferencedName(ref).stringValue() === 'eval')) {
    // TODO: direct eval
  }
  const thisCall = CallExpression;
  const tailCall = IsInTailPosition(thisCall);
  return Q(EvaluateCall(func, ref, CallExpression.arguments, tailCall));
}
