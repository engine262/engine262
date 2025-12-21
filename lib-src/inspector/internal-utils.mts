import type { Protocol } from 'devtools-protocol';
import { DynamicParsedCodeRecord, SourceTextModuleRecord, type ScriptRecord } from '#self';

export function getParsedEvent(source: ScriptRecord | SourceTextModuleRecord | DynamicParsedCodeRecord, id: string, executionContextId: number): Protocol.Debugger.ScriptParsedEvent {
  const lines = source.ECMAScriptCode.sourceText.split('\n');
  return {
    isModule: source instanceof SourceTextModuleRecord,
    scriptId: id,
    url: source.HostDefined.specifier || `vm:///${id}`,
    startLine: 0,
    startColumn: 0,
    endLine: lines.length,
    endColumn: lines.pop()!.length,
    executionContextId,
    hash: '',
    buildId: '',
  };
}
