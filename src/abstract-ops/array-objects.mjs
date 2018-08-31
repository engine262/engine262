import { surroundingAgent } from '../engine.mjs';
import {
  New as NewValue,
  Type,
  ArrayValue,
} from '../value.mjs';
import {
  Assert,
  OrdinaryDefineOwnProperty,
  ObjectCreate,
} from './all.mjs';
import { X } from '../completion.mjs';

export function ArrayCreate(length, proto) {
  Assert(length.numberValue() >= 0);
  if (Object.is(length.numberValue(), -0)) {
    length = NewValue(0);
  }
  if (length.numberValue() > (2 ** 32) - 1) {
    return surroundingAgent.Throw('RangeError');
  }
  if (proto === undefined) {
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

export function CreateArrayIterator(array, kind) {
  Assert(Type(array) === 'Object');
  const iterator = ObjectCreate(surroundingAgent.intrinsic('%ArrayIteratorPrototype%'), [
    'IteratedObject',
    'ArrayIteratorNextIndex',
    'ArrayIterationKind',
  ]);
  iterator.IteratedObject = array;
  iterator.ArrayIteratorNextIndex = 0;
  iterator.ArrayIterationKind = kind;
  return iterator;
}
