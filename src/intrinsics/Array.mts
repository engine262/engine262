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
import {
  asyncBuiltinFunctionPrologue, IfAbruptCloseAsyncIterator, IteratorValue, Throw,
} from '#self';

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
      const defineStatus = X(CreateDataProperty(array, Value('0'), len!));
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
      const itemK = items[k]!;
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
      return Throw.TypeError('$1 is not a function', mapper);
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

/** https://tc39.es/ecma262/#sec-array.fromasync */
function* Array_fromAsync([items = Value.undefined, mapper = Value.undefined, thisArg = Value.undefined]: Arguments, { thisValue }: FunctionCallContext) {
  const C = thisValue;
  let mapping = false;
  if (mapper !== Value.undefined) {
    if (!IsCallable(mapper)) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', mapper);
    }
    mapping = true;
  }
  let iteratorRecord: IteratorRecord | undefined;
  const usingAsyncIterator = Q(yield* GetMethod(items, wellKnownSymbols.asyncIterator));
  let usingSyncIterator: UndefinedValue | FunctionObject = Value.undefined;
  if (usingAsyncIterator instanceof UndefinedValue) {
    usingSyncIterator = Q(yield* GetMethod(items, wellKnownSymbols.iterator));
    if (!(usingSyncIterator instanceof UndefinedValue)) {
      iteratorRecord = CreateAsyncFromSyncIterator(Q(yield* GetIteratorFromMethod(items, usingSyncIterator)));
    }
  } else {
    iteratorRecord = Q(yield* GetIteratorFromMethod(items, usingAsyncIterator));
  }

  if (iteratorRecord) {
    const MAX_SAFE_INTEGER = (2 ** 53) - 1;
    let A: ObjectValue;
    if (IsConstructor(C)) {
      A = Q(yield* Construct(C));
    } else {
      A = X(ArrayCreate(0));
    }

    let k = 0;
    while (true) {
      if (k > MAX_SAFE_INTEGER) {
        const error = surroundingAgent.Throw('TypeError', 'OutOfRange', k);
        return Q(yield* AsyncIteratorClose(iteratorRecord, error));
      }

      const Pk = X(ToString(F(k)));
      let nextResult: Value = Q(yield* Call(iteratorRecord.NextMethod, iteratorRecord.Iterator));
      nextResult = Q(yield* Await(nextResult));
      if (!(nextResult instanceof ObjectValue)) {
        return surroundingAgent.Throw('TypeError', 'NotAnObject', nextResult);
      }
      const done = Q(yield* IteratorComplete(nextResult));
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
    const arrayLike = X(ToObject(items));
    const len = Q(yield* LengthOfArrayLike(arrayLike));

    let A: ObjectValue;
    if (IsConstructor(C)) {
      A = Q(yield* Construct(C, [F(len)]));
    } else {
      A = Q(ArrayCreate(len));
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
    const kValue = items[k]!;
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
