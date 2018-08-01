import {
  ObjectValue,
  BooleanValue,
  New as NewValue,
} from '../value.mjs';

import {
  Assert,
  Type,
  CreateBuiltinFunction,
} from '../engine.mjs';

function thisBooleanValue(value) {
  if (Type(value) === 'Boolean') {
    return value;
  }

  if (Type(value) === 'Object' && 'BooleanData' in value) {
    Assert(value.BooleanData instanceof BooleanValue);
    return value.BooleanData;
  }

  return value.realm.exception.TypeError();
}

function BooleanToString(thisArg) {
  const b = thisBooleanValue(thisArg);
  if (b.value === true) {
    return NewValue(thisArg.realm, 'true');
  }
  return NewValue(thisArg.realm, 'false');
}

function BooleanValueOf(thisArg) {
  return thisBooleanValue(thisArg);
}

export function CreateBooleanPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  [
    ['toString', BooleanToString],
    ['valueOf', BooleanValueOf],
  ].forEach(([name, nativeFunction]) => {
    proto.DefineOwnProperty(NewValue(realmRec, name), {
      Value: CreateBuiltinFunction(nativeFunction, [], realmRec),
      Writable: false,
      Enumerable: false,
      Configurable: true,
    });
  });

  return proto;
}
