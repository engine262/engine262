import {
  Value,
  Type,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  CreateArrayFromList,
  CreateDataProperty,
  DefinePropertyOrThrow,
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
} from '../abstract-ops/all.mjs';
import { Q, X } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

function ObjectConstructor([value], { NewTarget }) {
  if (Type(NewTarget) !== 'Undefined'
      && NewTarget !== surroundingAgent.activeFunctionObject) {
    return OrdinaryCreateFromConstructor(NewTarget, '%ObjectPrototype%');
  }
  if (Type(value) === 'Null' || Type(value) === 'Undefined') {
    return ObjectCreate(surroundingAgent.currentRealmRecord.Intrinsics['%ObjectPrototype%']);
  }
  return ToObject(value);
}

function Object_assign([target, ...sources]) {
  const to = Q(ToObject(target));
  if (sources.length === 0) {
    return to;
  }
  // Let sources be the List of argument values starting with the second argument.
  sources.forEach((nextSource) => {
    let keys;
    let from;
    if (Type(nextSource) === 'Undefined' || Type(nextSource) === 'Null') {
      keys = [];
    } else {
      from = X(ToObject(nextSource));
      keys = Q(from.OwnPropertyKeys());
    }
    keys.forEach((nextKey) => {
      const desc = Q(from.GetOwnProperty(nextKey));
      if (Type(desc) !== 'Undefined' && desc.Enumerable === true) {
        const propValue = Q(Get(from, nextKey));
        Q(Set(to, nextKey, propValue, new Value(true)));
      }
    });
  });
  return to;
}

function Object_create([O, Properties]) {
  if (Type(O) !== 'Object' && Type(O) !== 'Null') {
    return surroundingAgent.Throw('TypeError');
  }
  const obj = ObjectCreate(O);
  if (Type(Properties) !== 'Undefined') {
    return Q(ObjectDefineProperties(obj, Properties));
  }
  return obj;
}

function Object_defineProperties([O, Properties]) {
  return Q(ObjectDefineProperties(O, Properties));
}

// #sec-objectdefineproperties ObjectDefineProperties
function ObjectDefineProperties(O, Properties) {
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }

  const props = Q(ToObject(Properties));
  const keys = Q(props.OwnPropertyKeys());
  const descriptors = [];
  keys.forEach((nextKey) => {
    const propDesc = Q(props.GetOwnProperty(nextKey));
    if (Type(propDesc) !== 'Undefined' && propDesc.Enumerable === true) {
      const descObj = Q(Get(props, nextKey));
      const desc = Q(ToPropertyDescriptor(descObj));
      descriptors.push([nextKey, desc]);
    }
  });
  descriptors.forEach((pair) => {
    const P = pair[0];
    const desc = pair[1];
    Q(DefinePropertyOrThrow(O, P, desc));
  });
  return O;
}

function Object_defineProperty([O, P, Attributes]) {
  if (Type(O) !== 'Object') {
    return surroundingAgent.Throw('TypeError');
  }
  const key = Q(ToPropertyKey(P));
  const desc = Q(ToPropertyDescriptor(Attributes));

  Q(DefinePropertyOrThrow(O, key, desc));
  return O;
}

function Object_entries([O]) {
  const obj = Q(ToObject(O));
  const nameList = Q(EnumerableOwnPropertyNames(obj, 'key+value'));
  return CreateArrayFromList(nameList);
}

function Object_freeze([O]) {
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(SetIntegrityLevel(O, 'frozen'));
  if (status.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return O;
}

function Object_getOwnPropertyDescriptor([O, P]) {
  const obj = Q(ToObject(O));
  const key = Q(ToPropertyKey(P));
  const desc = Q(obj.GetOwnProperty(key));
  return FromPropertyDescriptor(desc);
}

function Object_getOwnPropertyDescriptors([O]) {
  const obj = Q(ToObject(O));
  const ownKeys = Q(obj.OwnPropertyKeys());
  const descriptors = X(ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%')));
  ownKeys.forEach((key) => {
    const desc = Q(obj.GetOwnProperty(key));
    const descriptor = X(FromPropertyDescriptor(desc));
    if (Type(descriptor) !== 'Undefined') {
      X(CreateDataProperty(descriptors, key, descriptor));
    }
  });
  return descriptors;
}

function GetOwnPropertyKeys(O, type) {
  const obj = ToObject(O);
  const keys = obj.OwnPropertyKeys();
  const nameList = [];
  keys.forEach((nextKey) => {
    if (Type(nextKey) === type) {
      nameList.push(nextKey);
    }
  });
  return CreateArrayFromList(nameList);
}

function Object_getOwnPropertyNames([O]) {
  return Q(GetOwnPropertyKeys(O, 'String'));
}

function Object_getOwnPropertySymbols([O]) {
  return Q(GetOwnPropertyKeys(O, 'Symbol'));
}

function Object_getPrototypeOf([O]) {
  const obj = Q(ToObject(O));
  return Q(obj.GetPrototypeOf());
}

function Object_is([value1, value2]) {
  return new Value(SameValue(value1, value2));
}

function Object_isExtensible([O]) {
  if (Type(O) !== 'Object') {
    return new Value(false);
  }

  return IsExtensible(O);
}

function Object_isFrozen([O]) {
  if (Type(O) !== 'Object') {
    return new Value(true);
  }

  return Q(TestIntegrityLevel(O, 'frozen'));
}

function Object_isSealed([O]) {
  if (Type(O) !== 'Object') {
    return new Value(true);
  }

  return Q(TestIntegrityLevel(O, 'sealed'));
}

function Object_keys([O]) {
  const obj = Q(ToObject(O));
  const nameList = Q(EnumerableOwnPropertyNames(obj, 'key'));
  return CreateArrayFromList(nameList);
}

function Object_preventExtensions([O]) {
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(O.PreventExtensions());
  if (status.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return O;
}

function Object_seal([O]) {
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(SetIntegrityLevel(O, 'sealed'));
  if (status.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return O;
}

function Object_setPrototypeOf([O, proto]) {
  O = Q(RequireObjectCoercible(O));
  if (Type(proto) !== 'Object' && Type(proto) !== 'Null') {
    return surroundingAgent.Throw('TypeError');
  }
  if (Type(O) !== 'Object') {
    return O;
  }

  const status = Q(O.SetPrototypeOf(proto));
  if (status.isFalse()) {
    return surroundingAgent.Throw('TypeError');
  }
  return O;
}

function Object_values([O]) {
  const obj = Q(ToObject(O));
  const nameList = Q(EnumerableOwnPropertyNames(obj, 'value'));
  return CreateArrayFromList(nameList);
}

export function CreateObject(realmRec) {
  const objectConstructor = BootstrapConstructor(realmRec, ObjectConstructor, 'Object', 1, realmRec.Intrinsics['%ObjectPrototype%'], [
    ['assign', Object_assign, 2],
    ['create', Object_create, 2],
    ['defineProperties', Object_defineProperties, 2],
    ['defineProperty', Object_defineProperty, 3],
    ['entries', Object_entries, 1],
    ['freeze', Object_freeze, 1],
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
