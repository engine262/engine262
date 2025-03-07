#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const child = spawnSync(process.execPath, [
  ...process.execArgv, '--disable-warning=ExperimentalWarning', '--experimental-strip-types',
  fileURLToPath(import.meta.resolve('./engine262.mts')), ...process.argv.slice(2)
], {
  stdio: 'inherit',
});

if (child.status) process.exit(child.status);
