import {
  UndefinedValue, SymbolValue, Value, JSStringValue,
} from '../value.mts';
import { Assert, SameValue } from './all.mts';
import { surroundingAgent } from '#self';

/** https://tc39.es/ecma262/#sec-symboldescriptivestring */
export function SymbolDescriptiveString(sym: SymbolValue) {
  Assert(sym instanceof SymbolValue);
  let desc = sym.Description;
  if (desc instanceof UndefinedValue) {
    desc = Value('');
  }
  return Value(`Symbol(${desc.stringValue()})`);
}

/** https://tc39.es/ecma262/#sec-globalsymbolregistry-records */
export interface GlobalSymbolRegistryRecord {
  readonly Key: JSStringValue;
  readonly Symbol: SymbolValue;
}

/** https://tc39.es/ecma262/#sec-keyforsymbol */
export function KeyForSymbol(sym: SymbolValue): JSStringValue | UndefinedValue {
  const agentRecord = surroundingAgent.AgentRecord;
  const globalSymbolRegistry = agentRecord.GlobalSymbolRegistry;
  for (const e of globalSymbolRegistry) {
    if (SameValue(e.Symbol, sym)) {
      return e.Key;
    }
  }

  // 2. Assert: The globalSymbolRegistry List does not currently contain an entry for sym.
  return Value.undefined;
}
