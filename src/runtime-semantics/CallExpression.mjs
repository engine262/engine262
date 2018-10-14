import { HostEnsureCanCompileStrings, surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
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
  SameValue,
} from '../abstract-ops/all.mjs';
import { ArgumentListEvaluation } from './all.mjs';
import { IsInTailPosition } from '../static-semantics/all.mjs';
import {
  AbruptCompletion,
  Completion,
  Q,
  ReturnIfAbrupt,
} from '../completion.mjs';
import { Evaluate_Expression } from '../evaluator.mjs';
import { PerformEval } from '../intrinsics/eval.mjs';

export function* EvaluateCall(func, ref, args, tailPosition) {
  let thisValue;
  if (Type(ref) === 'Reference') {
    if (IsPropertyReference(ref) === Value.true) {
      thisValue = GetThisValue(ref);
    } else {
      const refEnv = GetBase(ref);
      thisValue = refEnv.WithBaseObject();
    }
  } else {
    thisValue = Value.undefined;
  }
  const argList = yield* ArgumentListEvaluation(args);
  ReturnIfAbrupt(argList);
  if (Type(func) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'value is not a function');
  }
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'value is not a function');
  }
  if (tailPosition) {
    PrepareForTailCall();
  }
  const result = Call(func, thisValue, argList);
  // Assert: If tailPosition is true, the above call will not return here
  // but instead evaluation will continue as if the following return has already occurred.
  if (!(result instanceof AbruptCompletion)) {
    Assert(result instanceof Value || result instanceof Completion);
  }
  return result;
}

// #sec-function-calls-runtime-semantics-evaluation
// CallExpression :
//   CoverCallExpressionAndAsyncArrowHead
//   CallExpression Arguments
export function* Evaluate_CallExpression(CallExpression) {
  const ref = yield* Evaluate_Expression(CallExpression.callee);
  const func = Q(GetValue(ref));
  if (Type(ref) === 'Reference'
      && IsPropertyReference(ref) === Value.false
      && (Type(GetReferencedName(ref)) === 'String'
      && GetReferencedName(ref).stringValue() === 'eval')) {
    if (SameValue(func, surroundingAgent.intrinsic('%eval%')) === Value.true) {
      const argList = Q(yield* ArgumentListEvaluation(CallExpression.arguments));
      if (argList.length === 0) {
        return Value.undefined;
      }
      const evalText = argList[0];
      // If the source code matching this CallExpression is strict mode code, let strictCaller be true. Otherwise let strictCaller be false.
      // TODO(strict)
      const strictCaller = true;
      const evalRealm = surroundingAgent.currentRealmRecord;
      Q(HostEnsureCanCompileStrings(evalRealm, evalRealm));
      return Q(PerformEval(evalText, evalRealm, strictCaller, true));
    }
  }
  const thisCall = CallExpression;
  const tailCall = IsInTailPosition(thisCall);
  return Q(yield* EvaluateCall(func, ref, CallExpression.arguments, tailCall));
}
