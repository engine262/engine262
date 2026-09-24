import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  Config,
  Label,
  LabelAttach,
  Range,
  Report,
  RichText,
  Source,
  create_semantic_token_from_typescript_ast,
} from '@magic-works/ariadne';
import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import * as typescript from 'typescript';
import { rules } from '../src/index.mts';

const cwd = resolve(import.meta.dirname, '..');
const fixtureDirectory = resolve(cwd, 'test/fixture');
const settings = {
  engine262: {
    compiler: false,
    internals: '#self',
    valueDefinitionPath: resolve(cwd, '../../src/value.mts'),
  },
};
const compilerSettings = {
  engine262: {
    ...settings.engine262,
    compiler: true,
  },
};
const provideSemanticTokens = create_semantic_token_from_typescript_ast(typescript);
const linter = new Linter();

export function generateSnapshot(
  sourceName: string,
  ruleName: keyof typeof rules,
  ruleSettings = settings,
): string {
  const filename = resolve(fixtureDirectory, sourceName);
  const source = readFileSync(filename, 'utf8').trimEnd();
  const messages = linter.verify(source, {
    files: ['**/*.mts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: cwd,
      },
    },
    plugins: { engine262: { rules } },
    rules: { [`engine262/${ruleName}`]: 'error' },
    settings: ruleSettings,
  }, filename);

  const reports = messages.map((message) => {
    const start = sourceOffset(source, message.line, message.column);
    const end = message.endLine !== undefined && message.endColumn !== undefined
      ? sourceOffset(source, message.endLine, message.endColumn)
      : start + 1;
    const builder = Report.build(sourceName, start)
      .with_message(`${ruleName}: ${message.message}`)
      .with_label(Label.new({
        sourceId: sourceName,
        range: Range.new(start, end),
      }).with_message(message.message))
      .with_semantic_token_capability()
      .with_config(Config.default().with_label_attach(LabelAttach.Start))
      .with_semantic_token_ranged(provideSemanticTokens);
    if (message.fix && containsAbsoluteModuleImport(message.fix.text)) {
      throw new Error(`Absolute module import in fix text: ${message.fix.text}`);
    }
    if (message.fix) {
      const { range, text } = message.fix;
      const fixedSource = source.slice(0, range[0]) + text + source.slice(range[1]);
      for (const chunk of changedLineChunks(source, fixedSource)) {
        const labelLine = chunk.oldLines.length === 0
          ? Math.max(0, chunk.oldStartLine - 1)
          : chunk.oldStartLine;
        const lineStart = lineStartOffset(source, labelLine);
        const lineEnd = lineEndOffset(source, labelLine);
        const diff = RichText.from([
          ...(chunk.oldLines.length > 0
            ? [{ text: chunk.oldLines.join('\n'), diff: 'before' as const }]
            : []),
          ...(chunk.newLines.length > 0
            ? [{ text: chunk.newLines.join('\n'), diff: 'after' as const }]
            : []),
        ]);
        builder.with_label(Label.new({
          sourceId: sourceName,
          range: Range.new(lineStart, lineEnd),
        }).with_message(diff));
      }
    }
    return builder.finish().render(
      { sourceId: sourceName, source: Source.from(`${source}\n`) },
      'plain',
      { maxWidth: 1000, contextLines: 3 },
    );
  });
  return reports.join('\n');
}

export function generateRuleSnapshot(
  fixtures: readonly SnapshotFixture[],
): string {
  return fixtures.map(([sourceName, ruleName, ruleSettings]) => (
    generateSnapshot(sourceName, ruleName, ruleSettings)
  )).join('\n');
}

function sourceOffset(source: string, line: number, column: number): number {
  return source.split('\n').slice(0, line - 1)
    .reduce((offset, item) => offset + item.length + 1, 0) + column - 1;
}

function containsAbsoluteModuleImport(text: string): boolean {
  return /\bimport\(\s*["'](?:\/|[A-Za-z]:[\\/])/.test(text);
}

interface DiffChunk {
  oldStartLine: number;
  oldLines: string[];
  newLines: string[];
}

function changedLineChunks(oldSource: string, newSource: string): DiffChunk[] {
  const oldLines = oldSource.split('\n');
  const newLines = newSource.split('\n');
  const lengths = oldLines.map(() => newLines.map(() => 0));
  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex--) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex--) {
      lengths[oldIndex][newIndex] = oldLines[oldIndex] === newLines[newIndex]
        ? (lengths[oldIndex + 1]?.[newIndex + 1] ?? 0) + 1
        : Math.max(lengths[oldIndex + 1]?.[newIndex] ?? 0, lengths[oldIndex]?.[newIndex + 1] ?? 0);
    }
  }
  const chunks: DiffChunk[] = [];
  let chunk: DiffChunk | undefined;
  const flush = () => {
    if (chunk && (chunk.oldLines.length > 0 || chunk.newLines.length > 0)) chunks.push(chunk);
    chunk = undefined;
  };
  let oldIndex = 0;
  let newIndex = 0;
  while (oldIndex < oldLines.length && newIndex < newLines.length) {
    if (oldLines[oldIndex] === newLines[newIndex]) {
      flush();
      oldIndex++;
      newIndex++;
    } else if ((lengths[oldIndex + 1]?.[newIndex] ?? 0) >= (lengths[oldIndex]?.[newIndex + 1] ?? 0)) {
      chunk ??= { oldStartLine: oldIndex, oldLines: [], newLines: [] };
      chunk.oldLines.push(oldLines[oldIndex++]);
    } else {
      chunk ??= { oldStartLine: oldIndex, oldLines: [], newLines: [] };
      chunk.newLines.push(newLines[newIndex++]);
    }
  }
  if (oldIndex < oldLines.length || newIndex < newLines.length) {
    chunk ??= { oldStartLine: oldIndex, oldLines: [], newLines: [] };
    chunk.oldLines.push(...oldLines.slice(oldIndex));
    chunk.newLines.push(...newLines.slice(newIndex));
  }
  flush();
  return chunks;
}

function lineStartOffset(source: string, line: number): number {
  return source.split('\n').slice(0, line).reduce((offset, item) => offset + item.length + 1, 0);
}

function lineEndOffset(source: string, line: number): number {
  if (line < 0) return 0;
  const start = lineStartOffset(source, line);
  const end = source.indexOf('\n', start);
  return end === -1 ? source.length : end;
}

type SnapshotFixture = readonly [string, keyof typeof rules, typeof settings];

export const snapshots = [
  {
    name: 'gc-captures',
    fixtures: [
      ['gc-captures-factory.invalid.fixture.mts', 'gc-captures', compilerSettings],
      ['gc-captures-transformed.invalid.fixture.mts', 'gc-captures', compilerSettings],
    ],
  },
  {
    name: 'gc-captures-manual',
    fixtures: [['gc-captures.invalid.fixture.mts', 'gc-captures-manual', settings]],
  },
  {
    name: 'gc-mark-complete',
    fixtures: [['gc-mark-complete.invalid.fixture.mts', 'gc-mark-complete', settings]],
  },
  {
    name: 'no-floating-evaluator',
    fixtures: [['no-floating-evaluator.invalid.fixture.mts', 'no-floating-evaluator', settings]],
  },
  {
    name: 'q-macro',
    fixtures: [
      ['q-macro.invalid.fixture.mts', 'q-macro', settings],
      ['q-macro-spread.invalid.fixture.mts', 'q-macro', settings],
      ['q-macro-outside-function.invalid.fixture.mts', 'q-macro', settings],
      ['q-macro-transform.invalid.fixture.mts', 'q-macro', settings],
    ],
  },
  {
    name: 'record-class',
    fixtures: [
      ['record-class.invalid.fixture.mts', 'record-class', settings],
      ['record-class.fixable.fixture.mts', 'record-class', settings],
    ],
  },
] as const satisfies readonly { name: string; fixtures: readonly SnapshotFixture[] }[];
