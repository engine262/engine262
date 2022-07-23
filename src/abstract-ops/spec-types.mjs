import { surroundingAgent } from '../engine.mjs';
import {
  BigIntValue,
  DataBlock,
  Descriptor,
  NumberValue,
  Type,
  Value,
} from '../value.mjs';
import { NormalCompletion, Q, X } from '../completion.mjs';
import {
  Assert,
  CreateDataProperty,
  Get,
  HasProperty,
  IsCallable,
  OrdinaryObjectCreate,
  ToBoolean,
} from './all.mjs';
import { isNonNegativeInteger } from './data-types-and-values.mjs';

// #𝔽
export function F(x) {
  Assert(typeof x === 'number');
  return new NumberValue(x);
}

// #ℤ
export function Z(x) {
  Assert(typeof x === 'bigint');
  return new BigIntValue(x);
}

// 6.2.5.1 IsAccessorDescriptor
export function IsAccessorDescriptor(Desc) {
  if (Type(Desc) === 'Undefined') {
    return false;
  }

  if (Desc.Get === undefined && Desc.Set === undefined) {
    return false;
  }

  return true;
}

// 6.2.5.2 IsDataDescriptor
export function IsDataDescriptor(Desc) {
  if (Type(Desc) === 'Undefined') {
    return false;
  }

  if (Desc.Value === undefined && Desc.Writable === undefined) {
    return false;
  }

  return true;
}

// 6.2.5.3 IsGenericDescriptor
export function IsGenericDescriptor(Desc) {
  if (Type(Desc) === 'Undefined') {
    return false;
  }

  if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
    return true;
  }

  return false;
}

// 6.2.5.4 #sec-frompropertydescriptor
export function FromPropertyDescriptor(Desc) {
  if (Type(Desc) === 'Undefined') {
    return Value.undefined;
  }
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  if (Desc.Value !== undefined) {
    X(CreateDataProperty(obj, new Value('value'), Desc.Value));
  }
  if (Desc.Writable !== undefined) {
    X(CreateDataProperty(obj, new Value('writable'), Desc.Writable));
  }
  if (Desc.Get !== undefined) {
    X(CreateDataProperty(obj, new Value('get'), Desc.Get));
  }
  if (Desc.Set !== undefined) {
    X(CreateDataProperty(obj, new Value('set'), Desc.Set));
  }
  if (Desc.Enumerable !== undefined) {
    X(CreateDataProperty(obj, new Value('enumerable'), Desc.Enumerable));
  }
  if (Desc.Configurable !== undefined) {
    X(CreateDataProperty(obj, new Value('configurable'), Desc.Configurable));
  }
  // Assert: All of the above CreateDataProperty operations return true.
  return obj;
}

// 6.2.5.5 #sec-topropertydescriptor
export function ToPropertyDescriptor(Obj) {
  if (Type(Obj) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', Obj);
  }

  const desc = Descriptor({});
  const hasEnumerable = Q(HasProperty(Obj, new Value('enumerable')));
  if (hasEnumerable === Value.true) {
    const enumerable = ToBoolean(Q(Get(Obj, new Value('enumerable'))));
    desc.Enumerable = enumerable;
  }
  const hasConfigurable = Q(HasProperty(Obj, new Value('configurable')));
  if (hasConfigurable === Value.true) {
    const conf = ToBoolean(Q(Get(Obj, new Value('configurable'))));
    desc.Configurable = conf;
  }
  const hasValue = Q(HasProperty(Obj, new Value('value')));
  if (hasValue === Value.true) {
    const value = Q(Get(Obj, new Value('value')));
    desc.Value = value;
  }
  const hasWritable = Q(HasProperty(Obj, new Value('writable')));
  if (hasWritable === Value.true) {
    const writable = ToBoolean(Q(Get(Obj, new Value('writable'))));
    desc.Writable = writable;
  }
  const hasGet = Q(HasProperty(Obj, new Value('get')));
  if (hasGet === Value.true) {
    const getter = Q(Get(Obj, new Value('get')));
    if (IsCallable(getter) === Value.false && Type(getter) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', getter);
    }
    desc.Get = getter;
  }
  const hasSet = Q(HasProperty(Obj, new Value('set')));
  if (hasSet === Value.true) {
    const setter = Q(Get(Obj, new Value('set')));
    if (IsCallable(setter) === Value.false && Type(setter) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', setter);
    }
    desc.Set = setter;
  }
  if (desc.Get !== undefined || desc.Set !== undefined) {
    if (desc.Value !== undefined || desc.Writable !== undefined) {
      return surroundingAgent.Throw('TypeError', 'InvalidPropertyDescriptor');
    }
  }
  return desc;
}

// 6.2.5.6 #sec-completepropertydescriptor
export function CompletePropertyDescriptor(Desc) {
  Assert(Type(Desc) === 'Descriptor');
  const like = Descriptor({
    Value: Value.undefined,
    Writable: Value.false,
    Get: Value.undefined,
    Set: Value.undefined,
    Enumerable: Value.false,
    Configurable: Value.false,
  });
  if (IsGenericDescriptor(Desc) || IsDataDescriptor(Desc)) {
    if (Desc.Value === undefined) {
      Desc.Value = like.Value;
    }
    if (Desc.Writable === undefined) {
      Desc.Writable = like.Writable;
    }
  } else {
    if (Desc.Get === undefined) {
      Desc.Get = like.Get;
    }
    if (Desc.Set === undefined) {
      Desc.Set = like.Set;
    }
  }
  if (Desc.Enumerable === undefined) {
    Desc.Enumerable = like.Enumerable;
  }
  if (Desc.Configurable === undefined) {
    Desc.Configurable = like.Configurable;
  }
  return Desc;
}

// 6.2.7.1 #sec-createbytedatablock
export function CreateByteDataBlock(size) {
  Assert(isNonNegativeInteger(size));
  let db;
  try {
    db = new DataBlock(size);
  } catch (err) {
    return surroundingAgent.Throw('RangeError', 'CannotAllocateDataBlock');
  }
  return db;
}

// 6.2.7.3 #sec-copydatablockbytes
export function CopyDataBlockBytes(toBlock, toIndex, fromBlock, fromIndex, count) {
  Assert(fromBlock !== toBlock);
  Assert(Type(fromBlock) === 'Data Block' || Type(fromBlock) === 'Shared Data Block');
  Assert(Type(toBlock) === 'Data Block' || Type(toBlock) === 'Shared Data Block');
  Assert(Number.isSafeInteger(fromIndex) && fromIndex >= 0);
  Assert(Number.isSafeInteger(toIndex) && toIndex >= 0);
  Assert(Number.isSafeInteger(count) && count >= 0);
  const fromSize = fromBlock.byteLength;
  Assert(fromIndex + count <= fromSize);
  const toSize = toBlock.byteLength;
  Assert(toIndex + count <= toSize);
  while (count > 0) {
    if (Type(fromBlock) === 'Shared Data Block') {
      Assert(false);
    } else {
      Assert(Type(toBlock) !== 'Shared Data Block');
      toBlock[toIndex] = fromBlock[fromIndex];
    }
    toIndex += 1;
    fromIndex += 1;
    count -= 1;
  }
  return NormalCompletion(undefined);
}
