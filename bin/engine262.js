#!/usr/bin/env node

'use strict';

const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const { fileURLToPath } = require('node:url');

const child = spawnSync(process.execPath, [
  ...process.execArgv, '--disable-warning=ExperimentalWarning', '--experimental-strip-types',
  fileURLToPath(resolve('./engine262.mts')), ...process.argv.slice(2),
], {
  stdio: 'inherit',
});

if (child.status) {
  process.exit(child.status);
}
