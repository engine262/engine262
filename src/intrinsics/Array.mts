// @ts-nocheck
import {
  surroundingAgent,
} from '../engine.mts';
import {
  IfAbruptCloseIterator,
  Q,
  ThrowCompletion, X,
} from '../completion.mts';
import {
  ArrayCreate,
  Assert,
  Call,
  Construct,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  Get,
  GetIterator,
  GetMethod,
  GetPrototypeFromConstructor,
  IsArray,
  IsCallable,
  IsConstructor,
  IteratorClose,
  IteratorStep,
  IteratorValue,
  Set,
  LengthOfArrayLike,
  ToObject,
  ToString,
  ToUint32,
  F, R,
} from '../abstract-ops/all.mts';
import {
  NumberValue,
  UndefinedValue,
  Value,
  wellKnownSymbols,
} from '../value.mts';
import { OutOfRange } from '../helpers.mts';
import { bootstrapConstructor } from './bootstrap.mts';

/** https://tc39.es/ecma262/#sec-array-constructor */
function ArrayConstructor(argumentsList, { NewTarget }) {
  const numberOfArgs = argumentsList.length;
  if (numberOfArgs === 0) {
    /** https://tc39.es/ecma262/#sec-array-constructor-array */
    Assert(numberOfArgs === 0);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%Array.prototype%');
    return ArrayCreate(0, proto);
  } else if (numberOfArgs === 1) {
    /** https://tc39.es/ecma262/#sec-array-len */
    const [len] = argumentsList;
    Assert(numberOfArgs === 1);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%Array.prototype%');
    const array = ArrayCreate(0, proto);
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
    Set(array, Value('length'), intLen, Value.true);
    return array;
  } else if (numberOfArgs >= 2) {
    /** https://tc39.es/ecma262/#sec-array-items */
    const items = argumentsList;
    Assert(numberOfArgs >= 2);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%Array.prototype%');
    const array = ArrayCreate(0, proto);
    let k = 0;
    while (k < numberOfArgs) {
      const Pk = X(ToString(F(k)));
      const itemK = items[k];
      const defineStatus = X(CreateDataProperty(array, Pk, itemK));
      Assert(defineStatus === Value.true);
      k += 1;
    }
    Assert(R(X(Get(array, Value('length')))) === numberOfArgs);
    return array;
  }

  throw new OutOfRange('ArrayConstructor', numberOfArgs);
}

/** https://tc39.es/ecma262/#sec-array.from */
function Array_from([items = Value.undefined, mapfn = Value.undefined, thisArg = Value.undefined], { thisValue }) {
  const C = thisValue;
  let mapping;
  let A;
  if (mapfn === Value.undefined) {
    mapping = false;
  } else {
    if (IsCallable(mapfn) === Value.false) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', mapfn);
    }
    mapping = true;
  }
  const usingIterator = Q(GetMethod(items, wellKnownSymbols.iterator));
  if (usingIterator !== Value.undefined) {
    if (IsConstructor(C) === Value.true) {
      A = Q(Construct(C));
    } else {
      A = X(ArrayCreate(0));
    }
    const iteratorRecord = Q(GetIterator(items, 'sync', usingIterator));
    let k = 0;
    while (true) { // eslint-disable-line no-constant-condition
      if (k >= (2 ** 53) - 1) {
        const error = ThrowCompletion(surroundingAgent.Throw('TypeError', 'ArrayPastSafeLength').Value);
        return Q(IteratorClose(iteratorRecord, error));
      }
      const Pk = X(ToString(F(k)));
      const next = Q(IteratorStep(iteratorRecord));
      if (next === Value.false) {
        Q(Set(A, Value('length'), F(k), Value.true));
        return A;
      }
      const nextValue = Q(IteratorValue(next));
      let mappedValue;
      if (mapping) {
        mappedValue = Call(mapfn, thisArg, [nextValue, F(k)]);
        IfAbruptCloseIterator(mappedValue, iteratorRecord);
      } else {
        mappedValue = nextValue;
      }
      const defineStatus = CreateDataPropertyOrThrow(A, Pk, mappedValue);
      IfAbruptCloseIterator(defineStatus, iteratorRecord);
      k += 1;
    }
  }
  const arrayLike = X(ToObject(items));
  const len = Q(LengthOfArrayLike(arrayLike));
  if (IsConstructor(C) === Value.true) {
    A = Q(Construct(C, [F(len)]));
  } else {
    A = Q(ArrayCreate(len));
  }
  let k = 0;
  while (k < len) {
    const Pk = X(ToString(F(k)));
    const kValue = Q(Get(arrayLike, Pk));
    let mappedValue;
    if (mapping === true) {
      mappedValue = Q(Call(mapfn, thisArg, [kValue, F(k)]));
    } else {
      mappedValue = kValue;
    }
    Q(CreateDataPropertyOrThrow(A, Pk, mappedValue));
    k += 1;
  }
  Q(Set(A, Value('length'), F(len), Value.true));
  return A;
}

/** https://tc39.es/ecma262/#sec-array.isarray */
function Array_isArray([arg = Value.undefined]) {
  return Q(IsArray(arg));
}

/** https://tc39.es/ecma262/#sec-array.of */
function Array_of(items, { thisValue }) {
  const len = items.length;
  // Let items be the List of arguments passed to this function.
  const C = thisValue;
  let A;
  if (IsConstructor(C) === Value.true) {
    A = Q(Construct(C, [F(len)]));
  } else {
    A = Q(ArrayCreate(len));
  }
  let k = 0;
  while (k < len) {
    const kValue = items[k];
    const Pk = X(ToString(F(k)));
    Q(CreateDataPropertyOrThrow(A, Pk, kValue));
    k += 1;
  }
  Q(Set(A, Value('length'), F(len), Value.true));
  return A;
}

/** https://tc39.es/ecma262/#sec-get-array-@@species */
function Array_speciesGetter(args, { thisValue }) {
  return thisValue;
}

export function bootstrapArray(realmRec) {
  const proto = realmRec.Intrinsics['%Array.prototype%'];

  const cons = bootstrapConstructor(realmRec, ArrayConstructor, 'Array', 1, proto, [
    ['from', Array_from, 1],
    ['isArray', Array_isArray, 1],
    ['of', Array_of, 0],
    [wellKnownSymbols.species, [Array_speciesGetter]],
  ]);

  realmRec.Intrinsics['%Array%'] = cons;
}
