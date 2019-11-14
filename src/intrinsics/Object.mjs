import {
  Type,
  Value,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  CreateArrayFromList,
  CreateDataProperty,
  DefinePropertyOrThrow,
  CreateDataPropertyOrThrow,
  EnumerableOwnPropertyNames,
  FromPropertyDescriptor,
  Get,
  IsExtensible,
  ObjectCreate,
  OrdinaryCreateFromConstructor,
  RequireObjectCoercible,
  SameValue,
  Set,
  SetIntegrityLevel,
  TestIntegrityLevel,
  ToObject,
  ToPropertyDescriptor,
  ToPropertyKey,
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { AddEntriesFromIterable } from './Map.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function ObjectConstructor([value = Value.undefined], { NewTarget }) {
  if (NewTarget !== Value.undefined && NewTarget !== surroundingAgent.activeFunctionObject) {
    return OrdinaryCreateFromConstructor(NewTarget, '%Object.prototype%');
  }
  if (value === Value.null || value === Value.undefined) {
    return ObjectCreate(surroundingAgent.currentRealmRecord.Intrinsics['%Object.prototype%']);
  }
  return X(ToObject(value));
}

function Object_assign([target = Value.undefined, ...sources]) {
  const to = Q(ToObject(target));
  if (sources.length === 0) {
    return to;
  }
  // Let sources be the List of argument values starting with the second argument.
  for (const nextSource of sources) {
    if (Type(nextSource) !== 'Undefined' && Type(nextSource) !== 'Null') {
      const from = X(ToObject(nextSource));
      const keys = Q(from.OwnPropertyKeys());
      for (const nextKey of keys) {
        const desc = Q(from.GetOwnProperty(nextKey));
        if (Type(desc) !== 'Undefined' && desc.Enumerable === Value.true) {
          const propValue = Q(Get(from, nextKey));
          Q(Set(to, nextKey, propValue, Value.true));
        }
      }
    }
  }
  return to;
}

function Object_create([O = Value.undefined, Properties = Value.undefined]) {
  if (Type(O) !== 'Object' && Type(O) !== 'Null') {
    return surroundingAgent.Throw('TypeError', 'ObjectPrototypeType');
  }
  const obj = ObjectCreate(O);
  if (Properties !== Value.undefined) {
    return Q(ObjectDefineProperties(obj, Properties));
  }
  return obj;
}

function Object_defineProperties([O = Value.undefined, Properties = Value.undefined]) {
  return Q(ObjectDefineProperties(O, Properties));
}

// #sec-objectdefineproperties ObjectDefineProperties
function ObjectDefineProperties(O, Properties) {
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  const props = Q(ToObject(Properties));
  const keys = Q(props.OwnPropertyKeys());
  const descriptors = [];
  for (const nextKey of keys) {
    const propDesc = Q(props.GetOwnProperty(nextKey));
    if (propDesc !== Value.undefined && propDesc.Enumerable === Value.true) {
      const descObj = Q(Get(props, nextKey));
      const desc = Q(ToPropertyDescriptor(descObj));
      descriptors.push([nextKey, desc]);
    }
  }
  for (const pair of descriptors) {
    const P = pair[0];
    const desc = pair[1];
    Q(DefinePropertyOrThrow(O, P, desc));
  }
  return O;
}

function Object_defineProperty([O = Value.undefined, P = Value.undefined, Attributes = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError', 'NotAnObject', O);
  }
  const key = Q(ToPropertyKey(P));
  const desc = Q(ToPropertyDescriptor(Attributes));

  Q(DefinePropertyOrThrow(O, key, desc));
  return O;
}

function Object_entries([O = Value.undefined]) {
  const obj = Q(ToObject(O));
  const nameList = Q(EnumerableOwnPropertyNames(obj, 'key+value'));
  return CreateArrayFromList(nameList);
}

function Object_freeze([O = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(SetIntegrityLevel(O, 'frozen'));
  if (status === Value.false) {
    return surroundingAgent.Throw('TypeError', 'UnableToFreeze', O);
  }
  return O;
}

function CreateDataPropertyOnObjectFunctions([key, value], { thisValue }) {
  const O = thisValue;
  Assert(Type(O) === 'Object');
  Assert(O.Extensible === Value.true);
  const propertyKey = Q(ToPropertyKey(key));
  X(CreateDataPropertyOrThrow(O, propertyKey, value));
}

function Object_fromEntries([iterable = Value.undefined]) {
  Q(RequireObjectCoercible(iterable));
  const obj = ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%'));
  Assert(obj.Extensible === Value.true && obj.properties.size === 0);
  const stepsDefine = CreateDataPropertyOnObjectFunctions;
  const adder = X(CreateBuiltinFunction(stepsDefine, []));
  return Q(AddEntriesFromIterable(obj, iterable, adder));
}

function Object_getOwnPropertyDescriptor([O = Value.undefined, P = Value.undefined]) {
  const obj = Q(ToObject(O));
  const key = Q(ToPropertyKey(P));
  const desc = Q(obj.GetOwnProperty(key));
  return FromPropertyDescriptor(desc);
}

function Object_getOwnPropertyDescriptors([O = Value.undefined]) {
  const obj = Q(ToObject(O));
  const ownKeys = Q(obj.OwnPropertyKeys());
  const descriptors = X(ObjectCreate(surroundingAgent.intrinsic('%Object.prototype%')));
  for (const key of ownKeys) {
    const desc = Q(obj.GetOwnProperty(key));
    const descriptor = X(FromPropertyDescriptor(desc));
    if (descriptor !== Value.undefined) {
      X(CreateDataProperty(descriptors, key, descriptor));
    }
  }
  return descriptors;
}

function GetOwnPropertyKeys(O, type) {
  const obj = Q(ToObject(O));
  const keys = Q(obj.OwnPropertyKeys());
  const nameList = [];
  keys.forEach((nextKey) => {
    if (Type(nextKey) === type) {
      nameList.push(nextKey);
    }
  });
  return CreateArrayFromList(nameList);
}

function Object_getOwnPropertyNames([O = Value.undefined]) {
  return Q(GetOwnPropertyKeys(O, 'String'));
}

function Object_getOwnPropertySymbols([O = Value.undefined]) {
  return Q(GetOwnPropertyKeys(O, 'Symbol'));
}

function Object_getPrototypeOf([O = Value.undefined]) {
  const obj = Q(ToObject(O));
  return Q(obj.GetPrototypeOf());
}

function Object_is([value1 = Value.undefined, value2 = Value.undefined]) {
  return SameValue(value1, value2);
}

function Object_isExtensible([O = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return Value.false;
  }

  return IsExtensible(O);
}

function Object_isFrozen([O = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return Value.true;
  }

  return Q(TestIntegrityLevel(O, 'frozen'));
}

function Object_isSealed([O = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return Value.true;
  }

  return Q(TestIntegrityLevel(O, 'sealed'));
}

function Object_keys([O = Value.undefined]) {
  const obj = Q(ToObject(O));
  const nameList = Q(EnumerableOwnPropertyNames(obj, 'key'));
  return CreateArrayFromList(nameList);
}

function Object_preventExtensions([O = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(O.PreventExtensions());
  if (status === Value.false) {
    return surroundingAgent.Throw('TypeError', 'UnableToPreventExtensions', O);
  }
  return O;
}

function Object_seal([O = Value.undefined]) {
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(SetIntegrityLevel(O, 'sealed'));
  if (status === Value.false) {
    return surroundingAgent.Throw('TypeError', 'UnableToSeal', O);
  }
  return O;
}

function Object_setPrototypeOf([O = Value.undefined, proto = Value.undefined]) {
  O = Q(RequireObjectCoercible(O));
  if (Type(proto) !== 'Object' && Type(proto) !== 'Null') {
    return surroundingAgent.Throw('TypeError', 'ObjectPrototypeType');
  }
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(O.SetPrototypeOf(proto));
  if (status === Value.false) {
    return surroundingAgent.Throw('TypeError', 'ObjectSetPrototype');
  }
  return O;
}

function Object_values([O = Value.undefined]) {
  const obj = Q(ToObject(O));
  const nameList = Q(EnumerableOwnPropertyNames(obj, 'value'));
  return CreateArrayFromList(nameList);
}

export function CreateObject(realmRec) {
  const objectConstructor = BootstrapConstructor(realmRec, ObjectConstructor, 'Object', 1, realmRec.Intrinsics['%Object.prototype%'], [
    ['assign', Object_assign, 2],
    ['create', Object_create, 2],
    ['defineProperties', Object_defineProperties, 2],
    ['defineProperty', Object_defineProperty, 3],
    ['entries', Object_entries, 1],
    ['freeze', Object_freeze, 1],
    ['fromEntries', Object_fromEntries, 1],
    ['getOwnPropertyDescriptor', Object_getOwnPropertyDescriptor, 2],
    ['getOwnPropertyDescriptors', Object_getOwnPropertyDescriptors, 1],
    ['getOwnPropertyNames', Object_getOwnPropertyNames, 1],
    ['getOwnPropertySymbols', Object_getOwnPropertySymbols, 1],
    ['getPrototypeOf', Object_getPrototypeOf, 1],
    ['is', Object_is, 2],
    ['isExtensible', Object_isExtensible, 1],
    ['isFrozen', Object_isFrozen, 1],
    ['isSealed', Object_isSealed, 1],
    ['keys', Object_keys, 1],
    ['preventExtensions', Object_preventExtensions, 1],
    ['seal', Object_seal, 1],
    ['setPrototypeOf', Object_setPrototypeOf, 2],
    ['values', Object_values, 1],
  ]);

  realmRec.Intrinsics['%Object%'] = objectConstructor;
}
