#!/usr/bin/env node

'use strict';

const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const child = spawnSync(process.execPath, [
  ...process.execArgv, '--disable-warning=ExperimentalWarning', '--experimental-strip-types',
  resolve(__dirname, './engine262.mts'), ...process.argv.slice(2),
], {
  stdio: 'inherit',
});

if (child.status) {
  process.exit(child.status);
}
