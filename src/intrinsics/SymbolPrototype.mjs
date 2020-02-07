import {
  Type,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  Assert,
  SymbolDescriptiveString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapPrototype } from './Bootstrap.mjs';

function thisSymbolValue(value) {
  if (Type(value) === 'Symbol') {
    return value;
  }
  if (Type(value) === 'Object' && 'SymbolData' in value) {
    const s = value.SymbolData;
    Assert(Type(s) === 'Symbol');
    return s;
  }
  return surroundingAgent.Throw('TypeError', 'NotATypeObject', 'Symbol', value);
}

function SymbolProto_toString(argList, { thisValue }) {
  const sym = Q(thisSymbolValue(thisValue));
  return SymbolDescriptiveString(sym);
}

function SymbolProto_descriptionGetter(argList, { thisValue }) {
  const s = thisValue;
  const sym = Q(thisSymbolValue(s));
  return sym.Description;
}

function SymbolProto_valueOf(argList, { thisValue }) {
  return Q(thisSymbolValue(thisValue));
}

function SymbolProto_toPrimitive(argList, { thisValue }) {
  return Q(thisSymbolValue(thisValue));
}

export function BootstrapSymbolPrototype(realmRec) {
  const override = {
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  };
  const proto = BootstrapPrototype(realmRec, [
    ['toString', SymbolProto_toString, 0],
    ['description', [SymbolProto_descriptionGetter]],
    ['valueOf', SymbolProto_valueOf, 0],
    [wellKnownSymbols.toPrimitive, SymbolProto_toPrimitive, 1, override],
    [wellKnownSymbols.toStringTag, new Value('Symbol'), undefined, override],
  ], realmRec.Intrinsics['%Object.prototype%']);

  realmRec.Intrinsics['%Symbol.prototype%'] = proto;
}
