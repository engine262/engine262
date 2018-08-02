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

function BooleanToString(realm, argList, { thisArgument }) {
  const b = thisBooleanValue(thisArgument);
  if (b.value === true) {
    return NewValue('true');
  }
  return NewValue('false');
}

function BooleanValueOf(realm, argList, { thisArgument }) {
  return thisBooleanValue(thisArgument);
}

export function CreateBooleanPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  [
    ['toString', BooleanToString],
    ['valueOf', BooleanValueOf],
  ].forEach(([name, nativeFunction]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(nativeFunction, [], realmRec),
      Writable: false,
      Enumerable: false,
      Configurable: true,
    });
  });

  realmRec.Intrinsics['%BooleanPrototype%'] = proto;
}
