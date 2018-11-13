import {
  surroundingAgent,
} from '../engine.mjs';
import {
  AbruptCompletion,
  Q,
  ThrowCompletion, X,
} from '../completion.mjs';
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
  ToLength,
  ToObject,
  ToString,
  ToUint32,
} from '../abstract-ops/all.mjs';
import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import { OutOfRange } from '../helpers.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function ArrayConstructor(argumentsList, { NewTarget, callLength }) {
  const numberOfArgs = callLength;
  if (numberOfArgs === 0) {
    // 22.1.1.1 Array ( )
    Assert(numberOfArgs === 0);
    if (Type(NewTarget) === 'Undefined') {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    return ArrayCreate(new Value(0), proto);
  } else if (numberOfArgs === 1) {
    // #sec-array-len Array ( len )
    const [len] = argumentsList;
    Assert(numberOfArgs === 1);
    if (Type(NewTarget) === 'Undefined') {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    const array = ArrayCreate(new Value(0), proto);
    let intLen;
    if (Type(len) !== 'Number') {
      const defineStatus = CreateDataProperty(array, new Value('0'), len);
      Assert(defineStatus === Value.true);
      intLen = new Value(1);
    } else {
      intLen = ToUint32(len);
      if (intLen.numberValue() !== len.numberValue()) {
        return surroundingAgent.Throw('RangeError');
      }
    }
    Set(array, new Value('length'), intLen, Value.true);
    return array;
  } else if (numberOfArgs >= 2) {
    // #sec-array-items Array ( ...items )
    Assert(numberOfArgs >= 2);
    if (Type(NewTarget) === 'Undefined') {
      NewTarget = surroundingAgent.activeFunctionObject;
    }
    const proto = GetPrototypeFromConstructor(NewTarget, '%ArrayPrototype%');
    const array = ArrayCreate(new Value(0), proto);
    let k = 0;
    const items = argumentsList;
    while (k < numberOfArgs) {
      const Pk = ToString(new Value(k));
      const itemK = items[k];
      const defineStatus = CreateDataProperty(array, Pk, itemK);
      Assert(defineStatus === Value.true);
      k += 1;
    }
    Assert(X(Get(array, new Value('length'))).numberValue() === numberOfArgs);
    return array;
  }

  throw new OutOfRange('ArrayConstructor', numberOfArgs);
}

function ArrayFrom(argList, { thisValue }) {
  const [items, mapfn = Value.undefined, thisArg] = argList;
  const C = thisValue;
  let mapping;
  let T;
  let A;
  if (Type(mapfn) === 'Undefined') {
    mapping = false;
  } else {
    if (IsCallable(mapfn) === false) {
      return surroundingAgent.Throw('TypeError');
    }
    if (argList.length >= 3) {
      T = thisArg;
    } else {
      T = Value.undefined;
    }
    mapping = true;
  }
  const usingIterator = Q(GetMethod(items, wellKnownSymbols.iterator));
  if (Type(usingIterator) !== 'Undefined') {
    if (IsConstructor(C) === Value.true) {
      A = Q(Construct(C));
    } else {
      A = X(ArrayCreate(new Value(0)));
    }
    const iteratorRecord = Q(GetIterator(items, 'sync', usingIterator));
    let k = 0;
    while (true) { // eslint-disable-line no-constant-condition
      if (k > (2 ** 53) - 1) {
        const error = new ThrowCompletion(Construct(surroundingAgent.intrinsic('%TypeError%')));
        return Q(IteratorClose(iteratorRecord, error));
      }
      const Pk = X(ToString(new Value(k)));
      const next = Q(IteratorStep(iteratorRecord));
      if (next === Value.false) {
        Q(Set(A, new Value('length'), new Value(k), Value.true));
        return A;
      }
      const nextValue = IteratorValue(next);
      let mappedValue;
      if (mapping) {
        mappedValue = Call(mapfn, T, [nextValue, new Value(k)]);
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
  const lenProp = Q(Get(arrayLike, new Value('length')));
  const len = Q(ToLength(lenProp));
  if (IsConstructor(C) === Value.true) {
    A = Q(Construct(C, [len]));
  } else {
    A = Q(ArrayCreate(len));
  }
  let k = 0;
  while (k < len.numberValue()) {
    const Pk = X(ToString(new Value(k)));
    const kValue = Q(Get(arrayLike, Pk));
    let mappedValue;
    if (mapping === true) {
      mappedValue = Q(Call(mapfn, T, [kValue, new Value(k)]));
    } else {
      mappedValue = kValue;
    }
    Q(CreateDataPropertyOrThrow(A, Pk, mappedValue));
    k += 1;
  }
  Q(Set(A, new Value('length'), len, Value.true));
  return A;
}

function ArrayIsArray([arg]) {
  return Q(IsArray(arg));
}

function ArrayOf([...items], { thisValue }) {
  const len = items.length;
  // Let items be the List of arguments passed to this function.
  const C = thisValue;
  let A;
  if (IsConstructor(C) === Value.true) {
    A = Q(Construct(C, [len]));
  } else {
    A = Q(ArrayCreate(new Value(len)));
  }
  let k = 0;
  while (k < len) {
    const kValue = items[k];
    const Pk = X(ToString(new Value(k)));
    Q(CreateDataPropertyOrThrow(A, Pk, kValue));
    k += 1;
  }
  Q(Set(A, new Value('length'), new Value(len), Value.true));
  return A;
}

export function CreateArray(realmRec) {
  const proto = realmRec.Intrinsics['%ArrayPrototype%'];

  const cons = BootstrapConstructor(realmRec, ArrayConstructor, 'Array', 1, proto, [
    ['from', ArrayFrom, 1],
    ['isArray', ArrayIsArray, 1],
    ['of', ArrayOf, 0],
  ]);

  realmRec.Intrinsics['%Array%'] = cons;
}
