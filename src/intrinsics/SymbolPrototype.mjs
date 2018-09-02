import {
  New as NewValue,
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import {
  SymbolDescriptiveString,
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  CreateBuiltinFunction,
  ObjectCreate,
  SetFunctionLength,
  SetFunctionName,
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

function Symbol_toString(argList, { thisValue }) {
  const sym = Q(thisSymbolValue(thisValue));
  return SymbolDescriptiveString(sym);
}

function Symbol_valueOf(argList, { thisValue }) {
  return Q(thisSymbolValue(thisValue));
}

function Symbol_toPrimitive(argList, { thisValue }) {
  return Q(thisSymbolValue(thisValue));
}

function Symbol_toStringTag() {
  return NewValue('Symbol');
}

export function CreateSymbolPrototype(realmRec) {
  const proto = ObjectCreate(realmRec.Intrinsics['%ObjectPrototype%']);

  [
    ['toString', Symbol_toString, 0],
    ['valueOf', Symbol_valueOf, 0],
  ].forEach(([name, fn, len]) => {
    fn = CreateBuiltinFunction(fn, [], realmRec);
    SetFunctionName(fn, NewValue(name));
    SetFunctionLength(fn, NewValue(len));
    proto.DefineOwnProperty(NewValue(name), {
      Value: fn,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  proto.DefineOwnProperty(wellKnownSymbols.toPrimitive, {
    Value: CreateBuiltinFunction(Symbol_toPrimitive, [], realmRec),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  proto.DefineOwnProperty(wellKnownSymbols.toStringTag, {
    Value: CreateBuiltinFunction(Symbol_toStringTag, [], realmRec),
    Writable: false,
    Enumerable: false,
    Configurable: false,
  });

  realmRec.Intrinsics['%SymbolPrototype%'] = proto;
}
