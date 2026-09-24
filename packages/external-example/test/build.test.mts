import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';

test('expands engine262 macros and inserts GC frames', async () => {
  const output = await readFile(resolve(import.meta.dirname, '../dist/index.mjs'), 'utf8');
  expect(output).not.toMatch(/\bQ\s*\(/);
  expect(output.match(/function _usingCtx[^ (]*\(\)/g)).toHaveLength(1);
  expect(output.match(/\bcaptureEvaluatorFrame\(/g)).toHaveLength(1);
  expect(output).toContain('Evaluate.specName || "Evaluate"');
  expect(output).toMatch(/captureEvaluatorFrame\(\(\) => \(\{\s+value\s+\}\)/);
  expect(output).toContain('return MayFail(value);');
});
