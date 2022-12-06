import {
  Descriptor,
  SymbolValue,
  Value,
  wellKnownSymbols,
} from '../value.mjs';
import {
  surroundingAgent,
} from '../engine.mjs';
import {
  SameValue,
  ToString,
} from '../abstract-ops/all.mjs';
import { Q } from '../completion.mjs';
import { bootstrapConstructor } from './bootstrap.mjs';

export const GlobalSymbolRegistry = [];

// #sec-symbol-description
function SymbolConstructor([description = Value.undefined], { NewTarget }) {
  // 1. If NewTarget is not undefined, throw a TypeError exception.
  if (NewTarget !== Value.undefined) {
    return surroundingAgent.Throw('TypeError', 'NotAConstructor', this);
  }
  // 2. If description is undefined, let descString be undefined.
  let descString;
  if (description === Value.undefined) {
    descString = Value.undefined;
  } else { // 3. Else, let descString be ? ToString(description).
    descString = Q(ToString(description));
  }
  // 4. Return a new unique Symbol value whose [[Description]] value is descString.
  return new SymbolValue(descString);
}

// #sec-symbol.for
function Symbol_for([key = Value.undefined]) {
  // 1. Let stringKey be ? ToString(key).
  const stringKey = Q(ToString(key));
  // 2. For each element e of the GlobalSymbolRegistry List, do
  for (const e of GlobalSymbolRegistry) {
    // a. If SameValue(e.[[Key]], stringKey) is true, return e.[[Symbol]].
    if (SameValue(e.Key, stringKey) === Value.true) {
      return e.Symbol;
    }
  }
  // 3. Assert: GlobalSymbolRegistry does not currently contain an entry for stringKey.
  // 4. Let newSymbol be a new unique Symbol value whose [[Description]] value is stringKey.
  const newSymbol = new SymbolValue(stringKey);
  // 5. Append the Record { [[Key]]: stringKey, [[Symbol]]: newSymbol } to the GlobalSymbolRegistry List.
  GlobalSymbolRegistry.push({ Key: stringKey, Symbol: newSymbol });
  // 6. Return newSymbol.
  return newSymbol;
}

// #sec-symbol.keyfor
function Symbol_keyFor([sym = Value.undefined]) {
  // 1. If Type(sym) is not Symbol, throw a TypeError exception.
  if (!(sym instanceof SymbolValue)) {
    return surroundingAgent.Throw('TypeError', 'NotASymbol', sym);
  }
  // 2. For each element e of the GlobalSymbolRegistry List, do
  for (const e of GlobalSymbolRegistry) {
    // a. If SameValue(e.[[Symbol]], sym) is true, return e.[[Key]].
    if (SameValue(e.Symbol, sym) === Value.true) {
      return e.Key;
    }
  }
  // 3. Assert: GlobalSymbolRegistry does not currently contain an entry for sym.
  // 4. Return undefined.
  return Value.undefined;
}

export function bootstrapSymbol(realmRec) {
  const symbolConstructor = bootstrapConstructor(realmRec, SymbolConstructor, 'Symbol', 0, realmRec.Intrinsics['%Symbol.prototype%'], [
    ['for', Symbol_for, 1],
    ['keyFor', Symbol_keyFor, 1],
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
    Value: realmRec.Intrinsics['%Symbol.prototype%'],
    Writable: Value.true,
    Enumerable: Value.false,
    Configurable: Value.true,
  }));

  realmRec.Intrinsics['%Symbol%'] = symbolConstructor;
}
