'use strict';

const { execSync } = require('child_process');

const lines = execSync('git diff')
  .toString()
  .split('\n')
  .filter((line) => /^[+-][^+-]/.test(line));

// If only the version hash changed, exit 1
if (lines.every((line) => line.includes('engine262 0.0.1'))) {
  process.exit(1);
}
