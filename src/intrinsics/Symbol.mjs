import {
  New as NewValue,
  SymbolValue,
  Type,
  wellKnownSymbols,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  CreateBuiltinFunction,
  SameValue,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';

export const GlobalSymbolRegistry = [];

function SymbolConstructor(realm, [description], { NewTarget }) {
  if (Type(NewTarget) !== 'Undefined') {
    return surroundingAgent.Throw('TypeError');
  }
  const descString = Type(description) === 'Undefined'
    ? NewValue(undefined)
    : Q(ToString(description));

  return new SymbolValue(descString);
}

function SymbolFor(realm, [key]) {
  const stringKey = ToString(key);
  for (const e of GlobalSymbolRegistry) {
    if (SameValue(e.Key, stringKey)) {
      return e.Symbol;
    }
  }
  // Assert: GlobalSymbolRegistry does not currently contain an entry for stringKey.
  const newSymbol = new SymbolValue(stringKey);
  GlobalSymbolRegistry.push({ Key: stringKey, Symbol: newSymbol });
  return newSymbol;
}

function SymbolKeyFor(realm, [sym]) {
  if (Type(sym) !== 'Symbol') {
    return surroundingAgent.Throw('TypeError');
  }
  for (const e of GlobalSymbolRegistry) {
    if (SameValue(e.Symbol, sym)) {
      return e.Key;
    }
  }
  return NewValue(undefined);
}

export function CreateSymbol(realmRec) {
  const symbolConstructor = CreateBuiltinFunction(SymbolConstructor, [], realmRec);

  [
    ['for', SymbolFor],
    ['keyFor', SymbolKeyFor],
  ].forEach(([name, fn]) => {
    symbolConstructor.DefineOwnProperty(NewValue(name), {
      Value: CreateBuiltinFunction(fn, [], realmRec),
      Writable: true,
      Enumerable: false,
      Configurable: true,
    });
  });

  for (const [name, sym] of Object.entries(wellKnownSymbols)) {
    symbolConstructor.DefineOwnProperty(NewValue(name), {
      Value: sym,
      Writable: false,
      Enumerable: false,
      Configurable: false,
    });
  }

  realmRec.Intrinsics['%SymbolPrototype%'].DefineOwnProperty(
    NewValue('constructor'), {
      Value: symbolConstructor,
      Writable: true,
      Enumerable: false,
      Configurable: true,
    },
  );

  realmRec.Intrinsics['%Symbol%'] = symbolConstructor;
}
