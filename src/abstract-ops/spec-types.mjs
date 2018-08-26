import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Type,
  New as NewValue,
} from '../value.mjs';
import {
  IsCallable,
  Get,
  HasProperty,
  ToBoolean,
  CreateDataProperty,
  ObjectCreate,
} from './all.mjs';
import { Q } from '../completion.mjs';

// 6.2.5.1 IsAccessorDescriptor
export function IsAccessorDescriptor(Desc) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Get' in Desc) && !('Set' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.2 IsDataDescriptor
export function IsDataDescriptor(Desc) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Value' in Desc) && !('Writable' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.3 IsGenericDescriptor
export function IsGenericDescriptor(Desc) {
  if (Desc === undefined) {
    return false;
  }

  if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
    return false;
  }

  return true;
}

// #sec-frompropertydescriptor FromPropertyDescriptor
export function FromPropertyDescriptor(Desc) {
  if (Type(Desc) === 'Undefined') {
    return NewValue(undefined);
  }
  const obj = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  if ('Value' in Desc) {
    CreateDataProperty(obj, NewValue('value'), Desc.Value);
  }
  if ('Writable' in Desc) {
    CreateDataProperty(obj, NewValue('writable'), NewValue(Desc.Writable));
  }
  if ('Get' in Desc) {
    CreateDataProperty(obj, NewValue('get'), Desc.Get);
  }
  if ('Set' in Desc) {
    CreateDataProperty(obj, NewValue('set'), Desc.Set);
  }
  if ('Enumerable' in Desc) {
    CreateDataProperty(obj, NewValue('enumerable'), NewValue(Desc.Enumerable));
  }
  if ('Configurable' in Desc) {
    CreateDataProperty(obj, NewValue('configurable'), NewValue(Desc.Configurable));
  }
  // Assert: All of the above CreateDataProperty operations return true.
  return obj;
}

// #sec-topropertydescriptor ToPropertyDescriptor
export function ToPropertyDescriptor(Obj) {
  if (Type(Obj) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }

  const desc = {};
  const hasEnumerable = Q(HasProperty(Obj, NewValue('enumerable')));
  if (hasEnumerable.isTrue()) {
    const enumerable = ToBoolean(Q(Get(Obj, NewValue('enumerable'))));
    desc.Enumerable = enumerable.isTrue();
  }
  const hasConfigurable = Q(HasProperty(Obj, NewValue('configurable')));
  if (hasConfigurable.isTrue()) {
    const conf = ToBoolean(Q(Get(Obj, NewValue('configurable'))));
    desc.Configurable = conf.isTrue();
  }
  const hasValue = Q(HasProperty(Obj, NewValue('value')));
  if (hasValue.isTrue()) {
    const value = Q(Get(Obj, NewValue('value')));
    desc.Value = value;
  }
  const hasWritable = Q(HasProperty(Obj, NewValue('writable')));
  if (hasWritable.isTrue()) {
    const writable = ToBoolean(Q(Get(Obj, NewValue('writable'))));
    desc.Writable = writable.isTrue();
  }
  const hasGet = Q(HasProperty(Obj, NewValue('get')));
  if (hasGet.isTrue()) {
    const getter = Q(Get(Obj, NewValue('get')));
    if (IsCallable(getter).isFalse() && Type(getter) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
    desc.Get = getter;
  }
  const hasSet = Q(HasProperty(Obj, NewValue('set')));
  if (hasSet.isTrue()) {
    const setter = Q(Get(Obj, NewValue('set')));
    if (IsCallable(setter).isFalse() && Type(setter) !== 'Undefined') {
      return surroundingAgent.Throw('TypeError');
    }
    desc.Set = setter;
  }
  if ('Get' in desc || 'Set' in desc) {
    if ('Value' in desc || 'Writable' in desc) {
      return surroundingAgent.Throw('TypeError');
    }
  }
  return desc;
}

// #sec-completepropertydescriptor
export function CompletePropertyDescriptor(Desc) {
  // Assert: Desc is a Property Descriptor.
  const like = {
    Value: NewValue(undefined),
    Writable: false,
    Get: NewValue(undefined),
    Set: NewValue(undefined),
    Enumerable: false,
    Configurable: false,
  };
  if (IsGenericDescriptor(Desc).isTrue() || IsDataDescriptor(Desc).isTrue()) {
    if (!('Value' in Desc)) {
      Desc.Value = like.Value;
    }
    if (!('Writable' in Desc)) {
      Desc.Writable = like.Writable;
    }
  } else {
    if (!('Get' in Desc)) {
      Desc.Get = like.Get;
    }
    if (!('Set' in Desc)) {
      Desc.Set = like.Set;
    }
  }
  if (!('Enumerable' in Desc)) {
    Desc.Enumerable = like.Enumerable;
  }
  if (!('Configurable' in Desc)) {
    Desc.Configurable = like.Configurable;
  }
  return Desc;
}
