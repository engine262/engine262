// @ts-nocheck
import { surroundingAgent } from '../engine.mjs';
import {
  Call,
  Construct,
  CreateArrayFromList,
  CreateListFromArrayLike,
  FromPropertyDescriptor,
  IsCallable,
  IsConstructor,
  PrepareForTailCall,
  ToPropertyDescriptor,
  ToPropertyKey,
} from '../abstract-ops/all.mjs';
import { ObjectValue, Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { bootstrapPrototype } from './bootstrap.mjs';

/** https://tc39.es/ecma262/#sec-reflect.apply */
function Reflect_apply([target = Value.undefined, thisArgument = Value.undefined, argumentsList = Value.undefined]) {
  // 1. If IsCallable(target) is false, throw a TypeError exception.
  if (IsCallable(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAFunction', target);
  }
  // 2. Let args be ? CreateListFromArrayLike(argumentsList).
  const args = Q(CreateListFromArrayLike(argumentsList));
  // 3. Perform PrepareForTailCall().
  PrepareForTailCall();
  // 4. Return ? Call(target, thisArgument, args).
  return Q(Call(target, thisArgument, args));
}

/** https://tc39.es/ecma262/#sec-reflect.construct */
function Reflect_construct([target = Value.undefined, argumentsList = Value.undefined, newTarget]) {
  // 1. If IsConstructor(target) is false, throw a TypeError exception.
  if (IsConstructor(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', target);
  }
  // 2. If newTarget is not present, set newTarget to target.
  if (newTarget === undefined) {
    newTarget = target;
  } else if (IsConstructor(newTarget) === Value.false) { // 3. Else if IsConstructor(newTarget) is false, throw a TypeError exception.
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', newTarget);
  }
  // 4. Let args be ? CreateListFromArrayLike(argumentsList).
  const args = Q(CreateListFromArrayLike(argumentsList));
  // 5. Return ? Construct(target, args, newTarget).
  return Q(Construct(target, args, newTarget));
}

/** https://tc39.es/ecma262/#sec-reflect.defineproperty */
function Reflect_defineProperty([target = Value.undefined, propertyKey = Value.undefined, attributes = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let key be ? ToPropertyKey(propertyKey).
  const key = Q(ToPropertyKey(propertyKey));
  // 3. Let desc be ? ToPropertyDescriptor(attributes).
  const desc = Q(ToPropertyDescriptor(attributes));
  // 4. Return ? target.[[DefineOwnProperty]](key, desc).
  return Q(target.DefineOwnProperty(key, desc));
}

/** https://tc39.es/ecma262/#sec-reflect.deleteproperty */
function Reflect_deleteProperty([target = Value.undefined, propertyKey = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let key be ? ToPropertyKey(propertyKey).
  const key = Q(ToPropertyKey(propertyKey));
  // 3. Return ? target.[[Delete]](key).
  return Q(target.Delete(key));
}

/** https://tc39.es/ecma262/#sec-reflect.get */
function Reflect_get([target = Value.undefined, propertyKey = Value.undefined, receiver]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let key be ? ToPropertyKey(propertyKey).
  const key = Q(ToPropertyKey(propertyKey));
  // 3. If receiver is not present, then
  if (receiver === undefined) {
    // a. Set receiver to target.
    receiver = target;
  }
  // 4. Return ? target.[[Get]](key, receiver).
  return Q(target.Get(key, receiver));
}

/** https://tc39.es/ecma262/#sec-reflect.getownpropertydescriptor */
function Reflect_getOwnPropertyDescriptor([target = Value.undefined, propertyKey = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let key be ? ToPropertyKey(propertyKey).
  const key = Q(ToPropertyKey(propertyKey));
  // 3. Let desc be ? target.[[GetOwnProperty]](key).
  const desc = Q(target.GetOwnProperty(key));
  // 4. Return FromPropertyDescriptor(desc).
  return FromPropertyDescriptor(desc);
}

/** https://tc39.es/ecma262/#sec-reflect.getprototypeof */
function Reflect_getPrototypeOf([target = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Return ? target.[[GetPrototypeOf]]().
  return Q(target.GetPrototypeOf());
}

/** https://tc39.es/ecma262/#sec-reflect.has */
function Reflect_has([target = Value.undefined, propertyKey = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let key be ? ToPropertyKey(propertyKey).
  const key = Q(ToPropertyKey(propertyKey));
  // 3. Return ? target.[[HasProperty]](key).
  return Q(target.HasProperty(key));
}

/** https://tc39.es/ecma262/#sec-reflect.isextensible */
function Reflect_isExtensible([target = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Return ? target.[[IsExtensible]]().
  return Q(target.IsExtensible());
}

/** https://tc39.es/ecma262/#sec-reflect.ownkeys */
function Reflect_ownKeys([target = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let keys be ? target.[[OwnPropertyKeys]]().
  const keys = Q(target.OwnPropertyKeys());
  // 3. Return CreateArrayFromList(keys).
  return CreateArrayFromList(keys);
}

/** https://tc39.es/ecma262/#sec-reflect.preventextensions */
function Reflect_preventExtensions([target = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Return ? target.[[PreventExtensions]]().
  return Q(target.PreventExtensions());
}

/** https://tc39.es/ecma262/#sec-reflect.set */
function Reflect_set([target = Value.undefined, propertyKey = Value.undefined, V = Value.undefined, receiver]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. Let key be ? ToPropertyKey(propertyKey).
  const key = Q(ToPropertyKey(propertyKey));
  // 3. If receiver is not present, then
  if (receiver === undefined) {
    receiver = target;
  }
  // 4. Return ? target.[[Set]](key, V, receiver).
  return Q(target.Set(key, V, receiver));
}

/** https://tc39.es/ecma262/#sec-reflect.setprototypeof */
function Reflect_setPrototypeOf([target = Value.undefined, proto = Value.undefined]) {
  // 1. If Type(target) is not Object, throw a TypeError exception.
  if (!(target instanceof ObjectValue)) {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', target);
  }
  // 2. If Type(proto) is not Object and proto is not null, throw a TypeError exception.
  if (!(proto instanceof ObjectValue) && proto !== Value.null) {
    return surroundingAgent.Throw('TypeError', 'ObjectPrototypeType');
  }
  // 3. Return ? target.[[SetPrototypeOf]](proto).
  return Q(target.SetPrototypeOf(proto));
}

export function bootstrapReflect(realmRec) {
  const reflect = bootstrapPrototype(realmRec, [
    ['apply', Reflect_apply, 3],
    ['construct', Reflect_construct, 2],
    ['defineProperty', Reflect_defineProperty, 3],
    ['deleteProperty', Reflect_deleteProperty, 2],
    ['get', Reflect_get, 2],
    ['getOwnPropertyDescriptor', Reflect_getOwnPropertyDescriptor, 2],
    ['getPrototypeOf', Reflect_getPrototypeOf, 1],
    ['has', Reflect_has, 2],
    ['isExtensible', Reflect_isExtensible, 1],
    ['ownKeys', Reflect_ownKeys, 1],
    ['preventExtensions', Reflect_preventExtensions, 1],
    ['set', Reflect_set, 3],
    ['setPrototypeOf', Reflect_setPrototypeOf, 2],
  ], realmRec.Intrinsics['%Object.prototype%'], 'Reflect');

  realmRec.Intrinsics['%Reflect%'] = reflect;
}
