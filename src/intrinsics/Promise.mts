import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  BooleanValue,
  Descriptor,
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import {
  Assert,
  Call,
  CreateArrayFromList,
  CreateBuiltinFunction,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  CreateResolvingFunctions,
  DefinePropertyOrThrow,
  Get,
  GetIterator,
  Invoke,
  IsCallable,
  IsConstructor,
  IteratorClose,
  NewPromiseCapability,
  OrdinaryObjectCreate,
  OrdinaryCreateFromConstructor,
  PromiseCapabilityRecord,
  PromiseResolve,
  PromiseReactionRecord,
  type FunctionObject,
  Realm,
  type IteratorRecord,
  type OrdinaryObject,
  type PromiseAllResolveElementFunctionObject,
  type PromiseAllRejectElementFunctionObject,
  IteratorStepValue,
} from '../abstract-ops/all.mts';
import {
  AbruptCompletion,
  IfAbruptRejectPromise,
  EnsureCompletion,
  Q, X,
  type ValueEvaluator,
  type ValueCompletion,
} from '../completion.mts';
import { __ts_cast__, type Mutable } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#table-internal-slots-of-promise-instances */
export interface PromiseObject extends OrdinaryObject {
  PromiseState: 'pending' | 'fulfilled' | 'rejected';
  PromiseResult: Value | undefined;
  PromiseFulfillReactions: undefined | PromiseReactionRecord[];
  PromiseRejectReactions: undefined | PromiseReactionRecord[];
  PromiseIsHandled: BooleanValue;
}

export function isPromiseObject(value: Value): value is PromiseObject {
  return 'PromiseState' in value;
}

/** https://tc39.es/ecma262/#sec-promise-executor */
function* PromiseConstructor(this: FunctionObject, [executor = Value.undefined]: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  // 1. If NewTarget is undefined, throw a TypeError exception.
  if (NewTarget instanceof UndefinedValue) {
    return surroundingAgent.Throw('TypeError', 'ConstructorNonCallable', this);
  }
  // 2. If IsCallable(executor) is false, throw a TypeError exception.
  if (!IsCallable(executor)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', executor);
  }
  // 3. Let promise be ? OrdinaryCreateFromConstructor(NewTarget, "%Promise.prototype%", « [[PromiseState]], [[PromiseResult]], [[PromiseFulfillReactions]], [[PromiseRejectReactions]], [[PromiseIsHandled]] »).
  const promise = Q(yield* OrdinaryCreateFromConstructor(NewTarget, '%Promise.prototype%', [
    'PromiseState',
    'PromiseResult',
    'PromiseFulfillReactions',
    'PromiseRejectReactions',
    'PromiseIsHandled',
  ])) as Mutable<PromiseObject>;
  // 4. Set promise.[[PromiseState]] to pending.
  promise.PromiseState = 'pending';
  // 5. Set promise.[[PromiseFulfillReactions]] to a new empty List.
  promise.PromiseFulfillReactions = [];
  // 6. Set promise.[[PromiseFulfillReactions]] to a new empty List.
  promise.PromiseRejectReactions = [];
  // 7. Set promise.[[PromiseIsHandled]] to false.
  promise.PromiseIsHandled = Value.false;
  // 8. Let resolvingFunctions be CreateResolvingFunctions(promise).
  const resolvingFunctions = CreateResolvingFunctions(promise);
  // 9. Let completion be Call(executor, undefined, « resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] »).
  const completion = yield* Call(executor, Value.undefined, [
    resolvingFunctions.Resolve, resolvingFunctions.Reject,
  ]);
  // 10. If completion is an abrupt completion, then
  if (completion instanceof AbruptCompletion) {
    // a. Perform ? Call(resolvingFunctions.[[Reject]], undefined, « completion.[[Value]] »).
    Q(yield* Call(resolvingFunctions.Reject, Value.undefined, [completion.Value]));
  }
  // 11. Return promise.
  return promise;
}

/** https://tc39.es/ecma262/#sec-getpromiseresolve */
function* GetPromiseResolve(promiseConstructor: FunctionObject) {
  // 1. Assert: IsConstructor(promiseConstructor) is true.
  Assert(IsConstructor(promiseConstructor));
  // 2. Let promiseResolve be ? Get(promiseConstructor, "resolve").
  const promiseResolve = Q(yield* Get(promiseConstructor, Value('resolve')));
  // 3. If IsCallable(promiseResolve) is false, throw a TypeError exception.
  if (!IsCallable(promiseResolve)) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', promiseResolve);
  }
  // 4. Return promiseResolve.
  return promiseResolve;
}

/** https://tc39.es/ecma262/#sec-performpromiseall */
export function* PerformPromiseAll(iteratorRecord: IteratorRecord, constructor: FunctionObject, resultCapability: PromiseCapabilityRecord, promiseResolve: FunctionObject): ValueEvaluator {
  // 1. Assert: IsConstructor(constructor) is true.
  Assert(IsConstructor(constructor));
  // 2. Assert: resultCapability is a PromiseCapability Record.
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  // 3. Assert: IsCallable(promiseResolve) is true.
  Assert(IsCallable(promiseResolve));
  // 4. Let values be a new empty List.
  const values: Value[] = [];
  // 5. Let remainingElementsCount be the Record { [[Value]]: 1 }.
  const remainingElementsCount = { Value: 1 };
  // 6. Let index be 0.
  let index = 0;
  // 7. Repeat,
  while (true) {
    // a. Let next be ? IteratorStepValue(iteratorRecord).
    const next = Q(yield* IteratorStepValue(iteratorRecord));
    // d. If next is done, then
    if (next === 'done') {
      // ii. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] - 1.
      remainingElementsCount.Value -= 1;
      // iii. If remainingElementsCount.[[Value]] is 0, then
      if (remainingElementsCount.Value === 0) {
        // 1. Let valuesArray be ! CreateArrayFromList(values).
        const valuesArray = CreateArrayFromList(values);
        // 2. Perform ? Call(resultCapability.[[Resolve]], undefined, « valuesArray »).
        Q(yield* Call(resultCapability.Resolve, Value.undefined, [valuesArray]));
      }
      // iv. Return resultCapability.[[Promise]].
      return resultCapability.Promise;
    }
    // h. Append undefined to values.
    values.push(Value.undefined);
    // i. Let nextPromise be ? Call(promiseResolve, constructor, « next »).
    const nextPromise = Q(yield* Call(promiseResolve, constructor, [next]));
    const fulfilledSteps = function* PromiseAllResolveElementFunctions([x = Value.undefined]: Arguments): ValueEvaluator {
      const F = surroundingAgent.activeFunctionObject as PromiseAllResolveElementFunctionObject;
      const alreadyCalled = F.AlreadyCalled;
      if (alreadyCalled.Value === true) {
        return Value.undefined;
      }
      alreadyCalled.Value = true;
      const thisIndex = F.Index;
      values[thisIndex] = x;
      remainingElementsCount.Value -= 1;
      if (remainingElementsCount.Value === 0) {
        const valuesArray = CreateArrayFromList(values);
        return Q(yield* Call(resultCapability.Resolve, Value.undefined, [valuesArray]));
      }
      return Value.undefined;
    };
    const onFulfilled = X(CreateBuiltinFunction(fulfilledSteps, 1, Value(''), ['AlreadyCalled', 'Index'])) as Mutable<PromiseAllResolveElementFunctionObject>;
    onFulfilled.AlreadyCalled = { Value: false };
    onFulfilled.Index = index;
    index += 1;
    remainingElementsCount.Value += 1;
    Q(yield* Invoke(nextPromise, Value('then'), [onFulfilled, resultCapability.Reject]));
  }
}

/** https://tc39.es/ecma262/#sec-promise.all */
function* Promise_all([iterable = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability = Q(yield* NewPromiseCapability(C));
  __ts_cast__<FunctionObject>(C);
  // 3. Let promiseResolve be GetPromiseResolve(C).
  const promiseResolve = yield* GetPromiseResolve(C);
  // 4. IfAbruptRejectPromise(promiseResolve, promiseCapability).
  IfAbruptRejectPromise(promiseResolve, promiseCapability);
  __ts_cast__<FunctionObject>(promiseResolve);
  // 5. Let iteratorRecord be GetIterator(iterable).
  const iteratorRecord = yield* GetIterator(iterable, 'sync');
  // 6. IfAbruptRejectPromise(iteratorRecord, promiseCapability).
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  __ts_cast__<IteratorRecord>(iteratorRecord);
  // 7. Let result be PerformPromiseAll(iteratorRecord, C, promiseCapability, promiseResolve).
  let result: ValueCompletion = yield* PerformPromiseAll(iteratorRecord, C, promiseCapability, promiseResolve);
  // 8. If result is an abrupt completion, then
  if (result instanceof AbruptCompletion) {
    // a. If iteratorRecord.[[Done]] is false, set result to IteratorClose(iteratorRecord, result).
    if (iteratorRecord.Done === Value.false) {
      result = yield* IteratorClose(iteratorRecord, result);
    }
    // b. IfAbruptRejectPromise(result, promiseCapability).
    IfAbruptRejectPromise(result, promiseCapability);
  }
  // 9. Return ? result.
  return result;
}

/** https://tc39.es/ecma262/#sec-performpromiseallsettled */
function* PerformPromiseAllSettled(iteratorRecord: IteratorRecord, constructor: FunctionObject, resultCapability: PromiseCapabilityRecord, promiseResolve: FunctionObject): ValueEvaluator {
  // 1. Assert: ! IsConstructor(constructor) is true.
  Assert(IsConstructor(constructor));
  // 2. Assert: resultCapability is a PromiseCapability Record.
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  // 3. Assert: IsCallable(promiseResolve) is true.
  Assert(IsCallable(promiseResolve));
  // 4. Let values be a new empty List.
  const values: Value[] = [];
  // 5. Let remainingElementsCount be the Record { [[Value]]: 1 }.
  const remainingElementsCount = { Value: 1 };
  // 6. Let index be 0.
  let index = 0;
  // 7. Repeat,
  while (true) {
    // a. Let next be ? IteratorStepValue(iteratorRecord).
    const next = Q(yield* IteratorStepValue(iteratorRecord));
    // d. If next is done,
    if (next === 'done') {
      // ii. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] - 1.
      remainingElementsCount.Value -= 1;
      // iii. If remainingElementsCount.[[Value]] is 0, then
      if (remainingElementsCount.Value === 0) {
        // 1. Let valuesArray be ! CreateArrayFromList(values).
        const valuesArray = X(CreateArrayFromList(values));
        // 2. Perform ? Call(resultCapability.[[Resolve]], undefined, « valuesArray »).
        Q(yield* Call(resultCapability.Resolve, Value.undefined, [valuesArray]));
      }
      // iv. Return resultCapability.[[Promise]].
      return resultCapability.Promise;
    }
    // h. Append undefined to values.
    values.push(Value.undefined);
    // i. Let nextPromise be ? Call(promiseResolve, constructor, « next »).
    const nextPromise = Q(yield* Call(promiseResolve, constructor, [next]));
    // j. Let fulfilledSteps be the algorithm steps defined in Promise.allSettled Resolve Element Functions.
    const fulfilledSteps = function* PromiseAllSettledResolveElementFunctions([value = Value.undefined]: Arguments): ValueEvaluator {
      const F = surroundingAgent.activeFunctionObject as PromiseAllResolveElementFunctionObject;
      const alreadyCalled = F.AlreadyCalled;
      if (alreadyCalled.Value === true) {
        return Value.undefined;
      }
      alreadyCalled.Value = true;
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
      X(CreateDataProperty(obj, Value('status'), Value('fulfilled')));
      X(CreateDataProperty(obj, Value('value'), value));
      const thisIndex = F.Index;
      values[thisIndex] = obj;
      remainingElementsCount.Value -= 1;
      if (remainingElementsCount.Value === 0) {
        const valuesArray = CreateArrayFromList(values);
        return Q(yield* Call(resultCapability.Resolve, Value.undefined, [valuesArray]));
      }
      return Value.undefined;
    };
    // l. Let onFulfilled be ! CreateBuiltinFunction(fulfilledSteps, 1, "", « [[AlreadyCalled]], [[Index]] »).
    const onFulfilled = X(CreateBuiltinFunction(fulfilledSteps, 1, Value(''), [
      'AlreadyCalled',
      'Index',
      'Values',
      'Capability',
      'RemainingElements',
    ])) as Mutable<PromiseAllResolveElementFunctionObject>;
    // m. Let alreadyCalled be the Record { [[Value]]: false }.
    const alreadyCalled = { Value: false };
    // n. Set onFulfilled.[[AlreadyCalled]] to alreadyCalled.
    onFulfilled.AlreadyCalled = alreadyCalled;
    // o. Set onFulfilled.[[Index]] to index.
    onFulfilled.Index = index;
    // s. Let rejectedSteps be the algorithm steps defined in Promise.allSettled Reject Element Functions.
    const rejectedSteps = function* PromiseAllSettledRejectElementFunctions([error = Value.undefined]: Arguments): ValueEvaluator {
      const F = surroundingAgent.activeFunctionObject as PromiseAllResolveElementFunctionObject;
      const alreadyCalled = F.AlreadyCalled;
      if (alreadyCalled.Value === true) {
        return Value.undefined;
      }
      alreadyCalled.Value = true;
      const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
      X(CreateDataProperty(obj, Value('status'), Value('rejected')));
      X(CreateDataProperty(obj, Value('reason'), error));
      const thisIndex = F.Index;
      values[thisIndex] = obj;
      remainingElementsCount.Value -= 1;
      if (remainingElementsCount.Value === 0) {
        const valuesArray = X(CreateArrayFromList(values));
        return Q(yield* Call(resultCapability.Resolve, Value.undefined, [valuesArray]));
      }
      return Value.undefined;
    };
    // u. Let onRejected be ! CreateBuiltinFunction(rejectedSteps, 1, "", « [[AlreadyCalled]], [[Index]] »).
    const onRejected = X(CreateBuiltinFunction(rejectedSteps, 1, Value(''), ['AlreadyCalled', 'Index'])) as Mutable<PromiseAllResolveElementFunctionObject>;
    onRejected.AlreadyCalled = alreadyCalled;
    onRejected.Index = index;
    index += 1;
    remainingElementsCount.Value += 1;
    Q(yield* Invoke(nextPromise, Value('then'), [onFulfilled, onRejected]));
  }
}

/** https://tc39.es/ecma262/#sec-promise.allsettled */
function* Promise_allSettled([iterable = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability = Q(yield* NewPromiseCapability(C));
  __ts_cast__<FunctionObject>(C);
  // 3. Let promiseResolve be GetPromiseResolve(C).
  const promiseResolve = yield* GetPromiseResolve(C);
  __ts_cast__<FunctionObject>(promiseResolve);
  // 4. IfAbruptRejectPromise(promiseResolve, promiseCapability).
  IfAbruptRejectPromise(promiseResolve, promiseCapability);
  // 5. Let iteratorRecord be GetIterator(iterable).
  const iteratorRecord = yield* GetIterator(iterable, 'sync');
  // 6. IfAbruptRejectPromise(iteratorRecord, promiseCapability).
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  __ts_cast__<IteratorRecord>(iteratorRecord);
  // 7. Let result be PerformPromiseAllSettled(iteratorRecord, C, promiseCapability, promiseResolve).
  let result: ValueCompletion = yield* PerformPromiseAllSettled(iteratorRecord, C, promiseCapability, promiseResolve);
  // 8. If result is an abrupt completion, then
  if (result instanceof AbruptCompletion) {
    // a. If iteratorRecord.[[Done]] is false, set result to IteratorClose(iteratorRecord, result).
    if (iteratorRecord.Done === Value.false) {
      result = yield* IteratorClose(iteratorRecord, result);
    }
    // b. IfAbruptRejectPromise(result, promiseCapability).
    IfAbruptRejectPromise(result, promiseCapability);
  }
  // 9. Return ? result.
  return result;
}

/** https://tc39.es/ecma262/#sec-performpromiseany */
function* PerformPromiseAny(iteratorRecord: IteratorRecord, constructor: FunctionObject, resultCapability: PromiseCapabilityRecord, promiseResolve: FunctionObject): ValueEvaluator {
  // 1. Assert: ! IsConstructor(constructor) is true.
  Assert(IsConstructor(constructor));
  // 2. Assert: resultCapability is a PromiseCapability Record.
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  // 3. Assert: ! IsCallable(promiseResolve) is true.
  Assert(IsCallable(promiseResolve));
  // 4. Let errors be a new empty List.
  const errors: Value[] = [];
  // 5. Let remainingElementsCount be a new Record { [[Value]]: 1 }.
  const remainingElementsCount = { Value: 1 };
  // 6. Let index be 0.
  let index = 0;
  // 7. Repeat,
  while (true) {
    // a. Let next be ? IteratorStepValue(iteratorRecord).
    const next = Q(yield* IteratorStepValue(iteratorRecord));
    // d. If next is done, then
    if (next === 'done') {
      // ii. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] - 1.
      remainingElementsCount.Value -= 1;
      // iii. If remainingElementsCount.[[Value]] is 0, then
      if (remainingElementsCount.Value === 0) {
        // 1. Let aggregateError be a newly created AggregateError object.
        const aggregateError = surroundingAgent.Throw('AggregateError', 'PromiseAnyRejected').Value as ObjectValue;
        // 2. Perform ! DefinePropertyOrThrow(aggregateError, "errors", Property Descriptor { [[Configurable]]: true, [[Enumerable]]: false, [[Writable]]: true, [[Value]]: errors }).
        X(DefinePropertyOrThrow(aggregateError, Value('errors'), Descriptor({
          Configurable: Value.true,
          Enumerable: Value.false,
          Writable: Value.true,
          Value: X(CreateArrayFromList(errors)),
        })));
        // 3. Perform ? Call(resultCapability.[[Reject]], *undefined*, « _aggregateError_ »).
        Q(yield* Call(resultCapability.Reject, Value.undefined, [aggregateError]));
      }
      // iv. Return resultCapability.[[Promise]].
      return resultCapability.Promise;
    }
    // h. Append undefined to errors.
    errors.push(Value.undefined);
    // i. Let nextPromise be ? Call(promiseResolve, constructor, « next »).
    const nextPromise = Q(yield* Call(promiseResolve, constructor, [next]));
    const rejectedSteps = function* PromiseAnyRejectElementFunctions([error = Value.undefined]: Arguments): ValueEvaluator {
      const F = surroundingAgent.activeFunctionObject as PromiseAllRejectElementFunctionObject;
      const alreadyCalled = F.AlreadyCalled;
      if (alreadyCalled.Value) {
        return Value.undefined;
      }
      alreadyCalled.Value = true;
      const thisIndex = F.Index;
      errors[thisIndex] = error;
      remainingElementsCount.Value -= 1;
      if (remainingElementsCount.Value === 0) {
        const aggregateError = surroundingAgent.Throw('AggregateError', 'PromiseAnyRejected').Value as ObjectValue;
        X(DefinePropertyOrThrow(aggregateError, Value('errors'), Descriptor({
          Configurable: Value.true,
          Enumerable: Value.false,
          Writable: Value.true,
          Value: X(CreateArrayFromList(errors)),
        })));
        return Q(yield* Call(resultCapability.Reject, Value.undefined, [aggregateError]));
      }
      return Value.undefined;
    };
    // l. Let onRejected be ! CreateBuiltinFunction(stepsRejected, lengthRejected, "", « [[AlreadyCalled]], [[Index]], [[Errors]], [[Capability]], [[RemainingElements]] »).
    const onRejected = X(CreateBuiltinFunction(rejectedSteps, 1, Value(''), ['AlreadyCalled', 'Index'])) as Mutable<PromiseAllRejectElementFunctionObject>;
    onRejected.AlreadyCalled = { Value: false };
    onRejected.Index = index;
    index += 1;
    remainingElementsCount.Value += 1;
    Q(yield* Invoke(nextPromise, Value('then'), [resultCapability.Resolve, onRejected]));
  }
}

/** https://tc39.es/ecma262/#sec-promise.any */
function* Promise_any([iterable = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability = Q(yield* NewPromiseCapability(C));
  __ts_cast__<FunctionObject>(C);
  // 3. Let promiseResolve be GetPromiseResolve(C).
  const promiseResolve = yield* GetPromiseResolve(C);
  // 4. IfAbruptRejectPromise(promiseResolve, promiseCapability).
  IfAbruptRejectPromise(promiseResolve, promiseCapability);
  __ts_cast__<FunctionObject>(promiseResolve);
  // 5. Let iteratorRecord be GetIterator(iterable).
  const iteratorRecord = yield* GetIterator(iterable, 'sync');
  // 6. IfAbruptRejectPromise(iteratorRecord, promiseCapability).
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  __ts_cast__<IteratorRecord>(iteratorRecord);
  // 7. Let result be PerformPromiseAny(iteratorRecord, C, promiseCapability).
  let result: ValueCompletion = yield* PerformPromiseAny(iteratorRecord, C, promiseCapability, promiseResolve);
  // 8. If result is an abrupt completion, then
  if (result instanceof AbruptCompletion) {
    // a. If iteratorRecord.[[Done]] is false, set result to IteratorClose(iteratorRecord, result).
    if (iteratorRecord.Done === Value.false) {
      result = yield* IteratorClose(iteratorRecord, result);
    }
    // b. IfAbruptRejectPromise(result, promiseCapability).
    IfAbruptRejectPromise(result, promiseCapability);
  }
  // 9. Return ? result.
  return result;
}

function* PerformPromiseRace(iteratorRecord: IteratorRecord, constructor: FunctionObject, resultCapability: PromiseCapabilityRecord, promiseResolve: FunctionObject): ValueEvaluator {
  // 1. Assert: IsConstructor(constructor) is true.
  Assert(IsConstructor(constructor));
  // 2. Assert: resultCapability is a PromiseCapability Record.
  Assert(resultCapability instanceof PromiseCapabilityRecord);
  // 3. Assert: IsCallable(promiseResolve) is true.
  Assert(IsCallable(promiseResolve));
  // 4. Repeat,
  while (true) {
    // a. Let next be ? IteratorStepValue(iteratorRecord).
    const next = Q(yield* IteratorStepValue(iteratorRecord));
    // d. If next is done, then
    if (next === 'done') {
      // ii. Return resultCapability.[[Promise]].
      return resultCapability.Promise;
    }
    // h. Let nextPromise be ? Call(promiseResolve, constructor, « next »).
    const nextPromise = Q(yield* Call(promiseResolve, constructor, [next]));
    // i. Perform ? Invoke(nextPromise, "then", « resultCapability.[[Resolve]], resultCapability.[[Reject]] »).
    Q(yield* Invoke(nextPromise, Value('then'), [resultCapability.Resolve, resultCapability.Reject]));
  }
}

/** https://tc39.es/ecma262/#sec-promise.race */
function* Promise_race([iterable = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability = Q(yield* NewPromiseCapability(C));
  __ts_cast__<FunctionObject>(C);
  // 3. Let promiseResolve be GetPromiseResolve(C).
  const promiseResolve = yield* GetPromiseResolve(C);
  __ts_cast__<FunctionObject>(promiseResolve);
  // 4. IfAbruptRejectPromise(promiseResolve, promiseCapability).
  IfAbruptRejectPromise(promiseResolve, promiseCapability);
  // 5. Let iteratorRecord be GetIterator(iterable).
  const iteratorRecord = yield* GetIterator(iterable, 'sync');
  // 6. IfAbruptRejectPromise(iteratorRecord, promiseCapability).
  IfAbruptRejectPromise(iteratorRecord, promiseCapability);
  __ts_cast__<IteratorRecord>(iteratorRecord);
  // 7. Let result be PerformPromiseRace(iteratorRecord, C, promiseCapability, promiseResolve).
  let result: ValueCompletion = yield* PerformPromiseRace(iteratorRecord, C, promiseCapability, promiseResolve);
  // 8. If result is an abrupt completion, then
  if (result instanceof AbruptCompletion) {
    // a. If iteratorRecord.[[Done]] is false, set result to IteratorClose(iteratorRecord, result).
    if (iteratorRecord.Done === Value.false) {
      result = yield* IteratorClose(iteratorRecord, result);
    }
    // b. IfAbruptRejectPromise(result, promiseCapability).
    IfAbruptRejectPromise(result, promiseCapability);
  }
  // 9. Return ? result.
  return result;
}

/** https://tc39.es/ecma262/#sec-promise.reject */
function* Promise_reject([r = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be this value.
  const C = thisValue;
  // 2. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability = Q(yield* NewPromiseCapability(C));
  // 3. Perform ? Call(promiseCapability.[[Reject]], undefined, « r »).
  Q(yield* Call(promiseCapability.Reject, Value.undefined, [r]));
  // 4. Return promiseCapability.[[Promise]].
  return promiseCapability.Promise;
}

/** https://tc39.es/ecma262/#sec-promise.resolve */
function* Promise_resolve([x = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. If Type(C) is not Object, throw a TypeError exception.
  if (!(C instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Promise.resolve', C);
  }
  // 3. Return ? PromiseResolve(C, x).
  return Q(yield* PromiseResolve(C, x));
}

/** https://tc39.es/ecma262/#sec-get-promise-@@species */
function Promise_symbolSpecies(_args: Arguments, { thisValue }: FunctionCallContext): ValueCompletion {
  // 1. Return the this value.
  return thisValue;
}

/** https://tc39.es/ecma262/#sec-promise.try */
function* Promise_try([callback = Value.undefined, ...args]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. If C is not an Object, throw a TypeError exception.
  if (!(C instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'InvalidReceiver', 'Promise.try', C);
  }
  // 3. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability: PromiseCapabilityRecord = Q(yield* NewPromiseCapability(C));
  // 4. Let status be Completion(Call(callback, undefined, args)).
  const status = EnsureCompletion(yield* Call(callback, Value.undefined, args as Arguments));

  if (status instanceof AbruptCompletion) {
    // 5. If status is an abrupt completion, then
    //   a. Perform ? Call(promiseCapability.[[Reject]], undefined, « status.[[Value]] »).
    Q(yield* Call(promiseCapability.Reject, Value.undefined, [status.Value]));
  } else {
    // 6. Else,
    //   a. Perform ? Call(promiseCapability.[[Resolve]], undefined, « status.[[Value]] »).
    Q(yield* Call(promiseCapability.Resolve, Value.undefined, [status.Value]));
  }
  // 7. Return promiseCapability.[[Promise]].
  return EnsureCompletion(promiseCapability.Promise);
}

/** https://tc39.es/ecma262/#sec-promise.withResolvers */
function* Promise_withResolvers(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let C be the this value.
  const C = thisValue;
  // 2. Let promiseCapability be ? NewPromiseCapability(C).
  const promiseCapability: PromiseCapabilityRecord = Q(yield* NewPromiseCapability(C));
  // 3. Let obj be OrdinaryObjectCreate(%Object.prototype%).
  const obj = X(OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%')));
  // 4. Perform ! CreateDataPropertyOrThrow(obj, "promise", promiseCapability.[[Promise]]).
  X(CreateDataPropertyOrThrow(obj, Value('promise'), promiseCapability.Promise));
  // 5. Perform ! CreateDataPropertyOrThrow(obj, "resolve", promiseCapability.[[Resolve]]).
  X(CreateDataPropertyOrThrow(obj, Value('resolve'), promiseCapability.Resolve));
  // 6. Perform ! CreateDataPropertyOrThrow(obj, "reject", promiseCapability.[[Reject]]).
  X(CreateDataPropertyOrThrow(obj, Value('reject'), promiseCapability.Reject));
  // 7. Return obj.
  return EnsureCompletion(obj);
}

export function bootstrapPromise(realmRec: Realm) {
  const promiseConstructor = bootstrapConstructor(realmRec, PromiseConstructor, 'Promise', 1, realmRec.Intrinsics['%Promise.prototype%'], [
    ['all', Promise_all, 1],
    ['allSettled', Promise_allSettled, 1],
    ['any', Promise_any, 1],
    ['race', Promise_race, 1],
    ['reject', Promise_reject, 1],
    ['resolve', Promise_resolve, 1],
    ['try', Promise_try, 1],
    ['withResolvers', Promise_withResolvers, 0],
    [wellKnownSymbols.species, [Promise_symbolSpecies]],
  ]);

  X(promiseConstructor.DefineOwnProperty(Value('prototype'), Descriptor({
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  realmRec.Intrinsics['%Promise%'] = promiseConstructor;
  realmRec.Intrinsics['%Promise.resolve%'] = X(Get(promiseConstructor, Value('resolve'))) as FunctionObject;
}
