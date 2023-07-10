import { type GCMarker, surroundingAgent } from './engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  PerformPromiseThen,
  PromiseCapabilityRecord,
  PromiseResolve,
  type NativeFunctionSteps,
} from './abstract-ops/all.mjs';
import { Value } from './value.mjs';
import { callable, kAsyncContext, resume } from './helpers.mjs';

export type CompletionType = 'normal' | 'break' | 'continue' | 'return' | 'throw';
export interface CompletionRecord<T> {
  readonly Target: string | undefined;
  readonly Type: CompletionType;
  readonly Value: T;
}
export interface NormalCompletionRecord<T> extends CompletionRecord<T> {
  readonly Type: 'normal';
  readonly Value: T;
  readonly Target: undefined;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */ // @ts-expect-error
export declare function Completion<T>(_init: NormalCompletion<T>): NormalCompletion<T> // @ts-expect-error
export declare function Completion<T>(_init: Completion<T>): Completion<T>
/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export @callable((_CompletionClass, _thisValue, [init]) => {
  // 1. Assert: completionRecord is a Completion Record.
  Assert(init instanceof Completion);
  // 2. Return completionRecord as the Completion Record of this abstract operation.
  return init;
}) // @ts-expect-error
class Completion<T = unknown> {
  constructor(init: CompletionRecord<T>) {
    this.Type = init.Type;
    this.Value = init.Value;
    this.Target = init.Target;
  }

  readonly Type: CompletionType;
  readonly Value: T;
  readonly Target: string | undefined;

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Value);
  }
}

/** https://tc39.es/ecma262/#sec-normalcompletion */
export interface NormalCompletion<T> extends Completion<T> {
  readonly Type: 'normal';
  readonly Target: undefined;
}
export function NormalCompletion<T>(argument: T): NormalCompletion<T> {
  // 1. Return Completion { [[Type]]: normal, [[Value]]: argument, [[Target]]: empty }.
  return new Completion({ Type: 'normal', Value: argument, Target: undefined }) as NormalCompletion<T>;
}

Object.defineProperty(NormalCompletion, Symbol.hasInstance, {
  value: function hasInstance(v: unknown) {
    return v instanceof Completion && v.Type === 'normal';
  },
  writable: true,
  enumerable: false,
  configurable: true,
});

export abstract class AbruptCompletion<T> extends Completion<T> {
  private constructor() {
    Assert(false, 'AbruptCompletion is not a real class.');
    super(null!);
  }

  declare readonly Type: 'break' | 'continue' | 'return' | 'throw';
  declare readonly Target: string | undefined;
  declare readonly Value: T;
  static [Symbol.hasInstance](v: unknown) {
    return v instanceof Completion && v.Type !== 'normal';
  }
}

export interface ThrowCompletion<T = unknown> extends Completion<T> {
  readonly Type: 'throw';
  readonly Target: undefined;
}
/** https://tc39.es/ecma262/#sec-throwcompletion */
export function ThrowCompletion<T>(argument: T): ThrowCompletion<T> {
  // 1. Return Completion { [[Type]]: throw, [[Value]]: argument, [[Target]]: empty }.
  return new Completion({ Type: 'throw', Value: argument, Target: undefined }) as ThrowCompletion<T>;
}

/** https://tc39.es/ecma262/#sec-updateempty */
export function UpdateEmpty<T, Q>(completionRecord: Completion<Q>, value: T): Completion<T | Q> {
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

/**
 * https://tc39.es/ecma262/#sec-returnifabrupt
 * https://tc39.es/ecma262/#sec-returnifabrupt-shorthands ? OperationName()
 */
export function ReturnIfAbrupt<T>(_completion: Completion<T> | T): T
export function ReturnIfAbrupt<T, Q>(_completion: Completion<T> | Q): T | Q
export function ReturnIfAbrupt<T>(_completion: Completion<T> | T): never {
  /* c8 skip next */
  throw new TypeError('ReturnIfAbrupt requires build');
}

export { ReturnIfAbrupt as Q };

/** https://tc39.es/ecma262/#sec-returnifabrupt-shorthands ! OperationName() */
export function X<T>(_completion: NormalCompletion<T> | AbruptCompletion<unknown>): T
export function X<T>(_completion: NormalCompletion<T> | AbruptCompletion<unknown>): T
export function X<T>(_completion: T): T
export function X<T, Q>(_completion: NormalCompletion<T> | AbruptCompletion<unknown> | Q): T | Q
export function X(_completion: unknown): never {
  /* c8 skip next */
  throw new TypeError('X() requires build');
}

/** https://tc39.es/ecma262/#sec-ifabruptcloseiterator */
// TODO(TS):
export function IfAbruptCloseIterator(_value: Completion, _iteratorRecord: unknown) {
  /* c8 skip next */
  throw new TypeError('IfAbruptCloseIterator() requires build');
}

/** https://tc39.es/ecma262/#sec-ifabruptrejectpromise */
export function IfAbruptRejectPromise(_value: Completion, _capability: PromiseCapabilityRecord) {
  /* c8 skip next */
  throw new TypeError('IfAbruptRejectPromise requires build');
}

export function EnsureCompletion<T>(val: T | Completion<T>): Completion<T> {
  if (val instanceof Completion) {
    return val;
  }
  return NormalCompletion(val);
}

export function* Await(value: Value): Generator<Value, Completion<Value>, Completion<Value>> {
  // 1. Let asyncContext be the running execution context.
  const asyncContext = surroundingAgent.runningExecutionContext;
  // 2. Let promise be ? PromiseResolve(%Promise%, value).
  const promise = ReturnIfAbrupt(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value));
  // 3. Let fulfilledClosure be a new Abstract Closure with parameters (value) that captures asyncContext and performs the following steps when called:
  const fulfilledClosure: NativeFunctionSteps = ([valueInner = Value.undefined]) => {
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
  const onFulfilled = X(CreateBuiltinFunction(fulfilledClosure, 1, Value(''), []));
  // @ts-expect-error TODO(ts): CreateBuiltinFunction should return a specalized type FunctionObjectValue that has a kAsyncContext on it.
  onFulfilled[kAsyncContext] = asyncContext;
  // 5. Let rejectedClosure be a new Abstract Closure with parameters (reason) that captures asyncContext and performs the following steps when called:
  const rejectedClosure: NativeFunctionSteps = ([reason = Value.undefined]) => {
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
  const onRejected = X(CreateBuiltinFunction(rejectedClosure, 1, Value(''), []));
  // @ts-expect-error TODO(ts): CreateBuiltinFunction should return a specalized type FunctionObjectValue that has a kAsyncContext on it.
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
