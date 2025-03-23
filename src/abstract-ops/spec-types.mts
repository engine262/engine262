import { surroundingAgent } from '../host-defined/engine.mts';
import {
  BigIntValue,
  DataBlock,
  Descriptor,
  NumberValue,
  ObjectValue,
  UndefinedValue,
  Value,
  BooleanValue,
} from '../value.mts';
import { NormalCompletion, Q, X } from '../completion.mts';
import type { PlainEvaluator } from '../evaluator.mts';
import {
  Assert,
  CreateDataProperty,
  Get,
  HasProperty,
  IsCallable,
  OrdinaryObjectCreate,
  ToBoolean,
  type FunctionObject,
} from './all.mts';
import { isNonNegativeInteger } from './data-types-and-values.mts';

// #𝔽
export function F(x: number): NumberValue {
  Assert(typeof x === 'number');
  return Value(x);
}

// #ℤ
export function Z(x: bigint): BigIntValue {
  Assert(typeof x === 'bigint');
  return Value(x);
}

// #ℝ
export function R(x: NumberValue): number;
export function R(x: BigIntValue): bigint;
export function R(x: BigIntValue | NumberValue): bigint | number;
export function R(x: unknown) {
  if (x instanceof BigIntValue) {
    return x.bigintValue(); // eslint-disable-line @engine262/mathematical-value
  }
  Assert(x instanceof NumberValue);
  return x.numberValue(); // eslint-disable-line @engine262/mathematical-value
}

// 6.2.5.1 IsAccessorDescriptor
export function IsAccessorDescriptor(Desc: Descriptor | UndefinedValue): Desc is Descriptor & { Get: Value; Set: Value } {
  if (Desc instanceof UndefinedValue) {
    return false;
  }

  if (Desc.Get === undefined && Desc.Set === undefined) {
    return false;
  }

  return true;
}

// 6.2.5.2 IsDataDescriptor
export function IsDataDescriptor(Desc: Descriptor | UndefinedValue): Desc is Descriptor & { Value: Value; Writable: BooleanValue } {
  if (Desc instanceof UndefinedValue) {
    return false;
  }

  if (Desc.Value === undefined && Desc.Writable === undefined) {
    return false;
  }

  return true;
}

// 6.2.5.3 IsGenericDescriptor
export function IsGenericDescriptor(Desc: Descriptor | UndefinedValue) {
  if (Desc instanceof UndefinedValue) {
    return false;
  }

  if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
    return true;
  }

  return false;
}

/** https://tc39.es/ecma262/#sec-frompropertydescriptor */
export function FromPropertyDescriptor(Desc: Descriptor | UndefinedValue) {
  if (Desc instanceof UndefinedValue) {
    return Value.undefined;
  }
  const obj = OrdinaryObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  if (Desc.Value !== undefined) {
    X(CreateDataProperty(obj, Value('value'), Desc.Value));
  }
  if (Desc.Writable !== undefined) {
    X(CreateDataProperty(obj, Value('writable'), Desc.Writable));
  }
  if (Desc.Get !== undefined) {
    X(CreateDataProperty(obj, Value('get'), Desc.Get));
  }
  if (Desc.Set !== undefined) {
    X(CreateDataProperty(obj, Value('set'), Desc.Set));
  }
  if (Desc.Enumerable !== undefined) {
    X(CreateDataProperty(obj, Value('enumerable'), Desc.Enumerable));
  }
  if (Desc.Configurable !== undefined) {
    X(CreateDataProperty(obj, Value('configurable'), Desc.Configurable));
  }
  // Assert: All of the above CreateDataProperty operations return true.
  return obj;
}

/** https://tc39.es/ecma262/#sec-topropertydescriptor */
export function* ToPropertyDescriptor(Obj: Value): PlainEvaluator<Descriptor> {
  if (!(Obj instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', Obj);
  }

  let desc = Descriptor({});
  const hasEnumerable = Q(yield* HasProperty(Obj, Value('enumerable')));
  if (hasEnumerable === Value.true) {
    const enumerable = ToBoolean(Q(yield* Get(Obj, Value('enumerable'))));
    desc = Descriptor({ ...desc, Enumerable: enumerable });
  }
  const hasConfigurable = Q(yield* HasProperty(Obj, Value('configurable')));
  if (hasConfigurable === Value.true) {
    const conf = ToBoolean(Q(yield* Get(Obj, Value('configurable'))));
    desc = Descriptor({ ...desc, Configurable: conf });
  }
  const hasValue = Q(yield* HasProperty(Obj, Value('value')));
  if (hasValue === Value.true) {
    const value = Q(yield* Get(Obj, Value('value')));
    desc = Descriptor({ ...desc, Value: value });
  }
  const hasWritable = Q(yield* HasProperty(Obj, Value('writable')));
  if (hasWritable === Value.true) {
    const writable = ToBoolean(Q(yield* Get(Obj, Value('writable'))));
    desc = Descriptor({ ...desc, Writable: writable });
  }
  const hasGet = Q(yield* HasProperty(Obj, Value('get')));
  if (hasGet === Value.true) {
    const getter = Q(yield* Get(Obj, Value('get')));
    if (IsCallable(getter) === Value.false && !(getter instanceof UndefinedValue)) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', getter);
    }
    desc = Descriptor({ ...desc, Get: getter as FunctionObject });
  }
  const hasSet = Q(yield* HasProperty(Obj, Value('set')));
  if (hasSet === Value.true) {
    const setter = Q(yield* Get(Obj, Value('set')));
    if (IsCallable(setter) === Value.false && !(setter instanceof UndefinedValue)) {
      return surroundingAgent.Throw('TypeError', 'NotAFunction', setter);
    }
    desc = Descriptor({ ...desc, Set: setter as FunctionObject });
  }
  if (desc.Get !== undefined || desc.Set !== undefined) {
    if (desc.Value !== undefined || desc.Writable !== undefined) {
      return surroundingAgent.Throw('TypeError', 'InvalidPropertyDescriptor');
    }
  }
  return desc;
}

/** https://tc39.es/ecma262/#sec-completepropertydescriptor */
export function CompletePropertyDescriptor(Desc: Descriptor) {
  Assert(Desc instanceof Descriptor);
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
      Desc = Descriptor({ ...Desc, Value: like.Value });
    }
    if (Desc.Writable === undefined) {
      Desc = Descriptor({ ...Desc, Writable: like.Writable });
    }
  } else {
    if (Desc.Get === undefined) {
      Desc = Descriptor({ ...Desc, Get: like.Get });
    }
    if (Desc.Set === undefined) {
      Desc = Descriptor({ ...Desc, Set: like.Set });
    }
  }
  if (Desc.Enumerable === undefined) {
    Desc = Descriptor({ ...Desc, Enumerable: like.Enumerable });
  }
  if (Desc.Configurable === undefined) {
    Desc = Descriptor({ ...Desc, Configurable: like.Configurable });
  }
  return Desc;
}

/** https://tc39.es/ecma262/#sec-createbytedatablock */
export function CreateByteDataBlock(size: number) {
  Assert(isNonNegativeInteger(size));
  let db;
  try {
    db = new DataBlock(size);
  } catch (err) {
    return surroundingAgent.Throw('RangeError', 'CannotAllocateDataBlock');
  }
  return db;
}

/** https://tc39.es/ecma262/#sec-copydatablockbytes */
export function CopyDataBlockBytes(toBlock: DataBlock, toIndex: number, fromBlock: DataBlock, fromIndex: number, count: number) {
  Assert(fromBlock !== toBlock);
  Assert(Number.isSafeInteger(fromIndex) && fromIndex >= 0);
  Assert(Number.isSafeInteger(toIndex) && toIndex >= 0);
  Assert(Number.isSafeInteger(count) && count >= 0);
  const fromSize = fromBlock.byteLength;
  Assert(fromIndex + count <= fromSize);
  const toSize = toBlock.byteLength;
  Assert(toIndex + count <= toSize);
  while (count > 0) {
    toBlock[toIndex] = fromBlock[fromIndex];
    toIndex += 1;
    fromIndex += 1;
    count -= 1;
  }
  return NormalCompletion(undefined);
}
