import { type GCMarker, surroundingAgent } from './engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  PerformPromiseThen,
  PromiseCapabilityRecord,
  PromiseResolve,
  type PromiseObjectValue,
} from './abstract-ops/all.mjs';
import { JSStringValue, Value } from './value.mjs';
import {
  callable,
  kAsyncContext,
  OutOfRange,
  resume,
} from './helpers.mjs';

let createNormalCompletion: <T>(init: NormalCompletionInit<T>) => NormalCompletionImpl<T>;
let createBreakCompletion: <T>(init: BreakCompletionInit<T>) => BreakCompletion<T>;
let createContinueCompletion: <T>(init: ContinueCompletionInit<T>) => ContinueCompletion<T>;
let createReturnCompletion: (init: ReturnCompletionInit) => ReturnCompletion;
let createThrowCompletion: (init: ThrowCompletionInit) => ThrowCompletionImpl;

type NormalCompletionInit<T> = Pick<NormalCompletion<T>, 'Type' | 'Value' | 'Target'>;

type BreakCompletionInit<T> = Pick<BreakCompletion<T>, 'Type' | 'Value' | 'Target'>;

type ContinueCompletionInit<T> = Pick<ContinueCompletion<T>, 'Type' | 'Value' | 'Target'>;

type ReturnCompletionInit = Pick<ReturnCompletion, 'Type' | 'Value' | 'Target'>;

type ThrowCompletionInit = Pick<ThrowCompletion, 'Type' | 'Value' | 'Target'>;

type AbruptCompletionInit<T> =
  | BreakCompletionInit<T>
  | ContinueCompletionInit<T>
  | ReturnCompletionInit
  | ThrowCompletionInit;

type CompletionInit<T> =
  | NormalCompletionInit<T>
  | AbruptCompletionInit<T>;

@callable((_target, _thisArg, [completionRecord]) => {
  // 1. Assert: completionRecord is a Completion Record.
  Assert(completionRecord instanceof Completion);
  // 2. Return completionRecord as the Completion Record of this abstract operation.
  return completionRecord;
})
class CompletionImpl<const T> {
  declare readonly Type: 'normal' | 'break' | 'continue' | 'return' | 'throw';
  readonly Value!: T | Value;
  readonly Target!: JSStringValue | undefined;

  constructor(init: CompletionInit<T>) {
    if (new.target === CompletionImpl) {
      switch (init.Type) {
        case 'normal':
          return createNormalCompletion(init);
        case 'break':
          return createBreakCompletion(init);
        case 'continue':
          return createContinueCompletion(init);
        case 'return':
          return createReturnCompletion(init) as CompletionImpl<T>;
        case 'throw':
          return createThrowCompletion(init) as CompletionImpl<T>;
        default:
          throw new OutOfRange('new Completion', init);
      }
    }

    const { Type, Value, Target } = init;
    Assert(new.target.prototype.Type === Type);
    this.Value = Value;
    this.Target = Target;
  }

  // NON-SPEC
  mark(m: GCMarker) {
    m(this.Value);
  }

  static {
    Object.defineProperty(this, 'name', { value: 'Completion' });
  }
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export type Completion<T = unknown> =
  | NormalCompletion<T>
  | AbruptCompletion<T>;

/** https://tc39.es/ecma262/#sec-completion-ao */
export const Completion = CompletionImpl as {
  /** https://tc39.es/ecma262/#sec-completion-ao */
  <T extends Completion<unknown>>(completionRecord: T): T;

  /** https://tc39.es/ecma262/#sec-completion-record-specification-type */
  new <const T>(completion: { Type: 'normal', Value: T, Target: undefined }): NormalCompletion<T>;
  new <const T>(completion: { Type: 'break', Value: T, Target: JSStringValue | undefined }): BreakCompletion<T>;
  new <const T>(completion: { Type: 'continue', Value: T, Target: JSStringValue | undefined }): ContinueCompletion<T>;
  new (completion: { Type: 'return', Value: Value, Target: undefined }): ReturnCompletion;
  new (completion: { Type: 'throw', Value: Value, Target: undefined }): ThrowCompletion;
  readonly prototype: CompletionImpl<unknown>;
};

@callable((_target, _thisArg, [value]) => { // eslint-disable-line arrow-body-style -- Preserve algorithm steps comments
  // 1. Return Completion { [[Type]]: normal, [[Value]]: value, [[Target]]: empty }.
  return new Completion({ Type: 'normal', Value: value, Target: undefined });
})
class NormalCompletionImpl<const T> extends CompletionImpl<T> {
  declare readonly Type: 'normal';
  declare readonly Value: T;
  declare readonly Target: undefined;

  private constructor(init: NormalCompletionInit<T>) { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super(init);
  }

  static {
    Object.defineProperty(this, 'name', { value: 'NormalCompletion' });
    Object.defineProperty(this.prototype, 'Type', { value: 'normal' });
    createNormalCompletion = (init) => new NormalCompletionImpl(init);
  }
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export type NormalCompletion<T> = NormalCompletionImpl<T>;

/** https://tc39.es/ecma262/#sec-normalcompletion */
export const NormalCompletion = NormalCompletionImpl as typeof NormalCompletionImpl & {
  /** https://tc39.es/ecma262/#sec-normalcompletion */
  <const T>(value: T): NormalCompletion<T>;
};

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export type AbruptCompletion<T = unknown> =
  | ThrowCompletion
  | ReturnCompletion
  | BreakCompletion<T>
  | ContinueCompletion<T>;

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export const AbruptCompletion = (() => {
  abstract class AbruptCompletion<const T> extends CompletionImpl<T | Value> {
    declare readonly Type: 'break' | 'continue' | 'return' | 'throw';
    declare readonly Value: T | Value;
    declare readonly Target: JSStringValue | undefined;

    constructor(init: AbruptCompletionInit<T>) { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
      super(init);
    }

    static {
      Object.defineProperty(this, 'name', { value: 'AbruptCompletion' });
    }
  }

  return AbruptCompletion;
})();

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export class BreakCompletion<const T> extends AbruptCompletion<T> {
  declare readonly Type: 'break';
  declare readonly Value: T;

  private constructor(init: BreakCompletionInit<T>) { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super(init);
  }

  static {
    Object.defineProperty(this, 'name', { value: 'BreakCompletion' });
    Object.defineProperty(this.prototype, 'Type', { value: 'break' });
    createBreakCompletion = (init) => new BreakCompletion(init);
  }
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export class ContinueCompletion<const T> extends AbruptCompletion<T> {
  declare readonly Type: 'continue';
  declare readonly Value: T;
  declare readonly Target: JSStringValue | undefined;

  private constructor(init: ContinueCompletionInit<T>) { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super(init);
  }

  static {
    Object.defineProperty(this, 'name', { value: 'ContinueCompletion' });
    Object.defineProperty(this.prototype, 'Type', { value: 'continue' });
    createContinueCompletion = (init) => new ContinueCompletion(init);
  }
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export class ReturnCompletion extends AbruptCompletion<Value> {
  declare readonly Type: 'return';
  declare readonly Value: Value;
  declare readonly Target: undefined;

  private constructor(init: ReturnCompletionInit) { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super(init);
  }

  static {
    Object.defineProperty(this, 'name', { value: 'ReturnCompletion' });
    Object.defineProperty(this.prototype, 'Type', { value: 'return' });
    createReturnCompletion = (init) => new ReturnCompletion(init);
  }
}

@callable((_target, _thisArg, [value]) => {
  Assert(value instanceof Value);
  // 1. Return Completion { [[Type]]: throw, [[Value]]: value, [[Target]]: empty }.
  return new Completion({ Type: 'throw', Value: value as Value, Target: undefined });
})
class ThrowCompletionImpl extends AbruptCompletion<Value> {
  declare readonly Type: 'throw';
  declare readonly Value: Value;
  declare readonly Target: undefined;

  private constructor(init: Pick<ThrowCompletionImpl, 'Type' | 'Value' | 'Target'>) { // eslint-disable-line no-useless-constructor -- Sets privacy for constructor
    super(init);
  }

  static {
    Object.defineProperty(this, 'name', { value: 'ThrowCompletion' });
    Object.defineProperty(this.prototype, 'Type', { value: 'throw' });
    createThrowCompletion = (init) => new ThrowCompletionImpl(init);
  }
}

/** https://tc39.es/ecma262/#sec-completion-record-specification-type */
export type ThrowCompletion = ThrowCompletionImpl;

/** https://tc39.es/ecma262/#sec-throwcompletion */
export const ThrowCompletion = ThrowCompletionImpl as typeof ThrowCompletionImpl & {
  /** https://tc39.es/ecma262/#sec-throwcompletion */
  (value: Value): ThrowCompletion;
};

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
  // 3. Return Completion { [[Type]]: completionRecord.[[Type]], [[Value]]: value, [[Target]]: completionRecord.[[Target]] }.
  return new CompletionImpl({ Type: completionRecord.Type, Value: value, Target: completionRecord.Target } as unknown as CompletionInit<unknown>); // NOTE: unsound cast
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

export type EnsureCompletion<T> = EnsureCompletionWorker<T, T>;

// Distribute over `T`s that are `Completion`s, but don't distribute over `T`s that aren't `Completion`s
type EnsureCompletionWorker<T, _T> = T extends Completion ? T : NormalCompletion<Exclude<_T, Completion>>;

/** https://tc39.es/ecma262/#sec-implicit-normal-completion */
export function EnsureCompletion<const T>(val: T): EnsureCompletion<T>;
export function EnsureCompletion<const T>(val: T) {
  if (val instanceof Completion) {
    return val;
  }
  return NormalCompletion(val);
}

export function* Await(value: Value): Generator<Value, Completion, Completion> {
  // 1. Let asyncContext be the running execution context.
  const asyncContext = surroundingAgent.runningExecutionContext;
  // 2. Let promise be ? PromiseResolve(%Promise%, value).
  const promise = ReturnIfAbrupt(PromiseResolve(surroundingAgent.intrinsic('%Promise%'), value) as PromiseObjectValue);
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
