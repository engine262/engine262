/* @flow */

import {
  Type,
  NullValue,
  UndefinedValue,
  trueValue,
  falseValue,
  New as NewValue,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  SameValue,
  CreateBuiltinFunction,
  ObjectCreate,
  DefinePropertyOrThrow,
  OrdinaryCreateFromConstructor,
  IsExtensible,
  ToPropertyDescriptor,
  FromPropertyDescriptor,
  EnumerableOwnPropertyNames,
  ToPropertyKey,
  ToObject,
  Get,
  Set,
  TestIntegrityLevel,
  SetIntegrityLevel,
  CreateArrayFromList,
  CreateDataProperty,
  RequireObjectCoercible,
} from '../abstract-ops/all.mjs';

function ObjectConstructor(realm, [value], { NewTarget }) {
  if (!(NewTarget instanceof UndefinedValue)
      && NewTarget !== surroundingAgent.activeFunctionObject) {
    return OrdinaryCreateFromConstructor(NewTarget, '%ObjectPrototype%');
  }
  if (value instanceof NullValue || value instanceof UndefinedValue) {
    return ObjectCreate(surroundingAgent.currentRealmRecord.Intrinsics['%ObjectPrototype%']);
  }
  return ToObject(value);
}

function ObjectAssign(realm, [target, ...sources]) {
  const to = ToObject(target);
  if (sources.length === 0) {
    return to;
  }
  // Let sources be the List of argument values starting with the second argument.
  sources.forEach((nextSource) => {
    let keys;
    let from;
    if (nextSource instanceof UndefinedValue || nextSource instanceof NullValue) {
      keys = [];
    } else {
      from = ToObject(nextSource);
      keys = from.OwnPropertyKeys();
    }
    keys.forEach((nextKey) => {
      const desc = from.GetOwnProperty(nextKey);
      if (!(desc instanceof UndefinedValue) && desc.Enumerable === true) {
        const propValue = Get(from, nextKey);
        Set(to, nextKey, propValue, trueValue);
      }
    });
  });
  return to;
}

function JSObjectCreate(realm, [O, Properties]) {
  if (Type(O) !== 'Object' && Type(O) !== 'Null') {
    surroundingAgent.Throw('TypeError');
  }
  const obj = ObjectCreate(O);
  if (!(Properties instanceof UndefinedValue)) {
    return ObjectDefineProperties(obj, Properties);
  }
  return obj;
}

function JSObjectDefineProperties(realm, [O, Properties]) {
  return ObjectDefineProperties(O, Properties);
}

// #sec-objectdefineproperties ObjectDefineProperties
function ObjectDefineProperties(O, Properties) {
  if (Type(O) !== 'Object') {
    surroundingAgent.Throw('TypeError');
  }
  const props = ToObject(Properties);
  const keys = props.OwnPropertyKeys();
  const descriptors = [];
  keys.forEach((nextKey) => {
    const propDesc = props.GetOwnProperty(nextKey);
    if (!(propDesc instanceof UndefinedValue) && propDesc.Enumerable === true) {
      const descObj = Get(props, nextKey);
      const desc = ToPropertyDescriptor(descObj);
      descriptors.push([nextKey, desc]);
    }
  });
  descriptors.forEach((pair) => {
    const P = pair[0];
    const desc = pair[1];
    DefinePropertyOrThrow(O, P, desc);
  });
  return O;
}

function ObjectDefineProperty(realm, [O, P, Attributes]) {
  if (Type(O) !== 'Object') {
    surroundingAgent.Throw('TypeError');
  }
  const key = ToPropertyKey(P);
  const desc = ToPropertyDescriptor(Attributes);
  DefinePropertyOrThrow(O, key, desc);
  return O;
}

function ObjectEntries(realm, [O]) {
  const obj = ToObject(O);
  const nameList = EnumerableOwnPropertyNames(obj, 'key+value');
  return CreateArrayFromList(nameList);
}

function ObjectFreeze(realm, [O]) {
  if (Type(O) !== 'Object') {
    return O;
  }
  const status = SetIntegrityLevel(O, 'frozen');
  if (status.isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  return O;
}

function ObjectGetOwnPropertyDescriptor(realm, [O, P]) {
  const obj = ToObject(O);
  const key = ToPropertyKey(P);
  const desc = obj.GetOwnProperty(key);
  return FromPropertyDescriptor(desc);
}

function ObjectGetOwnPropertyDescriptors(realm, [O]) {
  const obj = ToObject(O);
  const ownKeys = obj.OwnPropertyKeys();
  const descriptors = ObjectCreate(surroundingAgent.intrinsic('%ObjectPrototype%'));
  ownKeys.forEach((key) => {
    const desc = obj.GetOwnProperty(key);
    const descriptor = FromPropertyDescriptor(desc);
    if (!(descriptor instanceof UndefinedValue)) {
      CreateDataProperty(descriptors, key, descriptor);
    }
  });
  return descriptors;
}

function GetOwnPropertyKeys(O /* : Value */, type /* : string */) {
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

function ObjectGetOwnPropertyNames(realm, [O]) {
  return GetOwnPropertyKeys(O, 'String');
}

function ObjectGetOwnPropertySymbols(realm, [O]) {
  return GetOwnPropertyKeys(O, 'Symbol');
}

function ObjectGetPrototypeOf(realm, [O]) {
  const obj = ToObject(O);
  return obj.GetPrototypeOf();
}

function ObjectIs(realm, [value1, value2]) {
  return NewValue(SameValue(value1, value2));
}

function ObjectIsExtensible(realm, [O]) {
  if (Type(O) !== 'Object') {
    return falseValue;
  }
  return IsExtensible(O);
}

function ObjectIsFrozen(realm, [O]) {
  if (Type(O) !== 'Object') {
    return trueValue;
  }
  return TestIntegrityLevel(O, 'frozen');
}

function ObjectIsSealed(realm, [O]) {
  if (Type(O) !== 'Object') {
    return trueValue;
  }
  return TestIntegrityLevel(O, 'sealed');
}

function ObjectKeys(realm, [O]) {
  const obj = ToObject(O);
  const nameList = EnumerableOwnPropertyNames(obj, 'key');
  return CreateArrayFromList(nameList);
}

function ObjectPreventExtensions(realm, [O]) {
  if (Type(O) !== 'Object') {
    return O;
  }
  const status = O.PreventExtensions();
  if (status.isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  return O;
}

function ObjectSeal(realm, [O]) {
  if (Type(O) !== 'Object') {
    return O;
  }
  const status = SetIntegrityLevel(O, 'sealed');
  if (status.isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  return O;
}

function ObjectSetPrototypeOf(realm, [O, proto]) {
  O = RequireObjectCoercible(O);
  if (Type(proto) !== 'Object' && Type(proto) !== 'Null') {
    surroundingAgent.Throw('TypeError');
  }
  if (Type(O) !== 'Object') {
    return O;
  }
  const status = O.SetPrototypeOf(proto);
  if (status.isFalse()) {
    surroundingAgent.Throw('TypeError');
  }
  return O;
}

function ObjectValues(realm, [O]) {
  const obj = ToObject(O);
  const nameList = EnumerableOwnPropertyNames(obj, 'value');
  return CreateArrayFromList(nameList);
}

export function CreateObject(realmRec /* : Realm */) {
  const objectConstructor = CreateBuiltinFunction(
    ObjectConstructor, [], realmRec,
    realmRec.Intrinsics['%FunctionPrototype%'],
  );

  const proto = realmRec.Intrinsics['%ObjectPrototype%'];
  objectConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });
  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: objectConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  [
    ['assign', ObjectAssign],
    ['create', JSObjectCreate],
    ['defineProperties', JSObjectDefineProperties],
    ['defineProperty', ObjectDefineProperty],
    ['entries', ObjectEntries],
    ['freeze', ObjectFreeze],
    ['getOwnPropertyDescriptor', ObjectGetOwnPropertyDescriptor],
    ['getOwnPropertyDescriptors', ObjectGetOwnPropertyDescriptors],
    ['getOwnPropertyNames', ObjectGetOwnPropertyNames],
    ['getOwnPropertySymbols', ObjectGetOwnPropertySymbols],
    ['getPrototypeOf', ObjectGetPrototypeOf],
    ['is', ObjectIs],
    ['isExtensible', ObjectIsExtensible],
    ['isFrozen', ObjectIsFrozen],
    ['isSealed', ObjectIsSealed],
    ['keys', ObjectKeys],
    ['preventExtensions', ObjectPreventExtensions],
    ['seal', ObjectSeal],
    ['setPrototypeOf', ObjectSetPrototypeOf],
    ['values', ObjectValues],
  ].forEach(([name, fn]) => {
    objectConstructor.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%Object%'] = objectConstructor;
}
