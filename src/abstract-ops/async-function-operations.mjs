import { EnsureCompletion, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { resume } from '../helpers.mjs';
import { Assert, Call } from './all.mjs';

// This file covers abstract operations defined in
// 25.7 #sec-async-function-objects

// https://tc39.es/proposal-top-level-await/#sec-asyncblockstart
export function AsyncBlockStart(promiseCapability, asyncBody, asyncContext) {
  asyncContext.promiseCapability = promiseCapability;

  const runningContext = surroundingAgent.runningExecutionContext;
  asyncContext.codeEvaluationState = (function* resumer() {
    const result = EnsureCompletion(yield* Evaluate(asyncBody));
    // Assert: If we return here, the async function either threw an exception or performed an implicit or explicit return; all awaiting is done.
    surroundingAgent.executionContextStack.pop(asyncContext);
    if (result.Type === 'normal') {
      X(Call(promiseCapability.Resolve, Value.undefined, [Value.undefined]));
    } else if (result.Type === 'return') {
      X(Call(promiseCapability.Resolve, Value.undefined, [result.Value]));
    } else {
      Assert(result.Type === 'throw');
      X(Call(promiseCapability.Reject, Value.undefined, [result.Value]));
    }
    return Value.undefined;
  }());
  surroundingAgent.executionContextStack.push(asyncContext);
  const result = EnsureCompletion(resume(asyncContext, undefined));
  Assert(surroundingAgent.runningExecutionContext === runningContext);
  Assert(result.Type === 'normal' && result.Value === Value.undefined);
  return Value.undefined;
}

// 25.7.5.1 #sec-async-functions-abstract-operations-async-function-start
export function AsyncFunctionStart(promiseCapability, asyncFunctionBody) {
  const runningContext = surroundingAgent.runningExecutionContext;
  const asyncContext = runningContext.copy();
  X(AsyncBlockStart(promiseCapability, asyncFunctionBody, asyncContext));
}
