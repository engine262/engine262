import { Assert } from './all.mjs';
import { Type, Value } from '../value.mjs';

// 19.4.3.3.1 #sec-symboldescriptivestring
export function SymbolDescriptiveString(sym) {
  Assert(Type(sym) === 'Symbol');
  let desc = sym.Description;
  if (Type(desc) === 'Undefined') {
    desc = new Value('');
  }
  return new Value(`Symbol(${desc.stringValue()})`);
}
