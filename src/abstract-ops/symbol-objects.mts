import { SymbolValue } from '../value.mts';
import { SameValue } from './all.mts';
import { surroundingAgent } from '#self';

/** https://tc39.es/ecma262/#sec-symboldescriptivestring */
export function SymbolDescriptiveString(sym: SymbolValue): string {
  let description = sym.Description;
  if (!description) description = '';
  return `Symbol(${description})`;
}

/** https://tc39.es/ecma262/#sec-globalsymbolregistry-records */
export interface GlobalSymbolRegistryRecord {
  readonly Key: string;
  readonly Symbol: SymbolValue;
}

/** https://tc39.es/ecma262/#sec-keyforsymbol */
export function KeyForSymbol(sym: SymbolValue): string | undefined {
  const agentRecord = surroundingAgent.AgentRecord;
  const globalSymbolRegistry = agentRecord.GlobalSymbolRegistry;
  for (const e of globalSymbolRegistry) {
    if (SameValue(e.Symbol, sym)) {
      return e.Key;
    }
  }

  // 2. Assert: The globalSymbolRegistry List does not currently contain an entry for sym.
  return undefined;
}
