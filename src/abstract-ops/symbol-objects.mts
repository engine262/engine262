// @ts-nocheck
import { UndefinedValue, SymbolValue, Value } from '../value.mjs';
import { Assert } from './all.mjs';

/** http://tc39.es/ecma262/#sec-symboldescriptivestring */
export function SymbolDescriptiveString(sym) {
  Assert(sym instanceof SymbolValue);
  let desc = sym.Description;
  if (desc instanceof UndefinedValue) {
    desc = Value.of('');
  }
  return Value.of(`Symbol(${desc.stringValue()})`);
}
