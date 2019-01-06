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
import { Type, Value } from '../value.mjs';
import { Q } from '../completion.mjs';
import { msg } from '../helpers.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function Reflect_apply([target = Value.undefined, thisArgument = Value.undefined, argumentsList = Value.undefined]) {
  if (IsCallable(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', 'target is not callable');
  }
  const args = Q(CreateListFromArrayLike(argumentsList));
  PrepareForTailCall();
  return Q(Call(target, thisArgument, args));
}

function Reflect_construct([target = Value.undefined, argumentsList = Value.undefined, newTarget]) {
  if (IsConstructor(target) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', target));
  }
  if (newTarget === undefined) {
    newTarget = target;
  } else if (IsConstructor(newTarget) === Value.false) {
    return surroundingAgent.Throw('TypeError', msg('NotAConstructor', newTarget));
  }
  const args = Q(CreateListFromArrayLike(argumentsList));
  return Q(Construct(target, args, newTarget));
}

function Reflect_defineProperty([target = Value.undefined, propertyKey = Value.undefined, attributes = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const key = Q(ToPropertyKey(propertyKey));
  const desc = Q(ToPropertyDescriptor(attributes));
  return Q(target.DefineOwnProperty(key, desc));
}

function Reflect_deleteProperty([target = Value.undefined, propertyKey = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const key = Q(ToPropertyKey(propertyKey));
  return Q(target.Delete(key));
}

function Reflect_get([target = Value.undefined, propertyKey = Value.undefined, receiver]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const key = Q(ToPropertyKey(propertyKey));
  if (receiver === undefined) {
    receiver = target;
  }
  return Q(target.Get(key, receiver));
}

function Reflect_getOwnPropertyDescriptor([target = Value.undefined, propertyKey = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const key = Q(ToPropertyKey(propertyKey));
  const desc = Q(target.GetOwnProperty(key));
  return FromPropertyDescriptor(desc);
}

function Reflect_getPrototypeOf([target = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  return Q(target.GetPrototypeOf());
}

function Reflect_has([target = Value.undefined, propertyKey = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const key = Q(ToPropertyKey(propertyKey));
  return Q(target.HasProperty(key));
}

function Reflect_isExtensible([target = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  return Q(target.IsExtensible());
}

function Reflect_ownKeys([target = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const keys = Q(target.OwnPropertyKeys());
  return CreateArrayFromList(keys);
}

function Reflect_preventExtensions([target = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  return Q(target.PreventExtensions());
}

function Reflect_set([target = Value.undefined, propertyKey = Value.undefined, V = Value.undefined, receiver]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  const key = Q(ToPropertyKey(propertyKey));
  if (receiver === undefined) {
    receiver = target;
  }
  return Q(target.Set(key, V, receiver));
}

function Reflect_setPrototypeOf([target = Value.undefined, proto = Value.undefined]) {
  if (Type(target) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'target is not an object');
  }
  if (Type(proto) !== 'Object' && Type(proto) !== 'Null') {
    return surroundingAgent.Throw('TypeError', 'proto is not an object or null');
  }
  return Q(target.SetPrototypeOf(proto));
}

export function CreateReflect(realmRec) {
  const reflect = BootstrapPrototype(realmRec, [
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
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  realmRec.Intrinsics['%Reflect%'] = reflect;
}
