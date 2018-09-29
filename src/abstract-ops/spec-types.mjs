import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Value,
  Type,
  Descriptor,
} from '../value.mjs';
import {
  CreateDataProperty,
  Get,
  HasProperty,
  IsCallable,
  ObjectCreate,
  ToBoolean,
} from './all.mjs';
import { Q } from '../completion.mjs';

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

// #sec-frompropertydescriptor FromPropertyDescriptor
export function FromPropertyDescriptor(Desc) {
  if (Type(Desc) === 'Undefined') {
    return new Value(undefined);
  }
  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  if (Desc.Value !== undefined) {
    CreateDataProperty(obj, new Value('value'), Desc.Value);
  }
  if (Desc.Writable !== undefined) {
    CreateDataProperty(obj, new Value('writable'), Desc.Writable);
  }
  if (Desc.Get !== undefined) {
    CreateDataProperty(obj, new Value('get'), Desc.Get);
  }
  if (Desc.Set !== undefined) {
    CreateDataProperty(obj, new Value('set'), Desc.Set);
  }
  if (Desc.Enumerable !== undefined) {
    CreateDataProperty(obj, new Value('enumerable'), Desc.Enumerable);
  }
  if (Desc.Configurable !== undefined) {
    CreateDataProperty(obj, new Value('configurable'), Desc.Configurable);
  }
  // Assert: All of the above CreateDataProperty operations return true.
  return obj;
}

// #sec-topropertydescriptor ToPropertyDescriptor
export function ToPropertyDescriptor(Obj) {
  if (Type(Obj) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }

  const desc = Descriptor({});
  const hasEnumerable = Q(HasProperty(Obj, new Value('enumerable')));
  if (hasEnumerable.isTrue()) {
    const enumerable = ToBoolean(Q(Get(Obj, new Value('enumerable'))));
    desc.Enumerable = enumerable;
  }
  const hasConfigurable = Q(HasProperty(Obj, new Value('configurable')));
  if (hasConfigurable.isTrue()) {
    const conf = ToBoolean(Q(Get(Obj, new Value('configurable'))));
    desc.Configurable = conf;
  }
  const hasValue = Q(HasProperty(Obj, new Value('value')));
  if (hasValue.isTrue()) {
    const value = Q(Get(Obj, new Value('value')));
    desc.Value = value;
  }
  const hasWritable = Q(HasProperty(Obj, new Value('writable')));
  if (hasWritable.isTrue()) {
    const writable = ToBoolean(Q(Get(Obj, new Value('writable'))));
    desc.Writable = writable;
  }
  const hasGet = Q(HasProperty(Obj, new Value('get')));
  if (hasGet.isTrue()) {
    const getter = Q(Get(Obj, new Value('get')));
    if (IsCallable(getter).isFalse() && Type(getter) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
    desc.Get = getter;
  }
  const hasSet = Q(HasProperty(Obj, new Value('set')));
  if (hasSet.isTrue()) {
    const setter = Q(Get(Obj, new Value('set')));
    if (IsCallable(setter).isFalse() && Type(setter) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
    desc.Set = setter;
  }
  if (desc.Get !== undefined || desc.Set !== undefined) {
    if (desc.Value !== undefined || desc.Writable !== undefined) {
      return surroundingAgent.Throw('TypeError', 'invalid descriptor');
    }
  }
  return desc;
}

// #sec-completepropertydescriptor
export function CompletePropertyDescriptor(Desc) {
  // Assert: Desc is a Property Descriptor.
  const like = {
    Value: new Value(undefined),
    Writable: false,
    Get: new Value(undefined),
    Set: new Value(undefined),
    Enumerable: false,
    Configurable: false,
  };
  if (IsGenericDescriptor(Desc).isTrue() || IsDataDescriptor(Desc).isTrue()) {
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
