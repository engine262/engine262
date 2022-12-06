import { UndefinedValue, SymbolValue, Value } from '../value.mjs';
import { Assert } from './all.mjs';

// 19.4.3.3.1 #sec-symboldescriptivestring
export function SymbolDescriptiveString(sym) {
  Assert(sym instanceof SymbolValue);
  let desc = sym.Description;
  if (desc instanceof UndefinedValue) {
    desc = new Value('');
  }
  return new Value(`Symbol(${desc.stringValue()})`);
}
