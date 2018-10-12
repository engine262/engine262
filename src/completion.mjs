import { surroundingAgent } from './engine.mjs';
import {
  Assert,
  Call,
  NewPromiseCapability,
  CreateBuiltinFunction,
  SetFunctionLength,
} from './abstract-ops/all.mjs';
import { PerformPromiseThen } from './intrinsics/PromisePrototype.mjs';
import { Value, Reference } from './value.mjs';

// #sec-completion-record-specification-type
export function Completion(type, value, target) {
  if (new.target === Completion) {
    if (typeof type !== 'string') {
      throw new TypeError('Completion type is not a string');
    }
    this.Type = type;
    this.Value = value;
    this.Target = target;
  }
  return type;
}

// #sec-normalcompletion
export class NormalCompletion {
  constructor(value) {
    return new Completion('normal', value);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'normal';
  }
}

export class AbruptCompletion {
  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type !== 'normal';
  }
}

export class BreakCompletion {
  constructor(target) {
    return new Completion('break', undefined, target);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'break';
  }
}

export class ContinueCompletion {
  constructor(target) {
    return new Completion('continue', undefined, target);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'continue';
  }
}

// #sec-normalcompletion
export class ReturnCompletion {
  constructor(value) {
    return new Completion('return', value);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'return';
  }
}

// #sec-throwcompletion
export class ThrowCompletion {
  constructor(value) {
    return new Completion('throw', value);
  }

  static [Symbol.hasInstance](v) {
    return v instanceof Completion && v.Type === 'throw';
  }
}

// #sec-updateempty
export function UpdateEmpty(completionRecord, value) {
  Assert(completionRecord instanceof Completion);
  if (completionRecord.Type === 'return' || completionRecord.Type === 'throw') {
    Assert(completionRecord.Value !== undefined);
  }
  if (completionRecord.Value !== undefined) {
    return completionRecord;
  }
  return new Completion(completionRecord.Type, value, completionRecord.Target);
}

// #sec-returnifabrupt
export function ReturnIfAbrupt() {
  throw new TypeError('ReturnIfAbrupt requires build');
}

// #sec-returnifabrupt-shorthands ? OperationName()
export const Q = ReturnIfAbrupt;

// #sec-returnifabrupt-shorthands ! OperationName()
export function X(val) {
  Assert(!(val instanceof AbruptCompletion));
  if (val instanceof Completion) {
    return val.Value;
  }
  return val;
}

// #sec-ifabruptrejectpromise
export function IfAbruptRejectPromise() {
  throw new TypeError('IfAbruptRejectPromise requires build');
}

export function EnsureCompletion(val) {
  if (val instanceof Completion) {
    return val;
  }
  if (val instanceof Reference) {
    return val;
  }
  return new NormalCompletion(val);
}

function AwaitFulfilledFunctions([value]) {
  const F = surroundingAgent.activeFunctionObject;
  const asyncContext = F.AsyncContext;
  const prevContext = surroundingAgent.runningExecutionContext;
  // Suspend prevContext
  surroundingAgent.executionContextStack.push(asyncContext);
  asyncContext.codeEvaluationState.next(new NormalCompletion(value));
  Assert(surroundingAgent.runningExecutionContext === prevContext);
  return Value.undefined;
}

function AwaitRejectedFunctions([reason]) {
  const F = surroundingAgent.activeFunctionObject;
  const asyncContext = F.AsyncContext;
  const prevContext = surroundingAgent.runningExecutionContext;
  // Suspend prevContext
  surroundingAgent.executionContextStack.push(asyncContext);
  asyncContext.codeEvaluationState.next(new ThrowCompletion(reason));
  Assert(surroundingAgent.runningExecutionContext === prevContext);
  return Value.undefined;
}

export function* Await(promise) {
  const asyncContext = surroundingAgent.runningExecutionContext;
  const promiseCapability = NewPromiseCapability(surroundingAgent.intrinsic('%Promise%'));
  X(Call(promiseCapability.Resolve, Value.undefined, [promise]));
  const stepsFulfilled = AwaitFulfilledFunctions;
  const onFulfilled = CreateBuiltinFunction(stepsFulfilled, ['AsyncContext']);
  X(SetFunctionLength(onFulfilled, new Value(1)));
  onFulfilled.AsyncContext = asyncContext;
  const stepsRejected = AwaitRejectedFunctions;
  const onRejected = CreateBuiltinFunction(stepsRejected, ['AsyncContext']);
  X(SetFunctionLength(onRejected, new Value(1)));
  onRejected.AsyncContext = asyncContext;
  X(PerformPromiseThen(promiseCapability.Promise, onFulfilled, onRejected));
  surroundingAgent.executionContextStack.pop();
  const completion = yield Value.undefined;
  return completion;
}
