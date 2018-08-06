/* @flow */

/* ::
import type {
  Value,
  NumberValue,
  ObjectValue,
} from '../value.mjs';
*/

import {
  surroundingAgent,
} from '../engine.mjs';
import {
  AbruptCompletion,
  ThrowCompletion,
} from '../completions.mjs';
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
} from '../abstract-ops/all.mjs';

import {
  Type,
  ArrayValue,
  UndefinedValue,
  New as NewValue,
} from '../value.mjs';

export function ArrayCreate(length /* : NumberValue */, proto /* : ?Value */) {
  Assert(length.numberValue() >= 0);
  if (Object.is(length.numberValue(), -0)) {
    length = NewValue(0);
  }
  if (length.numberValue() > (2 ** 32) - 1) {
    surroundingAgent.Throw('RangeError');
  }
  if (proto instanceof UndefinedValue) {
    proto = surroundingAgent.intrinsic('%ArrayPrototype%');
  }
  const A = new ArrayValue(surroundingAgent.currentRealmRecord);

  // Set A's essential internal methods except for [[DefineOwnProperty]]
  // to the default ordinary object definitions specified in 9.1.

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
        surroundingAgent.Throw('RangeError');
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
}

function ArrayFrom(realm, argList, { thisArgument }) {
  const [items, mapfn, thisArg] = argList;
  const C = thisArgument;
  let mapping;
  let T;
  let A;
  if (mapfn instanceof UndefinedValue) {
    mapping = false;
  } else {
    if (IsCallable(mapfn) === false) {
      surroundingAgent.Throw('TypeError');
    }
    if (argList.length >= 3) {
      T = thisArg;
    } else {
      T = new UndefinedValue();
    }
    mapping = true;
  }
  const usingIterator = GetMethod(items, surroundingAgent.intrinsic('@@iterator'));
  if (!(usingIterator instanceof UndefinedValue)) {
    if (IsConstructor(C) === true) {
      A = Construct(C);
    } else {
      A = ArrayCreate(NewValue(0));
    }
    const iteratorRecord = GetIterator(items, 'sync', usingIterator);
    let k = 0;
    while (true) {
      if (k > (2 ** 53) - 1) {
        const error = new ThrowCompletion(Construct(surroundingAgent.intrinsic('%TypeError%')));
        return IteratorClose(iteratorRecord, error);
      }
      const Pk = ToString(NewValue(k));
      const next = IteratorStep(iteratorRecord);
      if (next.isFalse()) {
        Set(A, NewValue('length'), NewValue(k), NewValue(true));
        return A;
      }
      const nextValue = IteratorValue(next);
      let mappedValue;
      if (mapping) {
        // If mappedValue is an abrupt completion,
        // return ? IteratorClose(iteratorRecord, mappedValue).
        try {
          mappedValue = Call(mapfn, T, [nextValue, NewValue(k)]);
        } catch (e) {
          if (e instanceof AbruptCompletion) {
            return IteratorClose(iteratorRecord, e);
          } else {
            throw e;
          }
        }
        mappedValue = mappedValue.Value;
      } else {
        mappedValue = nextValue;
      }
      // If defineStatus is an abrupt completion,
      // return ? IteratorClose(iteratorRecord, defineStatus).
      try {
        CreateDataPropertyOrThrow(A, Pk, mappedValue);
      } catch (defineStatus) {
        if (defineStatus instanceof AbruptCompletion) {
          return IteratorClose(iteratorRecord, defineStatus);
        } else {
          throw defineStatus;
        }
      }
      k += 1;
    }
  }
  const arrayLike = ToObject(items);
  const len = ToLength(Get(arrayLike, NewValue('length')));
  if (IsConstructor(C) === true) {
    A = Construct(C, [len]);
  } else {
    A = ArrayCreate(len);
  }
  let k = 0;
  while (k < len.numberValue()) {
    const Pk = ToString(NewValue(k));
    const kValue = Get(arrayLike, Pk);
    let mappedValue;
    if (mapping === true) {
      mappedValue = Call(mapfn, T, [kValue, NewValue(k)]);
    } else {
      mappedValue = kValue;
    }
    CreateDataPropertyOrThrow(A, Pk, mappedValue);
    k += 1;
  }
  Set(A, NewValue('length'), len, NewValue(true));
  return A;
}

function ArrayIsArray(realm, [arg]) {
  return IsArray(arg);
}

function ArrayOf(realm, [...items], { thisArgument }) {
  const len = items.length;
  // Let items be the List of arguments passed to this function.
  const C = thisArgument;
  let A;
  if (IsConstructor(C) === true) {
    A = Construct(C, [len]);
  } else {
    A = ArrayCreate(NewValue(len));
  }
  let k = 0;
  while (k < len) {
    const kValue = items[k];
    const Pk = ToString(NewValue(k));
    CreateDataPropertyOrThrow(A, Pk, kValue);
    k += 1;
  }
  Set(A, NewValue('length'), NewValue(len), NewValue(true));
  return A;
 }

export function CreateArray(realmRec /* : Realm */) {
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
