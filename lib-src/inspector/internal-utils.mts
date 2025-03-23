import type { Protocol } from 'devtools-protocol';
import { type ScriptRecord } from '#self';

export function getParsedEvent(script: ScriptRecord, id: number, executionContextId: number): Protocol.Debugger.ScriptParsedEvent {
  const lines = script.ECMAScriptCode.sourceText().split('\n');
  return {
    scriptId: `${id}`,
    url: script.HostDefined.specifier || `vm:///${id}`,
    startLine: 0,
    startColumn: 0,
    endLine: lines.length,
    endColumn: lines.pop()!.length,
    executionContextId,
    hash: '',
    buildId: '',
  };
}

export const ParsedScripts: ScriptRecord[] = [];
