// @ts-nocheck
import {
  Completion, EnsureCompletion, UpdateEmpty, X,
} from '../completion.mjs';
import { surroundingAgent } from '../engine.mjs';
import { Evaluate } from '../evaluator.mjs';
import { Value } from '../value.mjs';
import { resume } from '../helpers.mjs';
import { DeclarativeEnvironmentRecord } from '../environment.mjs';
import { Assert, Call, DisposeResources } from './all.mjs';

// This file covers abstract operations defined in
/** https://tc39.es/ecma262/#sec-async-function-objects */

/**
 * https://tc39.es/ecma262/#sec-asyncblockstart
 * https://arai-a.github.io/ecma262-compare/?pr=2942#sec-asyncblockstart
 * https://tc39.es/proposal-explicit-resource-management/#sec-asyncblockstart
 */
export function AsyncBlockStart(promiseCapability, asyncBody, asyncContext) {
  asyncContext.promiseCapability = promiseCapability;

  const runningContext = surroundingAgent.runningExecutionContext;
  asyncContext.codeEvaluationState = (function* resumer() {
    // a. If asyncBody is a Parse Node, then
    let result: Completion;
    if (typeof asyncBody !== 'function') {
      result = EnsureCompletion(yield* Evaluate(asyncBody));
    } else { // b. Else,
      // i. Assert: asyncBody is an Abstract Closure with no parameters
      // ii. Let result be Completion(asyncBody());
      result = EnsureCompletion(yield* asyncBody());
      // iii. If result is a normal completion, then
      if (result.Type === 'normal') {
        // 1. Set result to Completion Record { [[Type]]: return, [[Value]]: result.[[Value]], [[Target]]: empty }.
        result = new Completion({ Type: 'return', Value: result.Value, Target: undefined });
      }
    }
    // Assert: If we return here, the async function either threw an exception or performed an implicit or explicit return; all awaiting is done.
    // TODO(rbuckton): Fix spec to move these steps before asyncContext is removed from the stack
    // *. Let env be asyncContext's LexicalEnvironment.
    const env = asyncContext.LexicalEnvironment;
    // NON-SPEC, handles 'async method' support from https://arai-a.github.io/ecma262-compare/?pr=2942 as an async
    // abstract closure does not have an environment record
    // *. If env is not undefined, then
    if (env !== undefined) {
      // *. Assert: env is a Declarative Environment Record.
      Assert(env instanceof DeclarativeEnvironmentRecord);
      // *. Set result to DisposeResources(env.[[DisposeCapability]], result).
      result = yield* DisposeResources(env.DisposeCapability, result);
    }
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

/**
 * https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start
 * https://arai-a.github.io/ecma262-compare/?pr=2942#sec-async-functions-abstract-operations-async-function-start
 */
export function AsyncFunctionStart(promiseCapability, asyncFunctionBody) {
  const runningContext = surroundingAgent.runningExecutionContext;
  const asyncContext = runningContext.copy();
  X(AsyncBlockStart(promiseCapability, asyncFunctionBody, asyncContext));
}
