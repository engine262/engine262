import {
  surroundingAgent,
} from '../host-defined/engine.mts';
import {
  Await,
  IfAbruptCloseIterator,
  Q,
  ThrowCompletion, X,
  type ValueCompletion,
  type ValueEvaluator,
} from '../completion.mts';
import {
  ArrayCreate,
  Assert,
  Call,
  Construct,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  Get,
  GetMethod,
  GetPrototypeFromConstructor,
  IsArray,
  IsCallable,
  IsConstructor,
  IteratorClose,
  Set,
  LengthOfArrayLike,
  ToObject,
  ToString,
  ToUint32,
  F, R,
  Realm,
  type FunctionObject,
  IteratorStepValue,
  GetIteratorFromMethod,
  type IteratorRecord,
  CreateAsyncFromSyncIterator,
  AsyncIteratorClose,
  IteratorComplete,
} from '../abstract-ops/all.mts';
import {
  BooleanValue,
  JSStringValue,
  NumberValue,
  ObjectValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
  type Arguments,
  type FunctionCallContext,
} from '../value.mts';
import { __ts_cast__, OutOfRange } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';
import { asyncBuiltinFunctionPrologue, IfAbruptCloseAsyncIterator, IteratorValue } from '#self';

/** https://tc39.es/ecma262/#sec-array-constructor */
function* ArrayConstructor(argumentsList: Arguments, { NewTarget }: FunctionCallContext): ValueEvaluator {
  const numberOfArgs = argumentsList.length;
  if (numberOfArgs === 0) {
    /** https://tc39.es/ecma262/#sec-array-constructor-array */
    Assert(numberOfArgs === 0);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject as FunctionObject;
    }
    const proto = X(GetPrototypeFromConstructor(NewTarget, '%Array.prototype%'));
    return ArrayCreate(0, proto);
  } else if (numberOfArgs === 1) {
    /** https://tc39.es/ecma262/#sec-array-len */
    const [len] = argumentsList;
    Assert(numberOfArgs === 1);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject as FunctionObject;
    }
    const proto = X(GetPrototypeFromConstructor(NewTarget, '%Array.prototype%'));
    const array = X(ArrayCreate(0, proto));
    let intLen;
    if (!(len instanceof NumberValue)) {
      const defineStatus = X(CreateDataProperty(array, Value('0'), len));
      Assert(defineStatus === Value.true);
      intLen = F(1);
    } else {
      intLen = X(ToUint32(len));
      if (R(intLen) !== R(len)) {
        return surroundingAgent.Throw('RangeError', 'InvalidArrayLength', len);
      }
    }
    yield* Set(array, Value('length'), intLen, Value.true);
    return array;
  } else if (numberOfArgs >= 2) {
    /** https://tc39.es/ecma262/#sec-array-items */
    const items = argumentsList;
    Assert(numberOfArgs >= 2);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject as FunctionObject;
    }
    const proto = Q(yield* GetPrototypeFromConstructor(NewTarget, '%Array.prototype%'));
    const array = X(ArrayCreate(0, proto));
    let k = 0;
    while (k < numberOfArgs) {
      const Pk = X(ToString(F(k)));
      const itemK = items[k];
      const defineStatus = X(CreateDataProperty(array, Pk, itemK));
      Assert(defineStatus === Value.true);
      k += 1;
    }
    Assert(R(X(Get(array, Value('length'))) as NumberValue) === numberOfArgs);
    return array;
  }

  throw new OutOfRange('ArrayConstructor', numberOfArgs);
}

/** https://tc39.es/ecma262/#sec-array.from */
function* Array_from([items = Value.undefined, mapper = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  const C = thisValue;
  let mapping;
  let A;
  if (mapper === Value.undefined) {
    mapping = false;
  } else {
    if (!IsCallable(mapper)) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', mapper);
    }
    mapping = true;
  }
  const usingIterator = Q(yield* GetMethod(items, wellKnownSymbols.iterator));
  if (!(usingIterator instanceof UndefinedValue)) {
    if (IsConstructor(C)) {
      A = Q(yield* Construct(C));
    } else {
      A = X(ArrayCreate(0));
    }
    const iteratorRecord = Q(yield* GetIteratorFromMethod(items, usingIterator));
    let k = 0;
    while (true) { // eslint-disable-line no-constant-condition
      if (k >= (2 ** 53) - 1) {
        const error = ThrowCompletion(surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength').Value);
        return Q(yield* IteratorClose(iteratorRecord, error));
      }
      const Pk = X(ToString(F(k)));
      const next = Q(yield* IteratorStepValue(iteratorRecord));
      if (next === 'done') {
        Q(yield* Set(A, Value('length'), F(k), Value.true));
        return A;
      }
      let mappedValue;
      if (mapping) {
        mappedValue = yield* Call(mapper, thisArg, [next, F(k)]);
        IfAbruptCloseIterator(mappedValue, iteratorRecord);
        __ts_cast__<Value>(mappedValue);
      } else {
        mappedValue = next;
      }
      const defineStatus = yield* CreateDataPropertyOrThrow(A, Pk, mappedValue);
      IfAbruptCloseIterator(defineStatus, iteratorRecord);
      k += 1;
    }
  }
  const arrayLike = X(ToObject(items));
  const len = Q(yield* LengthOfArrayLike(arrayLike));
  if (IsConstructor(C)) {
    A = Q(yield* Construct(C, [F(len)]));
  } else {
    A = Q(ArrayCreate(len));
  }
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(F(k)));
    const kValue = Q(yield* Get(arrayLike, Pk));
    let mappedValue;
    if (mapping === true) {
      mappedValue = Q(yield* Call(mapper, thisArg, [kValue, F(k)]));
    } else {
      mappedValue = kValue;
    }
    Q(yield* CreateDataPropertyOrThrow(A, Pk, mappedValue));
    k += 1;
  }
  Q(yield* Set(A, Value('length'), F(len), Value.true));
  return A;
}

/** https://tc39.es/proposal-array-from-async/#sec-array.fromAsync */
function* Array_fromAsync([asyncItems = Value.undefined, mapper = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  /* 1. Let C be the this value. */
  const C = thisValue;
  /*
  2. If mapper is undefined, then
    a. Let mapping be false.
  3. Else,
    a. If IsCallable(mapper) is false, throw a TypeError exception.
    b. Let mapping be true.
  */
  let mapping: boolean;
  if (mapper === Value.undefined) {
    mapping = false;
  } else {
    if (IsCallable(mapper) === false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', mapper);
    }
    mapping = true;
  }
  /*
  4. Let usingAsyncIterator be ? GetMethod(asyncItems, %Symbol.asyncIterator%).
  5. If usingAsyncIterator is undefined, then
    a. Let usingSyncIterator be ? GetMethod(asyncItems, %Symbol.iterator%).
  */
  const usingAsyncIterator: UndefinedValue | FunctionObject = Q(yield* GetMethod(asyncItems, wellKnownSymbols.asyncIterator));
  let usingSyncIterator: UndefinedValue | FunctionObject = Value.undefined;
  if (usingAsyncIterator === Value.undefined) {
    usingSyncIterator = Q(yield* GetMethod(asyncItems, wellKnownSymbols.iterator));
  }

  /*
  6. Let iteratorRecord be undefined.
  7. If usingAsyncIterator is not undefined, then
    a. Set iteratorRecord to ? GetIteratorFromMethod(asyncItems, usingAsyncIterator).
  8. Else if usingSyncIterator is not undefined, then
    a. Set iteratorRecord to CreateAsyncFromSyncIterator(? GetIteratorFromMethod(asyncItems, usingSyncIterator)).
  */
  let iteratorRecord: IteratorRecord | undefined;
  if (usingAsyncIterator !== Value.undefined) {
    iteratorRecord = Q(yield* GetIteratorFromMethod(asyncItems, usingAsyncIterator as FunctionObject));
  } else if (usingSyncIterator !== Value.undefined) {
    iteratorRecord = CreateAsyncFromSyncIterator(Q(yield* GetIteratorFromMethod(asyncItems, usingSyncIterator as FunctionObject)));
  }

  if (iteratorRecord) {
    // 9. If iteratorRecord is not undefined, then
    // NOTE: This constant shows up a lot.  Can we move it to a constants file?
    const MAX_SAFE_INTEGER = (2 ** 53) - 1;

    /*
    a. If IsConstructor(C) is true, then
      i. Let A be ? Construct(C).
    b. Else,
      i. Let A be ! ArrayCreate(0).
    c. Let k be 0.
    */
    let A: ObjectValue;
    if (IsConstructor(C)) {
      A = Q(yield* Construct(C));
    } else {
      A = X(ArrayCreate(0));
    }

    let k = 0;
    while (true) {
      /*
      i. If k ≥ 2**53 - 1, then
        1. Let error be ThrowCompletion(a newly created TypeError object).
        2. Return ? AsyncIteratorClose(iteratorRecord, error).
      ii. Let Pk be ! ToString(𝔽(k)).
      iii. Let nextResult be ? Call(iteratorRecord.[[NextMethod]], iteratorRecord.[[Iterator]]).
      iv. Set nextResult to ? Await(nextResult).
      v. If nextResult is not an Object, throw a TypeError exception.
      vi. Let done be ? IteratorComplete(nextResult).
      vii. If done is true, then
        1. Perform ? Set(A, "length", 𝔽(k), true).
        2. Return A.
      viii. Let nextValue be ? IteratorValue(nextResult).
      ix. If mapping is true, then
        1. Let mappedValue be Completion(Call(mapper, thisArg, « nextValue, 𝔽(k) »)).
        2. IfAbruptCloseAsyncIterator(mappedValue, iteratorRecord).
        3. Set mappedValue to Completion(Await(mappedValue)).
        4. IfAbruptCloseAsyncIterator(mappedValue, iteratorRecord).
      x. Else,
        1. Let mappedValue be nextValue.
      xi. Let defineStatus be Completion(CreateDataPropertyOrThrow(A, Pk, mappedValue)).
      xii. IfAbruptCloseAsyncIterator(defineStatus, iteratorRecord).
      xiii. Set k to k + 1.
      */
      if (k > MAX_SAFE_INTEGER) {
        const error = ThrowCompletion(surroundingAgent.NewError('TypeError', 'OutOfRange', k));
        return Q(yield* AsyncIteratorClose(iteratorRecord, error));
      }

      const Pk: JSStringValue = X(yield* ToString(F(k)));
      let nextResult: Value = Q(yield* Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));

      // FIXME: if nextResult is a rejected promise, at least on the first pass, we throw instead of returning a rejected promise.
      nextResult = Q(yield* Await(nextResult));
      if (!(nextResult instanceof ObjectValue)) {
        return surroundingAgent.Throw('TypeError', 'NotAnObject', nextResult);
      }
      const done: BooleanValue = Q(yield* IteratorComplete(nextResult));
      if (done === Value.true) {
        Q(yield* Set(A, Value('length'), F(k), Value.true));
        return A;
      }

      const nextValue: ValueCompletion<Value> = Q(yield* IteratorValue(nextResult));
      let mappedValue;
      if (mapping) {
        mappedValue = (yield* Call(mapper, thisArg, [nextValue, F(k)]));
        IfAbruptCloseAsyncIterator(mappedValue, iteratorRecord);
        __ts_cast__<Value>(mappedValue);
        mappedValue = yield* Await(mappedValue);
        IfAbruptCloseAsyncIterator(mappedValue, iteratorRecord);
        __ts_cast__<Value>(mappedValue);
      } else {
        mappedValue = nextValue;
      }

      const defineStatus = yield* CreateDataPropertyOrThrow(A, Pk, mappedValue);
      IfAbruptCloseAsyncIterator(defineStatus, iteratorRecord);
      k += 1;
    }
  } else {
    // 10. Else,
    /*
    a. NOTE: asyncItems is neither an AsyncIterable nor an Iterable so assume it is an array-like object.
    b. Let arrayLike be ! ToObject(asyncItems).
    c. Let len be ? LengthOfArrayLike(arrayLike).
    d. If IsConstructor(C) is true, then
      i. Let A be ? Construct(C, « 𝔽(len) »).
    e. Else,
      i. Let A be ? ArrayCreate(len).
    f. Let k be 0.
    g. Repeat, while k < len,
      i. Let Pk be ! ToString(𝔽(k)).
      ii. Let kValue be ? Get(arrayLike, Pk).
      iii. Set kValue to ? Await(kValue).
      iv. If mapping is true, then
        1. Let mappedValue be ? Call(mapper, thisArg, « kValue, 𝔽(k) »).
        2. Set mappedValue to ? Await(mappedValue).
      v. Else,
        1. Let mappedValue be kValue.
      vi. Perform ? CreateDataPropertyOrThrow(A, Pk, mappedValue).
      vii. Set k to k + 1.
    h. Perform ? Set(A, "length", 𝔽(len), true).
    i. Return A.
    */
    const arrayLike: ObjectValue = X(ToObject(asyncItems));
    const len = Q(yield* LengthOfArrayLike(arrayLike));

    let A: ObjectValue;
    if (IsConstructor(C)) {
      A = Q(yield* Construct(C));
    } else {
      A = X(ArrayCreate(0));
    }

    let k = 0;
    while (k < len) {
      const Pk = X(ToString(F(k)));
      let kValue = Q(yield* Get(arrayLike, Pk));
      kValue = Q(yield* Await(kValue));
      let mappedValue: Value;
      if (mapping) {
        mappedValue = Q(yield* Call(mapper, thisArg, [kValue, F(k)]));
        mappedValue = Q(yield* Await(mappedValue));
      } else {
        mappedValue = kValue;
      }
      Q(yield* CreateDataPropertyOrThrow(A, Pk, mappedValue));
      k += 1;
    }

    Q(yield* Set(A, Value('length'), F(len), Value.true));
    return A;
  }
}

/** https://tc39.es/ecma262/#sec-array.isarray */
function Array_isArray([arg = Value.undefined]: Arguments): ValueCompletion {
  return Q(IsArray(arg));
}

/** https://tc39.es/ecma262/#sec-array.of */
function* Array_of(items: Arguments, { thisValue }: FunctionCallContext): ValueEvaluator {
  const len = items.length;
  // Let items be the List of arguments passed to this function.
  const C = thisValue;
  let A;
  if (IsConstructor(C)) {
    A = Q(yield* Construct(C, [F(len)]));
  } else {
    A = Q(ArrayCreate(len));
  }
  let k = 0;
  while (k < len) {
    const kValue = items[k];
    const Pk = X(ToString(F(k)));
    Q(yield* CreateDataPropertyOrThrow(A, Pk, kValue));
    k += 1;
  }
  Q(yield* Set(A, Value('length'), F(len), Value.true));
  return A;
}

/** https://tc39.es/ecma262/#sec-get-array-@@species */
function Array_speciesGetter(_args: Arguments, { thisValue }: FunctionCallContext) {
  return thisValue;
}

export function bootstrapArray(realmRec: Realm) {
  const proto = realmRec.Intrinsics['%Array.prototype%'];

  const cons = bootstrapConstructor(realmRec, ArrayConstructor, 'Array', 1, proto, [
    ['from', Array_from, 1],
    ['fromAsync', asyncBuiltinFunctionPrologue(Array_fromAsync), 1],
    ['isArray', Array_isArray, 1],
    ['of', Array_of, 0],
    [wellKnownSymbols.species, [Array_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Array%'] = cons;
}
