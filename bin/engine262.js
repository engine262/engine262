#!/usr/bin/env node

'use strict';

require('source-map-support/register');
const repl = require('repl');
const fs = require('fs');
const {
  initializeAgent,
  inspect,
  Realm,
  AbruptCompletion,
} = require('..');

initializeAgent({
  flags: [
    'globalThis',
    'Object.fromEntries',
  ],
});

const realm = new Realm();

if (process.argv[2]) {
  const source = fs.readFileSync(process.argv[2], 'utf8');
  const result = realm.evaluateScript(source);
  if (result instanceof AbruptCompletion) {
    const inspected = inspect(result, realm);
    process.stderr.write(inspected);
    process.exit(1);
  } else {
    process.exit(0);
  }
} else {
  repl.start({
    prompt: '> ',
    eval: (cmd, context, filename, callback) => {
      const result = realm.evaluateScript(cmd);
      callback(null, result);
    },
    completer: () => [],
    writer: (o) => inspect(o, realm),
  });
}
