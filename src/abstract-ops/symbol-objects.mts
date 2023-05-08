// @ts-nocheck
import { UndefinedValue, SymbolValue, Value } from '../value.mjs';
import { Assert } from './all.mjs';

/** https://tc39.es/ecma262/#sec-symboldescriptivestring */
export function SymbolDescriptiveString(sym) {
  Assert(sym instanceof SymbolValue);
  let desc = sym.Description;
  if (desc instanceof UndefinedValue) {
    desc = Value('');
  }
  return Value(`Symbol(${desc.stringValue()})`);
}
