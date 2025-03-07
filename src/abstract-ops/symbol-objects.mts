// @ts-nocheck
import { GlobalSymbolRegistry } from '../intrinsics/Symbol.mjs';
import {
  JSStringValue,
  SymbolValue,
  UndefinedValue,
  Value,
} from '../value.mjs';
import { Assert, SameValue } from './all.mjs';

/** https://tc39.es/ecma262/#sec-symboldescriptivestring */
export function SymbolDescriptiveString(sym) {
  Assert(sym instanceof SymbolValue);
  let desc = sym.Description;
  if (desc instanceof UndefinedValue) {
    desc = Value('');
  }
  return Value(`Symbol(${desc.stringValue()})`);
}

/** https://tc39.es/ecma262/multipage/#sec-keyforsymbol */
export function KeyForSymbol(sym: SymbolValue): JSStringValue | UndefinedValue {
  // 1. For each element e of the GlobalSymbolRegistry List, do
  for (const e of GlobalSymbolRegistry) {
    // a. If SameValue(e.[[Symbol]], sym) is true, return e.[[Key]].
    if (SameValue(e.Symbol, sym) === Value.true) {
      return e.Key;
    }
  }
  // 2. Assert: The GlobalSymbolRegistry List does not currently contain an entry for sym.
  // 3. Return undefined.
  return Value.undefined;
}
