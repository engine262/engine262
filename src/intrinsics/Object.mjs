import {
  New as NewValue,
} from '../value.mjs';

import {
  surroundingAgent,
} from '../engine.mjs';

import {
  CreateBuiltinFunction,
  ObjectCreate,
  OrdinaryCreateFromConstructor,
  ToObject,
} from '../abstract-ops/all.mjs';

function ObjectConstructor(realm, [value], { NewTarget }) {
  if (!NewTarget.isUndefined() && NewTarget !== surroundingAgent.activeFunction) {
    return OrdinaryCreateFromConstructor(NewTarget, '%ObjectPrototype%');
  }
  if (value.isNull() || value.isUndefined()) {
    return ObjectCreate(surroundingAgent.currentRealmRecord.Intrinsics['%ObjectPrototype%']);
  }
  return ToObject(value);
}

export function CreateObject(realmRec) {
  const objectConstructor = CreateBuiltinFunction(
    ObjectConstructor, [], realmRec,
    realmRec.Intrinsics['%FunctionPrototype%'],
  );

  const proto = realmRec.Intrinsics['%ObjectPrototype%'];
  objectConstructor.DefineOwnProperty(NewValue('prototype'), {
    Value: proto,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });
  proto.DefineOwnProperty(NewValue('constructor'), {
    Value: objectConstructor,
    Writable: true,
    Enumerable: false,
    Configurable: true,
  });

  realmRec.Intrinsics['%Object%'] = objectConstructor;
}
