'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

const pjsonPath = require.resolve('../package.json');

const pjson = JSON.parse(fs.readFileSync(pjsonPath, 'utf8'));

process.stdout.write('Checking package.json for git revision...\n');

if (!pjson.version.includes('-')) {
  process.stdout.write('Inserting git revision into package.json...\n');

  const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  pjson.version = `${pjson.version}-${hash}`;
  fs.writeFileSync(pjsonPath, `${JSON.stringify(pjson, null, 2)}\n`);
}

process.stdout.write('Done!\n');
