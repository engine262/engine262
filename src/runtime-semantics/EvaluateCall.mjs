import { surroundingAgent } from '../engine.mjs';
import { Type, Value } from '../value.mjs';
import {
  Assert,
  IsPropertyReference,
  IsCallable,
  GetThisValue,
  PrepareForTailCall,
  Call,
  GetBase,
} from '../abstract-ops/all.mjs';
import { Q, Completion, AbruptCompletion } from '../completion.mjs';
import { EnvironmentRecord } from '../environment.mjs';
import { ArgumentListEvaluation } from './all.mjs';

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
