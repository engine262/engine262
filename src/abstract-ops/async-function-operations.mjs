import { Assert, Call } from './all.mjs';
import { EnsureCompletion, X } from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Evaluate_FunctionBody } from '../runtime-semantics/all.mjs';
import { Value } from '../value.mjs';
import { resume } from '../helpers.mjs';

// This file covers abstract operations defined in
// 25.7 #sec-async-function-objects

// 25.7.5.1 #sec-async-functions-abstract-operations-async-function-start
export function AsyncFunctionStart(promiseCapability, asyncFunctionBody, isExpression) {
  const runningContext = surroundingAgent.runningExecutionContext;
  const asyncContext = runningContext.copy();
  asyncContext.codeEvaluationState = (function* resumer() {
    const evaluator = isExpression ? Evaluate : Evaluate_FunctionBody;
    const result = EnsureCompletion(yield* evaluator(asyncFunctionBody));
    // Assert: If we return here, the async function either threw an exception or performed an implicit or explicit return; all awaiting is done.
    surroundingAgent.executionContextStack.pop(asyncContext);
    // https://github.com/tc39/ecma262/pull/1406
    if (result.Type === 'throw') {
      X(Call(promiseCapability.Reject, Value.undefined, [result.Value]));
    } else if (result.Type === 'normal' && isExpression === false) {
      X(Call(promiseCapability.Resolve, Value.undefined, [Value.undefined]));
    } else {
      Assert(result.Type === (isExpression ? 'normal' : 'return'));
      Assert(result.Value !== undefined);
      X(Call(promiseCapability.Resolve, Value.undefined, [result.Value]));
    }
    return Value.undefined;
  }());
  surroundingAgent.executionContextStack.push(asyncContext);
  const result = EnsureCompletion(resume(asyncContext, undefined));
  Assert(surroundingAgent.runningExecutionContext === runningContext);
  Assert(result.Type === 'normal' && result.Value === Value.undefined);
  return Value.undefined;
}
