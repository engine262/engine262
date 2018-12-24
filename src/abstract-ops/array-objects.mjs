import { surroundingAgent } from '../engine.mjs';
import {
  ArrayExoticObjectValue,
  Descriptor,
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  Assert,
  Construct,
  Get,
  GetFunctionRealm,
  IsAccessorDescriptor,
  IsArray,
  IsConstructor,
  ObjectCreate,
  OrdinaryDefineOwnProperty,
  OrdinaryGetOwnProperty,
  SameValue,
  ToBoolean,
  ToNumber,
  ToString,
  ToUint32,
} from './all.mjs';
import { Q, X } from '../completion.mjs';
import { msg } from '../helpers.mjs';

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

// 9.4.2.3 #sec-arrayspeciescreate
export function ArraySpeciesCreate(originalArray, length) {
  Assert(Type(length) === 'Number' && length.numberValue() >= 0);
  const isArray = Q(IsArray(originalArray));
  if (isArray === Value.false) {
    return Q(ArrayCreate(length));
  }
  let C = Q(Get(originalArray, new Value('constructor')));
  if (IsConstructor(C) === Value.true) {
    const thisRealm = surroundingAgent.currentRealmRecord;
    const realmC = Q(GetFunctionRealm(C));
    if (thisRealm !== realmC) {
      if (SameValue(C, realmC.Intrinsics['%Array%']) === Value.true) {
        C = Value.undefined;
      }
    }
  }
  if (Type(C) === 'Object') {
    C = Q(Get(C, wellKnownSymbols.species));
    if (Type(C) === 'Null') {
      C = Value.undefined;
    }
  }
  if (Type(C) === 'Undefined') {
    return Q(ArrayCreate(length));
  }
  if (IsConstructor(C) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', C));
  }
  return Q(Construct(C, [length]));
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

// 22.1.3.1.1 #sec-isconcatspreadable
export function IsConcatSpreadable(O) {
  if (Type(O) !== 'Object') {
    return Value.false;
  }
  const spreadable = Q(Get(O, wellKnownSymbols.isConcatSpreadable));
  if (spreadable !== Value.undefined) {
    return ToBoolean(spreadable);
  }
  return Q(IsArray(O));
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
