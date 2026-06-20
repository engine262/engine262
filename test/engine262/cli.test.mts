/* eslint-disable quotes */
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const bin = fileURLToPath(new URL('../../lib-src/node/bin.mts', import.meta.url));

function runCli(args: string[]) {
  return new Promise<{ code: number | null, stdout: string, stderr: string }>((resolve) => {
    execFile(process.execPath, [bin, ...args], (error, stdout, stderr) => {
      resolve({
        code: error && 'code' in error ? error.code as number | null : 0,
        stdout,
        stderr,
      });
    });
  });
}

test('script', async () => {
  const cp = await runCli(['-e', 'print(1)']);
  expect(cp.code).toBe(0);
  expect(cp.stdout).toMatchInlineSnapshot(`"1\n"`);
  expect(cp.stderr).toMatchInlineSnapshot(`""`);
});

test('module', async () => {
  const cp = await runCli([fileURLToPath(new URL('./fixture/module-success.mjs', import.meta.url))]);
  expect(cp.code).toBe(0);
  expect(cp.stdout).toMatchInlineSnapshot(`
    "'hello'
    "
  `);
  expect(cp.stderr).toMatchInlineSnapshot(`""`);
});

test('syntax error', async () => {
  const cp = await runCli(['-e', ' +']);
  expect(cp.code).toBe(1);
  expect(cp.stdout).toMatchInlineSnapshot(`""`);
  expect(cp.stderr).toMatchInlineSnapshot(`
    "SyntaxError: Unexpected token
    <eval>:1:3
     +
      ^
    "
  `);
});

test('module graph error', async () => {
  const cp = await runCli(['--module', '--eval', 'import "./x.js";']);
  expect(cp.code).toBe(1);
  expect(cp.stdout).toMatchInlineSnapshot(`""`);
  expect(cp.stderr).toMatchInlineSnapshot(`
    "Error: Cannot load module ./x.js
    "
  `);
});

test('sync error', async () => {
  const cp = await runCli(['--eval', 'throw new Error']);
  expect(cp.code).toBe(1);
  expect(cp.stdout).toMatchInlineSnapshot(`""`);
  expect(cp.stderr).toMatchInlineSnapshot(`
    "Error
        at <eval>:1:11
    "
  `);
});

test('async error', async () => {
  const cp = await runCli(['--module', '--eval', 'await new Promise(r => setTimeout(r, 500)).then(() => { throw new Error(); })']);
  expect(cp.code).toBe(1);
  expect(cp.stdout).toMatchInlineSnapshot(`""`);
  expect(cp.stderr).toMatchInlineSnapshot(`
    "Error
        at <anonymous> (<eval>:1:67)
    "
  `);
});

test('unhandled promise rejection', async () => {
  const cp = await runCli(['--eval', 'Promise.reject(new Error)']);
  expect(cp.code).toBe(1);
  expect(cp.stdout).toMatchInlineSnapshot(`""`);
  expect(cp.stderr).toMatchInlineSnapshot(`
    "Unhandled promise rejection: Error
        at <eval>:1:20
    "
  `);
});

test('uncaught error', async () => {
  const cp = await runCli(['--eval', 'setTimeout(() => { throw new Error; }, 500)']);
  expect(cp.code).toBe(1);
  expect(cp.stdout).toMatchInlineSnapshot(`""`);
  expect(cp.stderr).toMatchInlineSnapshot(`
    "Uncaught exception: Error
        at <anonymous> (<eval>:1:30)
    "
  `);
});
