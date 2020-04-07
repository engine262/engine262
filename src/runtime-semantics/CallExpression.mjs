import { surroundingAgent } from '../engine.mjs';
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
  PerformEval,
  PrepareForTailCall,
  SameValue,
} from '../abstract-ops/all.mjs';
import { IsInTailPosition } from '../static-semantics/all.mjs';
import {
  AbruptCompletion,
  Completion,
  Q,
} from '../completion.mjs';
import { Evaluate } from '../evaluator.mjs';
import { EnvironmentRecord } from '../environment.mjs';
import { ArgumentListEvaluation, ArgumentListEvaluation_Arguments } from './all.mjs';

// #sec-evaluatecall
export function* EvaluateCall(func, ref, args, tailPosition) {
  // 1. If Type(ref) is Reference, then
  let thisValue;
  if (Type(ref) === 'Reference') {
    // a. If IsPropertyReference(ref) is true, then
    if (IsPropertyReference(ref) === Value.true) {
      // i. Let thisValue be GetThisValue(ref).
      thisValue = GetThisValue(ref);
    } else {
      // i. Assert: the base of ref is an Environment Record.
      Assert(ref.BaseValue instanceof EnvironmentRecord);
      // ii. Let envRef be GetBase(ref).
      const refEnv = GetBase(ref);
      // iii. Let thisValue be envRef.WithBaseObject().
      thisValue = refEnv.WithBaseObject();
    }
  } else {
    // a. Let thisValue be undefined.
    thisValue = Value.undefined;
  }
  // 3. Let argList be ? ArgumentListEvaluation of arguments.
  const argList = Q(yield* ArgumentListEvaluation(args));
  // 4. If Type(func) is not Object, throw a TypeError exception.
  if (Type(func) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  // 5. If IsCallable(func) is false, throw a TypeError exception.
  if (IsCallable(func) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', func);
  }
  // 6. If tailPosition is true, perform PrepareForTailCall().
  if (tailPosition) {
    PrepareForTailCall();
  }
  // 7. Let result be Call(func, thisValue, argList).
  const result = Call(func, thisValue, argList);
  // 8. Assert: If tailPosition is true, the above call will not return here but instead
  //    evaluation will continue as if the following return has already occurred.
  Assert(!tailPosition);
  // 9. Assert: If result is not an abrupt completion, then Type(result) is an ECMAScript language type.
  if (!(result instanceof AbruptCompletion)) {
    Assert(result instanceof Value || result instanceof Completion);
  }
  // 10. Return result.
  return result;
}

// #sec-function-calls-runtime-semantics-evaluation
// CallExpression :
//   CoverCallExpressionAndAsyncArrowHead
//   CallExpression Arguments
export function* Evaluate_CallExpression(CallExpression) {
  // 1. Let expr be CoveredCallExpression of CoverCallExpressionAndAsyncArrowHead.
  const expr = CallExpression;
  // 2. Let memberExpr be the MemberExpression of expr.
  const memberExpr = expr.CallExpression;
  // 3. Let arguments be the Arguments of expr.
  const args = expr.Arguments;
  // 4. Let ref be the result of evaluating memberExpr.
  const ref = yield* Evaluate(memberExpr);
  // 5. Let func be ? GetValue(ref).
  const func = Q(GetValue(ref));
  // 6. If Type(ref) is Reference, IsPropertyReference(ref) is false, and GetReferencedName(ref) is "eval", then
  if (Type(ref) === 'Reference'
      && IsPropertyReference(ref) === Value.false
      && (Type(GetReferencedName(ref)) === 'String'
      && GetReferencedName(ref).stringValue() === 'eval')) {
    // a. If SameValue(func, %eval%) is true, then
    if (SameValue(func, surroundingAgent.intrinsic('%eval%')) === Value.true) {
      // i. Let argList be ? ArgumentListEvaluation of arguments.
      const argList = Q(yield* ArgumentListEvaluation_Arguments(args));
      // ii. If argList has no elements, return undefined.
      if (argList.length === 0) {
        return Value.undefined;
      }
      // iii. Let evalText be the first element of argList.
      const evalText = argList[0];
      // iv. If the source code matching this CallExpression is strict mode code, let strictCaller be true. Otherwise let strictCaller be false.
      const strictCaller = CallExpression.strict;
      // v. Let evalRealm be the current Realm Record.
      const evalRealm = surroundingAgent.currentRealmRecord;
      // vi. Return ? PerformEval(evalText, evalRealm, strictCaller, true).
      return Q(PerformEval(evalText, evalRealm, strictCaller, true));
    }
  }
  // 7. Let thisCall be this CallExpression.
  const thisCall = CallExpression;
  // 8. Let tailCall be IsInTailPosition(thisCall).
  const tailCall = IsInTailPosition(thisCall);
  // 9. Return ? EvaluateCall(func, ref, arguments, tailCall).
  return Q(yield* EvaluateCall(func, ref, args, tailCall));
}
