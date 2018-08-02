import {
  ObjectValue,
  New as NewValue,
} from '../value.mjs';

import {
  Assert,
  Type,

  CreateBuiltinFunction,

  SymbolDescriptiveString,
} from '../engine.mjs';

function thisSymbolValue(value) {
  if (Type(value) === 'Symbol') {
    return value;
  }
  if (Type(value) === 'Object' && 'SymbolData' in value) {
    Assert(Type(value.SymbolData) === 'Symbol');
    return value.SymbolData;
  }
  return value.realm.exception.TypeError();
}

function SymbolToString(realm, argList, { thisArgument }) {
  const sym = thisSymbolValue(thisArgument);
  return SymbolDescriptiveString(sym);
}

function SymbolValueOf(realm, argList, { thisArgument }) {
  return thisSymbolValue(thisArgument);
}

function SymbolToPrimitive(realm, argList, { thisArgument }) {
  return thisSymbolValue(thisArgument);
}

function SymbolToStringTag(realm) {
  return NewValue('Symbol');
}

export function CreateSymbolPrototype(realmRec) {
  const proto = new ObjectValue(realmRec);

  [
    ['toString', SymbolToString],
    ['valueOf', SymbolValueOf],
  ].forEach(([name, nativeFunction]) => {
    proto.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(nativeFunction, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  proto.DefineOwnProperty(realmRec.Intrinsics['@@toPrimitive'], {
    Value: CreateBuiltinFunction(SymbolToPrimitive, [], realmRec),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  proto.DefineOwnProperty(realmRec.Intrinsics['@@toStringTag'], {
    Value: CreateBuiltinFunction(SymbolToStringTag, [], realmRec),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  realmRec.Intrinsics['%SymbolPrototype%'] = proto;
}
