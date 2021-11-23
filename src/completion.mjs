import { surroundingAgent } from './engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  PerformPromiseThen,
  PromiseResolve,
} from './abstract-ops/all.mjs';
import { Value } from './value.mjs';
import { kAsyncContext, resume } from './helpers.mjs';

// #sec-completion-record-specification-type
export function Completion(init) {
  if (new.target === undefined) {
    // 1. Assert: completionRecord is a Completion Record.
    Assert(init instanceof Completion);
    // 2. Return completionRecord as the Completion Record of this abstract operation.
    return init;
  }

  this.Type = init.Type;
  this.Value = init.Value;
  this.Target = init.Target;
}

// NON-SPEC
Completion.prototype.mark = function mark(m) {
  m(this.Value);
};

// #sec-normalcompletion
export function NormalCompletion(argument) {
  // 1. Return Completion { [[Type]]: normal, [[Value]]: argument, [[Target]]: empty }.
  return new Completion({ Type: 'normal', Value: argument, Target: undefined });
}

Object.defineProperty(NormalCompletion, Symbol.hasInstance, {
  value: function hasInstance(v) {
    return v instanceof Completion && v.Type === 'normal';
  },
  writable: true,
  enumerable: false,
  configurable: true,
});

export class AbruptCompletion {
  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type !== 'normal';
  }
}

// #sec-throwcompletion
export function ThrowCompletion(argument) {
  // 1. Return Completion { [[Type]]: throw, [[Value]]: argument, [[Target]]: empty }.
  return new Completion({ Type: 'throw', Value: argument, Target: undefined });
}

// 6.2.3.4 #sec-updateempty
export function UpdateEmpty(completionRecord, value) {
  Assert(completionRecord instanceof Completion);
  // 1. Assert: If completionRecord.[[Type]] is either return or throw, then completionRecord.[[Value]] is not empty.
  Assert(!(completionRecord.Type === 'return' || completionRecord.Type === 'throw') || completionRecord.Value !== undefined);
  // 2. If completionRecord.[[Value]] is not empty, return Completion(completionRecord).
  if (completionRecord.Value !== undefined) {
    return Completion(completionRecord);
  }
  // 3. Return Completion { [[Type]]: completionRecord.[[Type]], [[Value]]: value, [[Target]]: completionRecord.[[Target]] }.
  return new Completion({ Type: completionRecord.Type, Value: value, Target: completionRecord.Target });
}

// #sec-returnifabrupt
export function ReturnIfAbrupt(_completion) {
  /* c8 skip next */
  throw new TypeError('ReturnIfAbrupt requires build');
}

// #sec-returnifabrupt-shorthands ? OperationName()
export const Q = ReturnIfAbrupt;

// #sec-returnifabrupt-shorthands ! OperationName()
export function X(_completion) {
  /* c8 skip next */
  throw new TypeError('X() requires build');
}

// 25.6.1.1.1 #sec-ifabruptrejectpromise
export function IfAbruptRejectPromise(_value, _capability) {
  /* c8 skip next */
  throw new TypeError('IfAbruptRejectPromise requires build');
}

export function EnsureCompletion(val) {
  if (val instanceof Completion) {
    return val;
  }
  return NormalCompletion(val);
}

export function* Await(value) {
  // 1. Let asyncContext be the running execution context.
  const asyncContext = surroundingAgent.runningExecutionContext;
  // 2. Let promise be ? PromiseResolve(%Promise%, value).
  const promise = Q(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value));
  // 3. Let fulfilledClosure be a new Abstract Closure with parameters (value) that captures asyncContext and performs the following steps when called:
  const fulfilledClosure = ([valueInner = Value.undefined]) => {
    // a. Let prevContext be the running execution context.
    const prevContext = surroundingAgent.runningExecutionContext;
    // b. Suspend prevContext.
    // c. Push asyncContext onto the execution context stack; asyncContext is now the running execution context.
    surroundingAgent.executionContextStack.push(asyncContext);
    // d. Resume the suspended evaluation of asyncContext using NormalCompletion(value) as the result of the operation that suspended it.
    resume(asyncContext, NormalCompletion(valueInner));
    // e. Assert: When we reach this step, asyncContext has already been removed from the execution context stack and prevContext is the currently running execution context.
    Assert(surroundingAgent.runningExecutionContext === prevContext);
    // f. Return undefined.
    return Value.undefined;
  };
  // 4. Let onFulfilled be ! CreateBuiltinFunction(fulfilledClosure, 1, "", « »).
  const onFulfilled = X(CreateBuiltinFunction(fulfilledClosure, 1, new Value(''), []));
  onFulfilled[kAsyncContext] = asyncContext;
  // 5. Let rejectedClosure be a new Abstract Closure with parameters (reason) that captures asyncContext and performs the following steps when called:
  const rejectedClosure = ([reason = Value.undefined]) => {
    // a. Let prevContext be the running execution context.
    const prevContext = surroundingAgent.runningExecutionContext;
    // b. Suspend prevContext.
    // c. Push asyncContext onto the execution context stack; asyncContext is now the running execution context.
    surroundingAgent.executionContextStack.push(asyncContext);
    // d. Resume the suspended evaluation of asyncContext using ThrowCompletion(reason) as the result of the operation that suspended it.
    resume(asyncContext, ThrowCompletion(reason));
    // e. Assert: When we reach this step, asyncContext has already been removed from the execution context stack and prevContext is the currently running execution context.
    Assert(surroundingAgent.runningExecutionContext === prevContext);
    // f. Return undefined.
    return Value.undefined;
  };
  // 6. Let onRejected be ! CreateBuiltinFunction(rejectedClosure, 1, "", « »).
  const onRejected = X(CreateBuiltinFunction(rejectedClosure, 1, new Value(''), []));
  onRejected[kAsyncContext] = asyncContext;
  // 7. Perform ! PerformPromiseThen(promise, onFulfilled, onRejected).
  X(PerformPromiseThen(promise, onFulfilled, onRejected));
  // 8. Remove asyncContext from the execution context stack and restore the execution context that is at the top of the execution context stack as the running execution context.
  surroundingAgent.executionContextStack.pop(asyncContext);
  // 9. Set the code evaluation state of asyncContext such that when evaluation is resumed with a Completion completion, the following steps of the algorithm that invoked Await will be performed, with completion available.
  const completion = yield Value.undefined;
  // 10. Return.
  return completion;
  // 11. NOTE: This returns to the evaluation of the operation that had most previously resumed evaluation of asyncContext.
}
