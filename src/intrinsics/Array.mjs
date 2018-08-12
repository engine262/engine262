import {
  surroundingAgent,
} from '../engine.mjs';
import {
  AbruptCompletion,
  ThrowCompletion,
  X, Q,
} from '../completion.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  GetPrototypeFromConstructor,
  IsCallable,
  IsConstructor,
  Construct,
  GetMethod,
  GetIterator,
  IteratorStep,
  IteratorValue,
  IteratorClose,
  Get,
  Set,
  CreateDataProperty,
  CreateDataPropertyOrThrow,
  ToString,
  Call,
  ToObject,
  ToLength,
  IsArray,
  ToUint32,
  OrdinaryDefineOwnProperty,
} from '../abstract-ops/all.mjs';

import {
  Type,
  ArrayValue,
  UndefinedValue,
  New as NewValue,
  wellKnownSymbols,
} from '../value.mjs';

export function ArrayCreate(length, proto) {
  Assert(length.numberValue() >= 0);
  if (Object.is(length.numberValue(), -0)) {
    length = NewValue(0);
  }
  if (length.numberValue() > (2 ** 32) - 1) {
    return surroundingAgent.Throw('RangeError');
  }
  if (proto instanceof UndefinedValue) {
    proto = surroundingAgent.intrinsic('%ArrayPrototype%');
  }
  const A = new ArrayValue(surroundingAgent.currentRealmRecord);

  // Set A's essential internal methods except for [[DefineOwnProperty]]
  // to the default ordinary object definitions specified in 9.1.

  X(OrdinaryDefineOwnProperty(A, NewValue('length'), {
    Value: length,
    Writable: true,
    Enumerable: false,
    Configurable: false,
  }));

  return A;
}

function ArrayConstructor(realm, argumentsList, { NewTarget }) {
  const numberOfArgs = argumentsList.length;
  if (numberOfArgs === 0) {
    // 22.1.1.1 Array ( )
    Assert(numberOfArgs === 0);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    return ArrayCreate(NewValue(0), proto);
  } else if (numberOfArgs === 1) {
    // #sec-array-len Array ( len )
    const [len] = argumentsList;
    Assert(numberOfArgs === 1);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    const array = ArrayCreate(NewValue(0), proto);
    let intLen;
    if (Type(len) !== 'Number') {
      const defineStatus = CreateDataProperty(array, NewValue('0'), len);
      Assert(defineStatus.isTrue());
      intLen = NewValue(1);
    } else {
      intLen = ToUint32(len);
      if (intLen.numberValue() !== len.numberValue()) {
        return surroundingAgent.Throw('RangeError');
      }
    }
    Set(array, NewValue('length'), intLen, NewValue(true));
    return array;
  } else if (numberOfArgs >= 2) {
    // #sec-array-items Array ( ...items )
    Assert(numberOfArgs >= 2);
    if (NewTarget instanceof UndefinedValue) {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    const array = ArrayCreate(NewValue(0), proto);
    let k = 0;
    const items = argumentsList;
    while (k < numberOfArgs) {
      const Pk = ToString(NewValue(k));
      const itemK = items[k];
      const defineStatus = CreateDataProperty(array, Pk, itemK);
      Assert(defineStatus.isTrue());
      k += 1;
    }
    Assert(Get(array, NewValue('length')).numberValue() === numberOfArgs);
    return array;
  }

  throw new RangeError('ArrayConstructor arguments out of range');
}

function ArrayFrom(realm, argList, { thisValue }) {
  const [items, mapfn, thisArg] = argList;
  const C = thisValue;
  let mapping;
  let T;
  let A;
  if (mapfn instanceof UndefinedValue) {
    mapping = false;
  } else {
    if (IsCallable(mapfn) === false) {
      return surroundingAgent.Throw('TypeError');
    }
    if (argList.length >= 3) {
      T = thisArg;
    } else {
      T = new UndefinedValue();
    }
    mapping = true;
  }
  const usingIterator = Q(GetMethod(items, wellKnownSymbols.iterator));
  if (!(usingIterator instanceof UndefinedValue)) {
    if (IsConstructor(C) === true) {
      A = Q(Construct(C));
    } else {
      A = X(ArrayCreate(NewValue(0)));
    }
    const iteratorRecord = Q(GetIterator(items, 'sync', usingIterator));
    let k = 0;
    while (true) {
      if (k > (2 ** 53) - 1) {
        const error = new ThrowCompletion(Construct(surroundingAgent.intrinsic('%TypeError%')));
        return Q(IteratorClose(iteratorRecord, error));
      }
      const Pk = X(ToString(NewValue(k)));
      const next = Q(IteratorStep(iteratorRecord));
      if (next.isFalse()) {
        Q(Set(A, NewValue('length'), NewValue(k), NewValue(true)));
        return A;
      }
      const nextValue = IteratorValue(next);
      let mappedValue;
      if (mapping) {
        mappedValue = Call(mapfn, T, [nextValue, NewValue(k)]);
        if (mappedValue instanceof AbruptCompletion) {
          return Q(IteratorClose(iteratorRecord, mappedValue));
        }
        mappedValue = mappedValue.Value;
      } else {
        mappedValue = nextValue;
      }
      const defineStatus = CreateDataPropertyOrThrow(A, Pk, mappedValue);
      if (defineStatus instanceof AbruptCompletion) {
        return Q(IteratorClose(iteratorRecord, defineStatus));
      }
      k += 1;
    }
  }
  const arrayLike = X(ToObject(items));
  const len = Q(ToLength(Q(Get(arrayLike, NewValue('length')))));
  if (IsConstructor(C) === true) {
    A = Q(Construct(C, [len]));
  } else {
    A = Q(ArrayCreate(len));
  }
  let k = 0;
  while (k < len.numberValue()) {
    const Pk = X(ToString(NewValue(k)));
    const kValue = Q(Get(arrayLike, Pk));
    let mappedValue;
    if (mapping === true) {
      mappedValue = Q(Call(mapfn, T, [kValue, NewValue(k)]));
    } else {
      mappedValue = kValue;
    }
    Q(CreateDataPropertyOrThrow(A, Pk, mappedValue));
    k += 1;
  }
  Q(Set(A, NewValue('length'), len, NewValue(true)));
  return A;
}

function ArrayIsArray(realm, [arg]) {
  return Q(IsArray(arg));
}

function ArrayOf(realm, [...items], { thisValue }) {
  const len = items.length;
  // Let items be the List of arguments passed to this function.
  const C = thisValue;
  let A;
  if (IsConstructor(C) === true) {
    A = Q(Construct(C, [len]));
  } else {
    A = Q(ArrayCreate(NewValue(len)));
  }
  let k = 0;
  while (k < len) {
    const kValue = items[k];
    const Pk = X(ToString(NewValue(k)));
    Q(CreateDataPropertyOrThrow(A, Pk, kValue));
    k += 1;
  }
  Q(Set(A, NewValue('length'), NewValue(len), NewValue(true)));
  return A;
}

export function CreateArray(realmRec) {
  const constructor = CreateBuiltinFunction(ArrayConstructor, [], realmRec);

  constructor.DefineOwnProperty(NewValue('constructor'), {
    Value: realmRec.Intrinsics['%ArrayPrototype%'],
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%ArrayPrototype%'].DefineOwnProperty(
    NewValue('constructor'), {
      Value: constructor,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    },
  );

  [
    ['from', ArrayFrom],
    ['isArray', ArrayIsArray],
    ['of', ArrayOf],
  ].forEach(([name, fn]) => {
    constructor.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%Array%'] = constructor;
}
