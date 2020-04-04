'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const readInterface = readline.createInterface({
  input: fs.createReadStream(path.join(__dirname, 'CaseFolding.txt')),
  console: false,
});

const lineReg = /^(?<code>[\dA-F]+); (?<status>C|S); (?<mapping>[\dA-F]+);/;

const mapping = Object.create(null);

readInterface.on('line', (line) => {
  const match = line.match(lineReg);
  if (match) {
    const from = String.fromCodePoint(Number.parseInt(match.groups.code, 16));
    const to = String.fromCodePoint(Number.parseInt(match.groups.mapping, 16));
    mapping[from] = to;
  }
});

readInterface.on('close', () => {
  const code = `export const caseFoldingMapping = ${JSON.stringify(mapping)};`;
  fs.writeFileSync(path.join(__dirname, '../../src/unicode/caseFoldingMapping-gen.mjs'), code);
});
