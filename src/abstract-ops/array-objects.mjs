import { surroundingAgent } from '../engine.mjs';
import {
  ArrayExoticObjectValue,
  Descriptor,
  Type,
  Value,
} from '../value.mjs';
import {
  Assert,
  IsAccessorDescriptor,
  ObjectCreate,
  OrdinaryDefineOwnProperty,
  OrdinaryGetOwnProperty,
  ToNumber,
  ToString,
  ToUint32,
} from './all.mjs';
import { Q, X } from '../completion.mjs';

// This file covers abstract operations defined in
// 9.4.2 #sec-array-exotic-objects
// and
// 22.1 #sec-array-objects

// 9.4.2.2 #sec-arraycreate
export function ArrayCreate(length, proto) {
  Assert(length.numberValue() >= 0);
  if (Object.is(length.numberValue(), -0)) {
    length = new Value(0);
  }
  if (length.numberValue() > (2 ** 32) - 1) {
    return surroundingAgent.Throw('RangeError');
  }
  if (proto === undefined) {
    proto = surroundingAgent.intrinsic('%ArrayPrototype%');
  }
  const A = new ArrayExoticObjectValue();

  // Set A's essential internal methods except for [[DefineOwnProperty]]
  // to the default ordinary object definitions specified in 9.1.

  A.Prototype = proto;
  A.Extensible = Value.true;

  X(OrdinaryDefineOwnProperty(A, new Value('length'), Descriptor({
    Value: length,
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.false,
  })));

  return A;
}

// 9.4.2.4 #sec-arraysetlength
export function ArraySetLength(A, Desc) {
  if (Desc.Value === undefined) {
    return OrdinaryDefineOwnProperty(A, new Value('length'), Desc);
  }
  const newLenDesc = Descriptor({ ...Desc });
  const newLen = Q(ToUint32(Desc.Value)).numberValue();
  const numberLen = Q(ToNumber(Desc.Value)).numberValue();
  if (newLen !== numberLen) {
    return surroundingAgent.Throw('RangeError', 'Invalid array length');
  }
  newLenDesc.Value = new Value(newLen);
  const oldLenDesc = OrdinaryGetOwnProperty(A, new Value('length'));
  Assert(Type(oldLenDesc) !== 'Undefined' && !IsAccessorDescriptor(oldLenDesc));
  let oldLen = oldLenDesc.Value.numberValue();
  if (newLen >= oldLen) {
    return OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc);
  }
  if (oldLenDesc.Writable === Value.false) {
    return Value.false;
  }
  let newWritable;
  if (newLenDesc.Writable === undefined || newLenDesc.Writable === Value.true) {
    newWritable = true;
  } else {
    newWritable = false;
    newLenDesc.Writable = Value.true;
  }
  const succeeded = X(OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc));
  if (succeeded === Value.false) {
    return Value.false;
  }
  while (newLen < oldLen) {
    oldLen -= 1;
    const idxToDelete = X(ToString(new Value(oldLen)));
    const deleteSucceeded = X(A.Delete(idxToDelete));
    if (deleteSucceeded === Value.false) {
      newLenDesc.Value = new Value(oldLen + 1);
      if (newWritable === false) {
        newLenDesc.Writable = Value.false;
      }
      X(OrdinaryDefineOwnProperty(A, new Value('length'), newLenDesc));
      return Value.false;
    }
  }
  if (newWritable === false) {
    OrdinaryDefineOwnProperty(A, new Value('length'), Descriptor({ Writable: Value.false }));
  }
  return Value.true;
}

// 22.1.5.1 #sec-createarrayiterator
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
