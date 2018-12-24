import { Assert, Call } from './all.mjs';
import { EnsureCompletion, Q } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate_FunctionBody } from '../runtime-semantics/all.mjs';
import { Value } from '../value.mjs';
import { resume } from '../helpers.mjs';

// This file covers abstract operations defined in
// 25.7 #sec-async-function-objects

// 25.7.5.1 #sec-async-functions-abstract-operations-async-function-start
export function AsyncFunctionStart(promiseCapability, asyncFunctionBody) {
  const runningContext = surroundingAgent.runningExecutionContext;
  const asyncContext = runningContext.copy();
  asyncContext.codeEvaluationState = (function* resumer() {
    const result = EnsureCompletion(yield* Evaluate_FunctionBody(asyncFunctionBody));
    // Assert: If we return here, the async function either threw an exception or performed an implicit or explicit return; all awaiting is done.
    surroundingAgent.executionContextStack.pop(asyncContext);
    if (result.Type === 'normal') {
      Q(Call(promiseCapability.Resolve, Value.undefined, [Value.undefined]));
    } else if (result.Type === 'return') {
      Q(Call(promiseCapability.Resolve, Value.undefined, [result.Value]));
    } else {
      Assert(result.Type === 'throw');
      Q(Call(promiseCapability.Reject, Value.undefined, [result.Value]));
    }
    return Value.undefined;
  }());
  surroundingAgent.executionContextStack.push(asyncContext);
  const result = EnsureCompletion(resume(asyncContext, undefined));
  Assert(surroundingAgent.runningExecutionContext === runningContext);
  Assert(result.Type === 'normal' && result.Value === Value.undefined);
  return Value.undefined;
}
