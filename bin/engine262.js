#!/usr/bin/env node

'use strict';

require('@snek/source-map-support/register');
const repl = require('repl');
const fs = require('fs');
const path = require('path');

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
  Throw,
} = engine262;

initializeAgent();

function createRealm() {
  const realm = new Realm({
    resolveImportedModule(referencingModule, specifier) {
      const resolved = path.resolve(path.dirname(referencingModule.specifier), specifier);
      if (resolved === realm.moduleEntry.specifier) {
        return realm.moduleEntry;
      }
      if (!fs.existsSync(resolved)) {
        return Throw(realm, 'Error', `Cannot resolve module ${specifier}`);
      }
      const source = fs.readFileSync(resolved, 'utf8');
      return realm.createSourceTextModule(resolved, source);
    },
  });

  const print = new Value(realm, (args) => {
    console.log(...args.map((a) => inspect(a))); // eslint-disable-line no-console
    return Value.undefined;
  }, [], realm);
  const raw = new Value(realm, (args) => {
    console.log(...args); // eslint-disable-line no-console
    return Value.undefined;
  }, [], realm);
  Abstract.CreateDataProperty(print, new Value(realm, 'raw'), raw);
  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), print);

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
  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $);

  return realm;
}

const argv = process.argv.slice(2);
const help = `
engine262 v${require('../package.json').version}

Usage:

    engine262 [options]
    engine262 [options] [input-file]
    engine262 [input-file]

Options:

    -h, --help    Show help (this screen)
    -m, --module  Evaluate contents of input-file as a module. Must be followed by input-file

`;

if (argv.length) {
  const realm = createRealm();
  const lastArg = argv[argv.length - 1];

  let isModule = false;
  let source;
  let result;

  if (/^(-h|--help)$/.test(lastArg)) {
    process.stdout.write(help);
    process.exit(0);
  }

  if (/(\.mjs|\.js)$/.test(lastArg)) {
    source = fs.readFileSync(lastArg, 'utf8');
  }

  if (lastArg.endsWith('.mjs') || (argv.includes('-m') || argv.includes('--module'))) {
    isModule = true;
  }

  if (isModule) {
    result = realm.createSourceTextModule(path.resolve(lastArg), source);
    if (!(result instanceof AbruptCompletion)) {
      const module = result;
      realm.moduleEntry = module;
      result = module.Instantiate();
      if (!(result instanceof AbruptCompletion)) {
        result = module.Evaluate();
      }
    }
  } else {
    result = realm.evaluateScript(source);
  }
  if (result instanceof AbruptCompletion) {
    let inspected;
    if (Abstract.Type(result.Value) === 'Object') {
      const errorToString = realm.realm.Intrinsics['%ErrorPrototype%'].properties.get(new Value(realm, 'toString')).Value;
      inspected = Abstract.Call(errorToString, result.Value).stringValue();
    } else {
      inspected = inspect(result, realm);
    }
    process.stderr.write(`${inspected}\n`);
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
