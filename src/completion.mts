import { type GCMarker, surroundingAgent } from './engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  PerformPromiseThen,
  PromiseCapabilityRecord,
  PromiseResolve,
} from './abstract-ops/all.mjs';
import { JSStringValue, Value } from './value.mjs';
import {
  kAsyncContext,
  resume,
} from './helpers.mjs';

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
interface NormalCompletionInit<T> {
  readonly Type: 'normal';
  readonly Value: T;
  readonly Target: undefined;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
interface BreakCompletionInit<T> {
  readonly Type: 'break';
  readonly Value: T;
  readonly Target: JSStringValue | undefined;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
interface ContinueCompletionInit<T> {
  readonly Type: 'continue';
  readonly Value: T;
  readonly Target: JSStringValue | undefined;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
interface ReturnCompletionInit {
  readonly Type: 'return';
  readonly Value: Value;
  readonly Target: undefined;
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
interface ThrowCompletionInit {
  readonly Type: 'throw';
  readonly Value: Value;
  readonly Target: undefined;
}

type CompletionInit<T> =
  | NormalCompletionInit<T>
  | BreakCompletionInit<T>
  | ContinueCompletionInit<T>
  | ReturnCompletionInit
  | ThrowCompletionInit;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export class CompletionRecord<C extends CompletionInit<any>> {
  readonly Type: C["Type"];
  readonly Value: C["Value"];
  readonly Target: C["Target"];

  constructor(init: C) {
    this.Type = init.Type;
    this.Value = init.Value;
    this.Target = init.Target;
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Value);
  }
}

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > - _normal completion_ refers to any Completion Record with a [[Type]] value of `normal`.
 */
export type NormalCompletion<T> = CompletionRecord<NormalCompletionInit<T>>;

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > - _break completion_ refers to any Completion Record with a [[Type]] value of `break`.
 */
export type BreakCompletion<T> = CompletionRecord<BreakCompletionInit<T>>;

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > - _continue completion_ refers to any Completion Record with a [[Type]] value of `continue`.
 */
export type ContinueCompletion<T> = CompletionRecord<ContinueCompletionInit<T>>;

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > - _return completion_ refers to any Completion Record with a [[Type]] value of `return`.
 */
export type ReturnCompletion = CompletionRecord<ReturnCompletionInit>;

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > - _throw completion_ refers to any Completion Record with a [[Type]] value of `throw`.
 */
export type ThrowCompletion = CompletionRecord<ThrowCompletionInit>;

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > _abrupt completion_ refers to any Completion Record with a [[Type]] value other than `normal`.
 */
export type AbruptCompletion<T = unknown> =
  | ThrowCompletion
  | ReturnCompletion
  | BreakCompletion<T>
  | ContinueCompletion<T>;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export type Completion<T = unknown> =
  | NormalCompletion<T>
  | AbruptCompletion<T>;

/** https://tc39.es/ecma262/#sec-completion-ao */
export function Completion<T extends Completion<unknown>>(completionRecord: T): T {
  // 1. Assert: completionRecord is a Completion Record.
  Assert(completionRecord instanceof CompletionRecord);
  // 2. Return completionRecord as the Completion Record of this abstract operation.
  return completionRecord;
}

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > _normal completion_ refers to any Completion Record with a [[Type]] value of `normal`.
 */
export function isNormalCompletion(value: unknown): value is NormalCompletion<unknown> {
  return value instanceof CompletionRecord && value.Type === 'normal';
}

/** @deprecated Use `value.Type === 'normal'` or `isNormalCompletion(value)` instead of `value instanceof NormalCompletion` */
Object.defineProperty(NormalCompletion, Symbol.hasInstance, { configurable: true, value: isNormalCompletion });

/**
 * https://tc39.es/ecma262/#sec-completion-record-specification-type
 *
 * > _abrupt completion_ refers to any Completion Record with a [[Type]] value other than `normal`.
 */
export function isAbruptCompletion(value: unknown): value is AbruptCompletion<unknown> {
  return value instanceof CompletionRecord && value.Type !== 'normal';
}

/** @deprecated Use `value.Type !== 'normal'` or `isAbruptCompletion(value)` instead of `value instanceof AbruptCompletion` */
export const AbruptCompletion = { [Symbol.hasInstance]: isAbruptCompletion };

/** https://tc39.es/ecma262/#sec-normalcompletion */
export function NormalCompletion<T>(value: T): NormalCompletion<T> {
  // 1. Return Completion Record { [[Type]]: normal, [[Value]]: value, [[Target]]: empty }.
  return new CompletionRecord({ Type: 'normal', Value: value, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-throwcompletion */
export function ThrowCompletion(value: Value): ThrowCompletion {
  // 1. Return Completion Record { [[Type]]: throw, [[Value]]: value, [[Target]]: empty }.
  return new CompletionRecord({ Type: 'throw', Value: value, Target: undefined });
}

/** https://tc39.es/ecma262/#sec-updateempty */
export type UpdateEmpty<T extends Completion<unknown>, U> =
  T extends NormalCompletion<infer V> ? NormalCompletion<V extends undefined ? U : V> :
  T extends BreakCompletion<infer V> ? BreakCompletion<V extends undefined ? U : V> :
  T extends ContinueCompletion<infer V> ? ContinueCompletion<V extends undefined ? U : V> :
  T extends AbruptCompletion ? T :
  T extends ReturnCompletion ? T :
  never;

/** https://tc39.es/ecma262/#sec-updateempty */
export function UpdateEmpty<C extends Completion, const T>(completionRecord: C, value: T): UpdateEmpty<C, T>;
export function UpdateEmpty<C extends Completion, const T>(completionRecord: C, value: T) {
  // 1. Assert: If completionRecord.[[Type]] is either return or throw, then completionRecord.[[Value]] is not empty.
  Assert(!(completionRecord.Type === 'return' || completionRecord.Type === 'throw') || completionRecord.Value !== undefined);
  // 2. If completionRecord.[[Value]] is not empty, return Completion(completionRecord).
  if (completionRecord.Value !== undefined) {
    return Completion(completionRecord);
  }
  // 3. Return Completion Record { [[Type]]: completionRecord.[[Type]], [[Value]]: value, [[Target]]: completionRecord.[[Target]] }.
  return new CompletionRecord({ Type: completionRecord.Type, Value: value, Target: completionRecord.Target } as unknown as CompletionInit<unknown>); // NOTE: unsound cast
}

/** https://tc39.es/ecma262/#sec-returnifabrupt */
export type ReturnIfAbrupt<T> =
  T extends NormalCompletion<infer V> ? V :
  T extends AbruptCompletion ? never :
  T;

/**
 * https://tc39.es/ecma262/#sec-returnifabrupt
 * https://tc39.es/ecma262/#sec-returnifabrupt-shorthands ? OperationName()
 */
export function ReturnIfAbrupt<const T>(_completion: T): ReturnIfAbrupt<T> {
  /* c8 skip next */
  throw new TypeError('ReturnIfAbrupt requires build');
}

export { ReturnIfAbrupt as Q };

/** https://tc39.es/ecma262/#sec-returnifabrupt-shorthands ! OperationName() */
export function X<const T>(_completion: T): ReturnIfAbrupt<T> {
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

/** https://tc39.es/ecma262/#sec-implicit-normal-completion */
export type EnsureCompletion<T> = EnsureCompletionWorker<T, T>;

// Distribute over `T`s that are `Completion`s, but don't distribute over `T`s that aren't `Completion`s
type EnsureCompletionWorker<T, _T> = T extends Completion ? T : NormalCompletion<Exclude<_T, Completion>>;

/** https://tc39.es/ecma262/#sec-implicit-normal-completion */
export function EnsureCompletion<const T>(val: T): EnsureCompletion<T>;
export function EnsureCompletion<const T>(val: T) {
  if (val instanceof CompletionRecord) {
    return val;
  }
  return NormalCompletion(val);
}

export function* Await(value: Value): Generator<Value, Completion, Completion> {
  // 1. Let asyncContext be the running execution context.
  const asyncContext = surroundingAgent.runningExecutionContext;
  // 2. Let promise be ? PromiseResolve(%Promise%, value).
  const promise = ReturnIfAbrupt(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value));
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
  const onFulfilled = X(CreateBuiltinFunction(fulfilledClosure, 1, Value(''), []));
  // @ts-expect-error TODO(ts): CreateBuiltinFunction should return a specalized type FunctionObjectValue that has a kAsyncContext on it.
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
