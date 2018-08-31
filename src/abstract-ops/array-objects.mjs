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
  ToUint32,
  ToNumber,
  OrdinaryGetOwnProperty,
  ToString,
  IsAccessorDescriptor,
} from './all.mjs';
import { Q, X } from '../completion.mjs';

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
  const A = new ArrayValue();

  // Set A's essential internal methods except for [[DefineOwnProperty]]
  // to the default ordinary object definitions specified in 9.1.

  A.Prototype = proto;
  A.Extensible = true;

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

// 9.4.2.4 ArraySetLength
export function ArraySetLength(A, Desc) {
  if (!('Value' in Desc)) {
    return OrdinaryDefineOwnProperty(A, NewValue('length'), Desc);
  }
  const newLenDesc = { ...Desc };
  const newLen = Q(ToUint32(Desc.Value)).numberValue();
  const numberLen = Q(ToNumber(Desc.Value)).numberValue();
  if (newLen !== numberLen) {
    return surroundingAgent.Throw('RangeError', 'Invalid array length');
  }
  newLenDesc.Value = NewValue(newLen);
  const oldLenDesc = OrdinaryGetOwnProperty(A, NewValue('length'));
  Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
  let oldLen = oldLenDesc.Value.numberValue();
  if (newLen >= oldLen) {
    return OrdinaryDefineOwnProperty(A, NewValue('length'), newLenDesc);
  }
  if (oldLenDesc.Writable === false) {
    return NewValue(false);
  }
  let newWritable;
  if (!('Writable' in newLenDesc) || newLenDesc.Writable === true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc.Writable = true;
  }
  const succeeded = X(OrdinaryDefineOwnProperty(A, NewValue('length'), newLenDesc));
  if (succeeded.isFalse()) {
    return NewValue(false);
  }
  while (newLen < oldLen) {
    oldLen -= 1;
    const deleteSucceeded = X(A.Delete(X(ToString(NewValue(oldLen)))));
    if (deleteSucceeded.isFalse()) {
      newLenDesc.Value = NewValue(oldLen + 1);
      if (newWritable === false) {
        newLenDesc.Writable = false;
      }
      X(OrdinaryDefineOwnProperty(A, NewValue('length'), newLenDesc));
      return NewValue(false);
    }
  }
  if (newWritable === false) {
    OrdinaryDefineOwnProperty(A, NewValue('length'), { Writable: false });
  }
  return NewValue(true);
}
