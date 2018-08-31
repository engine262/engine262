import {
  ObjectValue,
  wellKnownSymbols,
  New as NewValue,
  Type,
} from '../value.mjs';
import {
  surroundingAgent,
  SymbolDescriptiveString,
} from '../engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

function thisSymbolValue(value) {
  if (Type(value) === 'Symbol') {
    return value;
  }
  if (Type(value) === 'Object' && 'SymbolData' in value) {
    Assert(Type(value.SymbolData) === 'Symbol');
    return value.SymbolData;
  }
  return surroundingAgent.Throw('TypeError');
}

function SymbolToString(realm, argList, { thisValue }) {
  const sym = Q(thisSymbolValue(thisValue));
  return SymbolDescriptiveString(sym);
}

function SymbolValueOf(realm, argList, { thisValue }) {
  return Q(thisSymbolValue(thisValue));
}

function SymbolToPrimitive(realm, argList, { thisValue }) {
  return Q(thisSymbolValue(thisValue));
}

function SymbolToStringTag() {
  return NewValue('Symbol');
}

export function CreateSymbolPrototype(realmRec) {
  const proto = new ObjectValue(undefined, realmRec);

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

  proto.DefineOwnProperty(wellKnownSymbols.toPrimitive, {
    Value: CreateBuiltinFunction(SymbolToPrimitive, [], realmRec),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: CreateBuiltinFunction(SymbolToStringTag, [], realmRec),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  realmRec.Intrinsics['%SymbolPrototype%'] = proto;
}
