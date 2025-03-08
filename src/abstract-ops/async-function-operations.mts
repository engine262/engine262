import { EnsureCompletion, X } from '../completion.mts';
import { ExecutionContext, surroundingAgent } from '../engine.mts';
import { Evaluate } from '../evaluator.mts';
import { Value } from '../value.mts';
import { resume } from '../helpers.mts';
import type { ParseNode } from '../parser/ParseNode.mts';
import { Assert, Call, PromiseCapabilityRecord } from './all.mts';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-async-function-objects */

/** https://tc39.es/ecma262/#sec-asyncblockstart */
export function AsyncBlockStart(promiseCapability: PromiseCapabilityRecord, asyncBody: ParseNode.AsyncBody | ParseNode.ExpressionBody | ParseNode.Module, asyncContext: ExecutionContext) {
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
  const result = EnsureCompletion(resume(asyncContext, Value.undefined));
  Assert(surroundingAgent.runningExecutionContext === runningContext);
  Assert(result.Type === 'normal' && result.Value === Value.undefined);
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start */
export function AsyncFunctionStart(promiseCapability: PromiseCapabilityRecord, asyncFunctionBody: ParseNode.AsyncBody | ParseNode.ExpressionBody) {
  const runningContext = surroundingAgent.runningExecutionContext;
  const asyncContext = runningContext.copy();
  X(AsyncBlockStart(promiseCapability, asyncFunctionBody, asyncContext));
}
