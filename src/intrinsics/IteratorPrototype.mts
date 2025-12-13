import {
  Call,
  CreateArrayFromList,
  CreateIteratorFromClosure,
  GetIteratorDirect,
  GetIteratorFlattenable,
  IsCallable,
  IteratorClose,
  IteratorStep,
  IteratorStepValue,
  SetterThatIgnoresPrototypeProperties,
  ToBoolean,
  ToIntegerOrInfinity,
  ToNumber,
  ToString,
  Yield,
  type GeneratorObject,
  type IteratorRecord,
  type Realm,
} from '../abstract-ops/all.mts';
import {
  AbruptCompletion,
  EnsureCompletion,
  IfAbruptCloseIterator,
  NormalCompletion,
  Q,
  ReturnCompletion,
  X,
  type PlainCompletion,
  type ValueCompletion,
  type ValueEvaluator,
} from '../completion.mts';
import { __ts_cast__, type Mutable } from '../helpers.mts';
import { surroundingAgent } from '../host-defined/engine.mts';
import {
  BooleanValue,
  NumberValue,
  ObjectValue,
  UndefinedValue,
  Value, wellKnownSymbols, type Arguments, type FunctionCallContext,
} from '../value.mts';
import { bootstrapPrototype } from './bootstrap.mts';

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-get-iterator.prototype.constructor */
function IteratorProto_constructorGetter() {
  // 1. Return %Iterator%.
  return surroundingAgent.intrinsic('%Iterator%');
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-set-iterator.prototype.constructor */
function* IteratorProto_constructorSetter([v]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<UndefinedValue> {
  // 1. Perform ? SetterThatIgnoresPrototypeProperties(this value, %Iterator.prototype%, "constructor", v).
  Q(yield* SetterThatIgnoresPrototypeProperties(
    thisValue,
    surroundingAgent.intrinsic('%Iterator.prototype%'),
    Value('constructor'),
    v,
  ));
  // 2. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.drop */
function* IteratorPrototype_drop([limit = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. Let numLimit be Completion(ToNumber(limit)).
  const numLimit: ValueCompletion<NumberValue> = EnsureCompletion(yield* ToNumber(limit));
  // 5. IfAbruptCloseIterator(numLimit, iterated).
  IfAbruptCloseIterator(numLimit, iterated);
  __ts_cast__<NumberValue>(numLimit);
  // 6. If numLimit is NaN, then
  if (numLimit.isNaN()) {
    // a. Let error be ThrowCompletion(a newly created RangeError object).
    const error = surroundingAgent.Throw('RangeError', 'OutOfRange', numLimit);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 7. Let integerLimit be ! ToIntegerOrInfinity(numLimit).
  const integerLimit: number = X(yield* ToIntegerOrInfinity(numLimit instanceof NormalCompletion ? numLimit.Value : numLimit));
  // 8. If integerLimit < 0, then
  if (integerLimit < 0) {
    // a. Let error be ThrowCompletion(a newly created RangeError object).
    const error = surroundingAgent.Throw('RangeError', 'OutOfRange', numLimit);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 9. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 10. Let closure be a new Abstract Closure with no parameters that captures iterated and integerLimit and performs the following steps when called:
  const closure = function* closure() {
    // a. Let remaining be integerLimit.
    let remaining: number = integerLimit;
    // b. Repeat, while remaining > 0,
    while (remaining > 0) {
      // i. If remaining ≠ +∞, then
      if (remaining !== +Infinity) {
        // 1. Set remaining to remaining - 1.
        remaining -= 1;
      }
      // ii. Let next be ? IteratorStep(iterated).
      const next = Q(yield* IteratorStep(iterated));
      // iii. If next is done, return ReturnCompletion(undefined).
      if (next === 'done') {
        return ReturnCompletion(Value.undefined);
      }
    }
    // c. Repeat,
    while (true) {
      // i. Let value be ? IteratorStepValue(iterated).
      const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
      // ii. If value is done, return ReturnCompletion(undefined).
      if (value === 'done') {
        return ReturnCompletion(Value.undefined);
      }
      // iii. Let completion be Completion(Yield(value)).
      const completion = EnsureCompletion(yield* Yield(value));
      // iv. IfAbruptCloseIterator(completion, iterated).
      IfAbruptCloseIterator(completion, iterated);
    }
  };
  // 11. Let result be CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
  const result: Mutable<GeneratorObject> = CreateIteratorFromClosure(
    closure,
    Value('Iterator Helper'),
    surroundingAgent.currentRealmRecord.Intrinsics['%IteratorHelperPrototype%'],
    ['UnderlyingIterators'],
  );
  // 12. Set result.[[UnderlyingIterators]] to iterated.
  result.UnderlyingIterators = [iterated];
  // 13. Return result.
  return result;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.every */
function* IteratorPrototype_every([predicate = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(predicate) is false, then
  if (IsCallable(predicate) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let counter be 0.
  let counter = 0;
  // 7. Repeat,
  while (true) {
    // a. Let value be ? IteratorStepValue(iterated).
    const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
    // b. If value is done, return true.
    if (value === 'done') {
      return Value.true;
    }
    // c. Let result be Completion(Call(predicate, undefined, « value, 𝔽(counter) »)).
    const result: ValueCompletion = yield* Call(predicate, Value.undefined, [value, Value(counter)]);
    // d. IfAbruptCloseIterator(result, iterated).
    IfAbruptCloseIterator(result, iterated);
    __ts_cast__<BooleanValue>(result);
    // e. If ToBoolean(result) is false, return ? IteratorClose(iterated, NormalCompletion(false)).
    if (ToBoolean(result) === Value.false) {
      return Q(yield* IteratorClose(iterated, EnsureCompletion(Value.false)));
    }
    // f. Set counter to counter + 1.
    counter += 1;
  }
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.filter */
function* IteratorPrototype_filter([predicate = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(predicate) is false, then
  if (IsCallable(predicate) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let closure be a new Abstract Closure with no parameters that captures iterated and predicate and performs the following steps when called:
  const closure = function* closure() {
    // a. Let counter be 0.
    let counter = 0;
    // b. Repeat,
    while (true) {
      // i. Let value be ? IteratorStepValue(iterated).
      const value = Q(yield* IteratorStepValue(iterated));
      // ii. If value is done, return ReturnCompletion(undefined).
      if (value === 'done') {
        return ReturnCompletion(Value.undefined);
      }
      // iii. Let selected be Completion(Call(predicate, undefined, « value, 𝔽(counter) »)).
      const selected: ValueCompletion = yield* Call(predicate, Value.undefined, [value, Value(counter)]);
      // iv. IfAbruptCloseIterator(selected, iterated).
      IfAbruptCloseIterator(selected, iterated);
      // v. If ToBoolean(selected) is true, then
      __ts_cast__<BooleanValue>(selected);
      if (ToBoolean(selected) === Value.true) {
        // 1. Let completion be Completion(Yield(value)).
        const completion = EnsureCompletion(yield* Yield(value));
        // 2. IfAbruptCloseIterator(completion, iterated).
        IfAbruptCloseIterator(completion, iterated);
      }
      // vi. Set counter to counter + 1.
      counter += 1;
    }
  };
  // 7. Let result be CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
  const result = CreateIteratorFromClosure(
    closure,
    Value('Iterator Helper'),
    surroundingAgent.currentRealmRecord.Intrinsics['%IteratorHelperPrototype%'],
    ['UnderlyingIterators'],
  );
  // 8. Set result.[[UnderlyingIterators]] to iterated.
  result.UnderlyingIterators = [iterated];
  // 9. Return result.
  return result;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.find */
function* IteratorPrototype_find([predicate = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(predicate) is false, then
  if (IsCallable(predicate) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let counter be 0.
  let counter = 0;
  // 7. Repeat,
  while (true) {
    // a. Let value be ? IteratorStepValue(iterated).
    const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
    // b. If value is done, return undefined.
    if (value === 'done') {
      return Value.undefined;
    }
    // c. Let result be Completion(Call(predicate, undefined, « value, 𝔽(counter) »)).
    const result: ValueCompletion = yield* Call(predicate, Value.undefined, [value, Value(counter)]);
    // d. IfAbruptCloseIterator(result, iterated).
    IfAbruptCloseIterator(result, iterated);
    // e. If ToBoolean(result) is true, return ? IteratorClose(iterated, NormalCompletion(value)).
    __ts_cast__<BooleanValue>(result);
    if (ToBoolean(result) === Value.true) {
      return Q(yield* IteratorClose(iterated, EnsureCompletion(value)));
    }
    // f. Set counter to counter + 1.
    counter += 1;
  }
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.flatmap */
function* IteratorPrototype_flatMap([mapper = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(mapper) is false, then
  if (IsCallable(mapper) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', mapper);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let closure be a new Abstract Closure with no parameters that captures iterated and mapper and performs the following steps when called:
  const closure = function* closure() {
    //  a. Let counter be 0.
    let counter = 0;
    // b. Repeat,
    while (true) {
      // i. Let value be ? IteratorStepValue(iterated).
      const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
      // ii. If value is done, return ReturnCompletion(undefined).
      if (value === 'done') {
        return ReturnCompletion(Value.undefined);
      }
      // iii. Let mapped be Completion(Call(mapper, undefined, « value, 𝔽(counter) »)).
      const mapped: ValueCompletion = EnsureCompletion(yield* Call(mapper, Value.undefined, [value, Value(counter)]));
      // iv. IfAbruptCloseIterator(mapped, iterated).
      IfAbruptCloseIterator(mapped, iterated);
      __ts_cast__<Value>(mapped);
      // v. Let innerIterator be Completion(GetIteratorFlattenable(mapped, reject-primitives)).
      const innerIterator: PlainCompletion<IteratorRecord> = EnsureCompletion(yield* GetIteratorFlattenable(mapped, 'reject-primitives'));
      // vi. IfAbruptCloseIterator(innerIterator, iterated).
      IfAbruptCloseIterator(innerIterator, iterated);
      __ts_cast__<IteratorRecord>(innerIterator);
      // vii. Let innerAlive be true.
      let innerAlive = true;
      // viii. Repeat, while innerAlive is true,
      while (innerAlive) {
        // 1. Let innerValue be Completion(IteratorStepValue(innerIterator)).
        const innerValue: PlainCompletion<Value | 'done'> = yield* IteratorStepValue(innerIterator);
        // 2. IfAbruptCloseIterator(innerValue, iterated).
        IfAbruptCloseIterator(innerValue, iterated);
        __ts_cast__<Value | 'done'>(innerValue);
        // 3. If innerValue is done, then
        if (innerValue === 'done') {
          // a. Set innerAlive to false.
          innerAlive = false;
        // 4. Else,
        } else {
          // a. Let completion be Completion(Yield(innerValue)).
          const completion = EnsureCompletion(yield* Yield(innerValue));
          // b. If completion is an abrupt completion, then
          if (completion instanceof AbruptCompletion) {
            // i. Let backupCompletion be Completion(IteratorClose(innerIterator, completion)).
            const backupCompletion = EnsureCompletion(yield* IteratorClose(innerIterator, completion));
            // ii. IfAbruptCloseIterator(backupCompletion, iterated).
            IfAbruptCloseIterator(backupCompletion, iterated);
            // iii. Return ? IteratorClose(iterated, completion).
            return Q(yield* IteratorClose(iterated, completion));
          }
        }
      }
      // ix. Set counter to counter + 1.
      counter += 1;
    }
  };

  // 7. Let result be CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
  const result = CreateIteratorFromClosure(
    closure,
    Value('Iterator Helper'),
    surroundingAgent.currentRealmRecord.Intrinsics['%IteratorHelperPrototype%'],
    ['UnderlyingIterators'],
  );
  // 8. Set result.[[UnderlyingIterators]] to iterated.
  result.UnderlyingIterators = [iterated];
  // 9. Return result.
  return result;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.foreach */
function* IteratorPrototype_forEach([procedure = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(procedure) is false, then
  if (IsCallable(procedure) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', procedure);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let counter be 0.
  let counter = 0;
  // 7. Repeat,
  while (true) {
    // a. Let value be ? IteratorStepValue(iterated).
    const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
    // b. If value is done, return undefined.
    if (value === 'done') {
      return Value.undefined;
    }
    // c. Let result be Completion(Call(procedure, undefined, « value, 𝔽(counter) »)).
    const result: ValueCompletion = yield* Call(procedure, Value.undefined, [value, Value(counter)]);
    // d. IfAbruptCloseIterator(result, iterated).
    IfAbruptCloseIterator(result, iterated);
    // e. Set counter to counter + 1.
    counter += 1;
  }
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-iterator.prototype-%symbol.iterator% */
function IteratorPrototype_iterator(_args: Arguments, { thisValue }: FunctionCallContext) {
  // 1. Return the this value.
  return thisValue;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.map */
function* IteratorPrototype_map([mapper = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(mapper) is false, then
  if (IsCallable(mapper) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', mapper);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let closure be a new Abstract Closure with no parameters that captures iterated and mapper and performs the following steps when called:
  const closure = function* closure() {
    // a. Let counter be 0.
    let counter = 0;
    // b. Repeat,
    while (true) {
      // i. Let value be ? IteratorStepValue(iterated).
      const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
      // ii. If value is done, return ReturnCompletion(undefined).
      if (value === 'done') {
        return ReturnCompletion(Value.undefined);
      }
      // iii. Let mapped be Completion(Call(mapper, undefined, « value, 𝔽(counter) »)).
      const mapped: ValueCompletion = yield* Call(mapper, Value.undefined, [value, Value(counter)]);
      // iv. IfAbruptCloseIterator(mapped, iterated).
      IfAbruptCloseIterator(mapped, iterated);
      // v. Let completion be Completion(Yield(mapped)).
      __ts_cast__<Value>(mapped);
      const completion = EnsureCompletion(yield* Yield(mapped));
      // vi. IfAbruptCloseIterator(completion, iterated).
      IfAbruptCloseIterator(completion, iterated);
      // vii. Set counter to counter + 1.
      counter += 1;
    }
  };
  // 7. Let result be CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
  const result = CreateIteratorFromClosure(
    closure,
    Value('Iterator Helper'),
    surroundingAgent.currentRealmRecord.Intrinsics['%IteratorHelperPrototype%'],
    ['UnderlyingIterators'],
  );
  // 8. Set result.[[UnderlyingIterators]] to [iterated].
  result.UnderlyingIterators = [iterated];
  // 9. Return result.
  return result;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.reduce */
function* IteratorPrototype_reduce(args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(reducer) is false, then
  const reducer = args[0] ?? Value.undefined;
  if (IsCallable(reducer) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', reducer);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. If initialValue is not present, then
  let accumulator: Value | 'done';
  let counter: number;
  if (args.length < 2) {
    // a. Let accumulator be ? IteratorStepValue(iterated).
    accumulator = Q(yield* IteratorStepValue(iterated));
    // b. If accumulator is done, throw a TypeError exception.
    if (accumulator === 'done') {
      return surroundingAgent.Throw('TypeError', 'IteratorCompleted');
    }
    // c. Let counter be 1.
    counter = 1;
  } else {
    // 7. Else,
    //   a. Let accumulator be initialValue.
    //   b. Let counter be 0.
    accumulator = args[1] ?? Value.undefined;
    counter = 0;
  }
  // 8. Repeat,
  while (true) {
    // a. Let value be ? IteratorStepValue(iterated).
    const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
    // b. If value is done, return accumulator.
    if (value === 'done') {
      return accumulator;
    }
    // c. Let result be Completion(Call(reducer, undefined, « accumulator, value, 𝔽(counter) »)).
    const result: ValueCompletion = yield* Call(reducer, Value.undefined, [accumulator, value, Value(counter)]);
    // d. IfAbruptCloseIterator(result, iterated).
    IfAbruptCloseIterator(result, iterated);
    // e. Set accumulator to result.
    __ts_cast__<Value>(result);
    accumulator = result;
    // f. Set counter to counter + 1.
    counter += 1;
  }
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.some */
function* IteratorPrototype_some([predicate = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. If IsCallable(predicate) is false, then
  if (IsCallable(predicate) === false) {
    // a. Let error be ThrowCompletion(a newly created TypeError object).
    const error = surroundingAgent.Throw('TypeError', 'NotAFunction', predicate);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 5. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 6. Let counter be 0.
  let counter = 0;
  // 7. Repeat,
  while (true) {
    // a. Let value be ? IteratorStepValue(iterated).
    const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
    // b. If value is done, return false.
    if (value === 'done') {
      return Value.false;
    }
    // c. Let result be Completion(Call(predicate, undefined, « value, 𝔽(counter) »)).
    const result: ValueCompletion = yield* Call(predicate, Value.undefined, [value, Value(counter)]);
    // d. IfAbruptCloseIterator(result, iterated).
    IfAbruptCloseIterator(result, iterated);
    __ts_cast__<BooleanValue>(result);
    // e. If ToBoolean(result) is true, return ? IteratorClose(iterated, NormalCompletion(true)).
    if (ToBoolean(result) === Value.true) {
      return Q(yield* IteratorClose(iterated, EnsureCompletion(Value.true)));
    }
    // f. Set counter to counter + 1.
    counter += 1;
  }
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.take */
function* IteratorPrototype_take([limit = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be the Iterator Record { [[Iterator]]: O, [[NextMethod]]: undefined, [[Done]]: false }.
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  // 4. Let numLimit be Completion(ToNumber(limit)).
  const numLimit: ValueCompletion<NumberValue> = yield* ToNumber(limit);
  // 5. IfAbruptCloseIterator(numLimit, iterated).
  IfAbruptCloseIterator(numLimit, iterated);
  __ts_cast__<Value>(numLimit);
  // 6. If numLimit is NaN, then
  if (numLimit.isNaN()) {
    // a. Let error be ThrowCompletion(a newly created RangeError object).
    const error = surroundingAgent.Throw('RangeError', 'OutOfRange', numLimit);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 7. Let integerLimit be ! ToIntegerOrInfinity(numLimit).
  const integerLimit: number = X(yield* ToIntegerOrInfinity(numLimit instanceof NormalCompletion ? numLimit.Value : numLimit));
  // 8. If integerLimit < 0, then
  if (integerLimit < 0) {
    // a. Let error be ThrowCompletion(a newly created RangeError object).
    const error = surroundingAgent.Throw('RangeError', 'OutOfRange', numLimit);
    // b. Return ? IteratorClose(iterated, error).
    return Q(yield* IteratorClose(iterated, error));
  }
  // 9. Set iterated to ? GetIteratorDirect(O).
  iterated = Q(yield* GetIteratorDirect(O));
  // 10. Let closure be a new Abstract Closure with no parameters that captures iterated and integerLimit and performs the following steps when called:
  const closure = function* closure() {
    // a. Let remaining be integerLimit.
    let remaining: number = integerLimit;
    //         b. Repeat,
    while (true) {
      // i. If remaining = 0, then
      //   1. Return ? IteratorClose(iterated, ReturnCompletion(undefined)).
      if (remaining === 0) {
        return Q(yield* IteratorClose(iterated, ReturnCompletion(Value.undefined)));
      }
      // ii. If remaining ≠ +∞, then
      //   1. Set remaining to remaining - 1.
      if (remaining !== +Infinity) {
        remaining -= 1;
      }
      // iii. Let value be ? IteratorStepValue(iterated).
      const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
      // iv. If value is done, return ReturnCompletion(undefined).
      if (value === 'done') {
        return ReturnCompletion(Value.undefined);
      }
      // v. Let completion be Completion(Yield(value)).
      const completion = EnsureCompletion(yield* Yield(value));
      // vi. IfAbruptCloseIterator(completion, iterated).
      IfAbruptCloseIterator(completion, iterated);
    }
  };
  // 11. Let result be CreateIteratorFromClosure(closure, "Iterator Helper", %IteratorHelperPrototype%, « [[UnderlyingIterator]] »).
  const result: Mutable<GeneratorObject> = CreateIteratorFromClosure(
    closure,
    Value('Iterator Helper'),
    surroundingAgent.currentRealmRecord.Intrinsics['%IteratorHelperPrototype%'],
    ['UnderlyingIterators'],
  );
  // 12. Set result.[[UnderlyingIterators]] to iterated.
  result.UnderlyingIterators = [iterated];
  // 13. Return result.
  return result;
}

/** https://tc39.es/ecma262/#sec-iterator.prototype.toarray */
function* IteratorPrototype_toArray(_args: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  // 1. Let O be the this value.
  const O = thisValue;
  // 2. If O is not an Object, throw a TypeError exception.
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  // 3. Let iterated be ? GetIteratorDirect(O).
  const iterated: IteratorRecord = Q(yield* GetIteratorDirect(O));
  // 4. Let items be a new empty List.
  const items: Value[] = [];
  // 5. Repeat,
  while (true) {
    // a. Let value be ? IteratorStepValue(iterated).
    const value: Value | 'done' = Q(yield* IteratorStepValue(iterated));
    // b. If value is done, return CreateArrayFromList(items).
    if (value === 'done') {
      return CreateArrayFromList(items);
    }
    // c. Append value to items.
    items.push(value);
  }
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-get-iterator.prototype-%symbol.tostringtag% */
function IteratorPrototype_toStringTagGetter() {
  return Value('Iterator');
}

/** https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-set-iterator.prototype-%symbol.tostringtag% */
function* IteratorPrototype_toStringTagSetter([v]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator<UndefinedValue> {
  // 1. Perform ? SetterThatIgnoresPrototypeProperties(this value, %Iterator.prototype%, %Symbol.toStringTag%, v).
  Q(yield* SetterThatIgnoresPrototypeProperties(
    thisValue,
    surroundingAgent.intrinsic('%Iterator.prototype%'),
    wellKnownSymbols.toStringTag,
    v,
  ));
  // 2. Return undefined.
  return Value.undefined;
}

/** https://tc39.es/proposal-iterator-join/#sec-iterator.prototype.join */
function* IteratorPrototype_join([separator = Value.undefined]: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const O = thisValue;
  if (!(O instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  let iterated: IteratorRecord = { Iterator: O, NextMethod: Value.undefined, Done: Value.false };
  let sep;
  if (separator === Value.undefined) {
    sep = ',';
  } else {
    const completion = yield* ToString(separator);
    IfAbruptCloseIterator(completion, iterated);
    sep = X(completion).stringValue();
  }
  iterated = Q(yield* GetIteratorDirect(O));
  let R = '';
  let first = true;
  while (true) {
    const value = Q(yield* IteratorStepValue(iterated));
    if (value === 'done') {
      return Value(R);
    }
    if (first) {
      first = false;
    } else {
      R += sep;
    }
    if (value !== Value.undefined && value !== Value.null) {
      const S_completion = yield* ToString(value);
      IfAbruptCloseIterator(S_completion, iterated);
      const S = X(S_completion).stringValue();
      R += S;
    }
  }
}

export function bootstrapIteratorPrototype(realmRec: Realm) {
  const proto = bootstrapPrototype(realmRec, [
    ['constructor', [IteratorProto_constructorGetter, IteratorProto_constructorSetter]],
    ['drop', IteratorPrototype_drop, 1],
    ['every', IteratorPrototype_every, 1],
    ['filter', IteratorPrototype_filter, 1],
    ['find', IteratorPrototype_find, 1],
    ['flatMap', IteratorPrototype_flatMap, 1],
    ['forEach', IteratorPrototype_forEach, 1],
    ['map', IteratorPrototype_map, 1],
    ['reduce', IteratorPrototype_reduce, 1],
    ['some', IteratorPrototype_some, 1],
    ['take', IteratorPrototype_take, 1],
    ['toArray', IteratorPrototype_toArray, 0],
    [wellKnownSymbols.iterator, IteratorPrototype_iterator, 0],
    [wellKnownSymbols.toStringTag, [IteratorPrototype_toStringTagGetter, IteratorPrototype_toStringTagSetter]],
    surroundingAgent.feature('iterator.join') ? ['join', IteratorPrototype_join, 1] : undefined,
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%Iterator.prototype%'] = proto;
}
