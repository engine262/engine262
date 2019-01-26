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

export function CreateSymbolPrototype(realmRec) {
  const override = {
    Writable: Value.false,
    Enumerable: Value.false,
    Configurable: Value.true,
  };
  const proto = BootstrapPrototype(realmRec, [
    ['toString', Symbol_toString, 0],
    ['valueOf', Symbol_valueOf, 0],
    [wellKnownSymbols.toPrimitive, Symbol_toPrimitive, 1, override],
    [wellKnownSymbols.toStringTag, new Value('Symbol'), undefined, override],
  ], realmRec.Intrinsics['%ObjectPrototype%']);

  realmRec.Intrinsics['%SymbolPrototype%'] = proto;
}
