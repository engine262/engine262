#!/usr/bin/env node

'use strict';

require('source-map-support/register');
const repl = require('repl');
const { initializeAgent, Realm, Inspect } = require('.');

initializeAgent({
  flags: [
    'globalThis',
    'Object.fromEntries',
  ],
});

const realm = new Realm();

repl.start({
  prompt: '> ',
  eval: (cmd, context, filename, callback) => {
    const result = realm.evaluateScript(cmd);
    const inspected = Inspect(result, realm);
    callback(null, inspected);
  },
  writer: (o) => o,
});
