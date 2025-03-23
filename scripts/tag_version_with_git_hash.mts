import { execSync } from 'child_process';
import fs from 'fs';
import json from '../package.json' with { type: 'json' };

const jsonPath = new URL('../package.json', import.meta.url);

process.stdout.write('Checking package.json for git revision...\n');

if (!json.version.includes('-')) {
  process.stdout.write('Inserting git revision into package.json...\n');

  const hash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  json.version = `${json.version}-${hash}`;
  fs.writeFileSync(jsonPath, `${JSON.stringify(json, null, 2)}\n`);
}

process.stdout.write('Done!\n');
