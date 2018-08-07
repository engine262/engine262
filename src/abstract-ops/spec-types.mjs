/* ::
export type List<T> = T[];
declare type PropertyDescriptor = {
  Value: ?Value,
  Get: ?FunctionValue,
  Set: ?FunctionValue,
  Writable: ?boolean,
  Enumerable: boolean,
  Configurable: boolean,
};
export type { PropertyDescriptor };
*/

import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Type,
  UndefinedValue,
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
import { Q, X } from '../completion.mjs';

// 6.2.5.1 IsAccessorDescriptor
export function IsAccessorDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Get' in Desc) && !('Set' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.2 IsDataDescriptor
export function IsDataDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc === undefined) {
    return false;
  }

  if (!('Value' in Desc) && !('Writable' in Desc)) {
    return false;
  }

  return true;
}

// 6.2.5.3 IsGenericDescriptor
export function IsGenericDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc === undefined) {
    return false;
  }

  if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
    return false;
  }

  return true;
}

// #sec-frompropertydescriptor FromPropertyDescriptor
export function FromPropertyDescriptor(Desc /* : PropertyDescriptor */) {
  if (Desc instanceof UndefinedValue) {
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
export function ToPropertyDescriptor(Obj /* : Value */) /* : PropertyDescriptor */ {
  if (Type(Obj) !== 'Object') {
    surroundingAgent.Throw('TypeError');
  }
  const desc = {};
  const hasEnumerable = Q(HasProperty(Obj, NewValue('enumerable')));
  if (hasEnumerable.isTrue()) {
    const enumerable = ToBoolean(Q(Get(Obj, NewValue('enumerable'))));
    desc.Enumerable = enumerable.booleanValue();
  }
  const hasConfigurable = Q(HasProperty(Obj, NewValue('configurable')));
  if (hasConfigurable.isTrue()) {
    const conf = ToBoolean(Q(Get(Obj, NewValue('configurable'))));
    desc.Configurable = conf.booleanValue();
  }
  const hasValue = Q(HasProperty(Obj, NewValue('value')));
  if (hasValue.isTrue()) {
    const value = Q(Get(Obj, NewValue('value')));
    desc.Value = value;
  }
  const hasWritable = Q(HasProperty(Obj, NewValue('writable')));
  if (hasWritable.isTrue()) {
    const writable = ToBoolean(Q(Get(Obj, NewValue('writable'))));
    desc.Writable = writable.booleanValue();
  }
  const hasGet = Q(HasProperty(Obj, NewValue('get')));
  if (hasGet.isTrue()) {
    const getter = Q(Get(Obj, NewValue('get')));
    if (IsCallable(getter).isFalse() && !(getter instanceof UndefinedValue)) {
      surroundingAgent.Throw('TypeError');
    }
    desc.Get = getter;
  }
  const hasSet = Q(HasProperty(Obj, NewValue('set')));
  if (hasSet.isTrue()) {
    const setter = Q(Get(Obj, NewValue('set')));
    if (IsCallable(setter).isFalse() && !(setter instanceof UndefinedValue)) {
      surroundingAgent.Throw('TypeError');
    }
    desc.Set = setter;
  }
  if ('Get' in desc || 'Set' in desc) {
    if ('Value' in desc || 'Writable' in desc) {
      surroundingAgent.Throw('TypeError');
    }
  }
  return desc;
}
