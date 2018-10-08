import {
  Value,
  SymbolValue,
  Type,
  wellKnownSymbols,
  Descriptor,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  SameValue,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { BootstrapConstructor } from './Bootstrap.mjs';

export const GlobalSymbolRegistry = [];

function SymbolConstructor([description], { NewTarget }) {
  if (Type(NewTarget) !== 'Undefined') {
    return surroundingAgent.Throw('TypeError');
  }
  const descString = description === undefined || Type(description) === 'Undefined'
    ? Value.undefined
    : Q(ToString(description));

  return new SymbolValue(descString);
}

function Symbol_for([key]) {
  const stringKey = Q(ToString(key));
  for (const e of GlobalSymbolRegistry) {
    if (SameValue(e.Key, stringKey) === Value.true) {
      return e.Symbol;
    }
  }
  // Assert: GlobalSymbolRegistry does not currently contain an entry for stringKey.
  const newSymbol = new SymbolValue(stringKey);
  GlobalSymbolRegistry.push({ Key: stringKey, Symbol: newSymbol });
  return newSymbol;
}

function Symbol_keyFor([sym]) {
  if (Type(sym) !== 'Symbol') {
    return surroundingAgent.Throw('TypeError');
  }
  for (const e of GlobalSymbolRegistry) {
    if (SameValue(e.Symbol, sym) === Value.true) {
      return e.Key;
    }
  }
  return Value.undefined;
}

function Symbol_symbolSpecies(args, { thisValue }) {
  return thisValue;
}

export function CreateSymbol(realmRec) {
  const symbolConstructor = BootstrapConstructor(realmRec, SymbolConstructor, 'Symbol', 1, realmRec.Intrinsics['%SymbolPrototype%'], [
    ['for', Symbol_for, 1],
    ['keyFor', Symbol_keyFor, 1],
    [wellKnownSymbols.species, Symbol_symbolSpecies, 0],
  ]);

  for (const [name, sym] of Object.entries(wellKnownSymbols)) {
    symbolConstructor.DefineOwnProperty(new Value(name), Descriptor({
      Value: sym,
      Writable: Value.false,
      Enumerable: Value.false,
      Configurable: Value.false,
    }));
  }

  symbolConstructor.DefineOwnProperty(new Value('prototype'), Descriptor({
    Value: realmRec.Intrinsics['%SymbolPrototype%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  }));

  realmRec.Intrinsics['%Symbol%'] = symbolConstructor;
}
