import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { transformAsync } from '@babel/core';
import { expect, test } from 'vitest';
import { createBabelOptions } from '../../scripts/rollup.config.mts';

const usingFixture = `
  function* probe(log, mode) {
    using _ = { [Symbol.dispose]() { log.push('disposed'); } };
    yield 'started';
    if (mode === 'throw') throw new Error('fixture');
    return 'finished';
  }
`;

test('inspector Babel options lower using and dispose generators on completion, throw, and return', async () => {
  const transformed = await transformAsync(usingFixture, {
    ...createBabelOptions(),
    babelrc: false,
    configFile: false,
    filename: 'inspector-using.fixture.mts',
  });
  expect(transformed?.code).toBeDefined();
  expect(transformed!.code).not.toMatch(/\busing\s+_\b/);
  const probe: (
    log: string[],
    mode: 'normal' | 'throw' | 'return',
  ) => Generator<string, string> = runInNewContext(`${transformed!.code}; probe;`);

  const normalLog: string[] = [];
  const normal = probe(normalLog, 'normal');
  expect(normal.next()).toEqual({ done: false, value: 'started' });
  expect(normal.next()).toEqual({ done: true, value: 'finished' });
  expect(normalLog).toEqual(['disposed']);

  const throwLog: string[] = [];
  const throwing = probe(throwLog, 'throw');
  throwing.next();
  expect(() => throwing.next()).toThrow('fixture');
  expect(throwLog).toEqual(['disposed']);

  const returnLog: string[] = [];
  const returning = probe(returnLog, 'return');
  returning.next();
  expect(returning.return('closed')).toEqual({ done: true, value: 'closed' });
  expect(returnLog).toEqual(['disposed']);
});

test('all four Rollup outputs can be loaded', async () => {
  const require = createRequire(import.meta.url);
  const engineCjs = require('../../lib/engine262.js') as object;
  const inspectorCjs = require('../../lib/inspector.js') as object;
  const engineEsm = await import('../../lib/engine262.mjs');
  const inspectorEsm = await import('../../lib/inspector.mjs');

  expect(engineCjs).toHaveProperty('Agent');
  expect(engineEsm).toHaveProperty('Agent');
  expect(inspectorCjs).toHaveProperty('Inspector');
  expect(inspectorEsm).toHaveProperty('Inspector');
});

test('Rollup emits each bundled Babel helper at most once', () => {
  const engineOutputs = [
    readFileSync(resolve(import.meta.dirname, '../../lib/engine262.js'), 'utf8'),
    readFileSync(resolve(import.meta.dirname, '../../lib/engine262.mjs'), 'utf8'),
  ];
  for (const output of engineOutputs) {
    expect(output.match(/function _usingCtx[^ (]*\(\)/g)).toHaveLength(1);
    expect(output).not.toContain('@engine262/babel-helpers');
  }

  const inspectorOutputs = [
    readFileSync(resolve(import.meta.dirname, '../../lib/inspector.js'), 'utf8'),
    readFileSync(resolve(import.meta.dirname, '../../lib/inspector.mjs'), 'utf8'),
  ];
  for (const output of inspectorOutputs) {
    expect(output.match(/function _usingCtx[^ (]*\(\)/g)?.length ?? 0).toBeLessThanOrEqual(1);
    expect(output).not.toContain('@engine262/babel-helpers');
  }
});
