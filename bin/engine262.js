#!/usr/bin/env node

'use strict';

require('source-map-support/register');
const repl = require('repl');
const fs = require('fs');

let engine262;
try {
  engine262 = require('..');
} catch (e) {
  require('v8').setFlagsFromString('--harmony-do-expressions');
  engine262 = require('..');
}

const {
  initializeAgent,
  inspect,
  Realm,
  AbruptCompletion,
  Value,
  Object: APIObject,
  Abstract,
} = engine262;

initializeAgent({
  flags: [
    'globalThis',
    'Object.fromEntries',
  ],
});

function createRealm() {
  const realm = new Realm();

  const $ = new APIObject(realm);
  realm.$ = $;

  Abstract.CreateDataProperty($, new Value(realm, 'global'), realm.global);
  Abstract.CreateDataProperty($, new Value(realm, 'createRealm'), new Value(realm, () => {
    const r = createRealm();
    return r.$;
  }));
  Abstract.CreateDataProperty($, new Value(realm, 'evalScript'),
    new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$'), $);

  return realm;
}

if (process.argv[2]) {
  const realm = createRealm();
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
  const realm = createRealm();
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
