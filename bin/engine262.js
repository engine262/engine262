#!/usr/bin/env node

'use strict';

/* eslint-disable import/order */

try {
  require('@snek/source-map-support/register');
} catch {
  // empty
}

const repl = require('repl');
const fs = require('fs');
const path = require('path');
const util = require('util');
const packageJson = require('../package.json');
const snekparse = require('./snekparse');
const {
  inspect,
  Agent,
  Completion,
  AbruptCompletion,
  Value,
  Object: APIObject,
  Abstract,
  Throw,
  FEATURES,
} = require('..');
const { createRealm } = require('./test262_realm');

const execArgv = [];
let entry;
const programArgv = [];

{
  let target = execArgv;
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--')) {
      target.push(a);
    } else if (!entry) {
      entry = a;
      target = programArgv;
    } else {
      target.push(a);
    }
  });
}

const help = `
engine262 v${require('../package.json').version}

Usage:

    engine262 [options]
    engine262 [options] [input file]
    engine262 [input file]

Options:

    -h, --help      Show help (this screen)
    -m, --module    Evaluate contents of input-file as a module.
                    Must be followed by input-file
    --features=...  A comma separated list of features. If no features
                    are provided, the available features are listed.

`;

const argv = snekparse(execArgv);

if (argv.h || argv.help) {
  process.stdout.write(help);
  process.exit(0);
} else if (argv.features === true) {
  FEATURES.forEach(({ name, url }) => {
    process.stdout.write(`${name} - ${url}\n`);
  });
  process.exit(0);
}

let features;
if (argv.features === 'all') {
  features = FEATURES.map((f) => f.name);
} else if (argv.features) {
  features = argv.features.split(',');
} else {
  features = [];
}

const agent = new Agent({ features });
agent.enter();

const { realm, resolverCache } = createRealm({ printCompatMode: true });
{
  const console = new APIObject(realm);
  Abstract.CreateDataProperty(realm.global, new Value(realm, 'console'), console);

  const format = (args) => args.map((a, i) => {
    if (i === 0 && Abstract.Type(a) === 'String') {
      return a.stringValue();
    }
    return inspect(a, realm);
  }).join(' ');

  const log = new Value(realm, (args) => {
    process.stdout.write(`${format(args)}\n`);
    return Value.undefined;
  });

  Abstract.CreateDataProperty(console, new Value(realm, 'log'), log);

  const error = new Value(realm, (args) => {
    process.stderr.write(`${format(args)}\n`);
    return Value.undefined;
  });

  Abstract.CreateDataProperty(console, new Value(realm, 'error'), error);

  const debug = new Value(realm, (args) => {
    process.stderr.write(`${util.format(...args)}\n`);
    return Value.undefined;
  });

  Abstract.CreateDataProperty(console, new Value(realm, 'debug'), debug);
}

if (argv.inspector) {
  const inspector = require('../inspector');
  inspector.attachRealm(realm);
}

function oneShotEval(source, filename) {
  let result;
  if (argv.m || argv.module || filename.endsWith('.mjs')) {
    result = realm.createSourceTextModule(filename, source);
    if (!(result instanceof AbruptCompletion)) {
      const module = result;
      resolverCache.set(filename, result);
      result = module.Link();
      if (!(result instanceof AbruptCompletion)) {
        result = module.Evaluate();
      }
      if (!(result instanceof AbruptCompletion)) {
        if (result.PromiseState === 'rejected') {
          result = Throw(realm, result.PromiseResult);
        }
      }
    }
  } else {
    result = realm.evaluateScript(source, { specifier: filename });
  }
  if (result instanceof AbruptCompletion) {
    const inspected = inspect(result, realm);
    process.stderr.write(`${inspected}\n`);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

if (entry) {
  const source = fs.readFileSync(entry, 'utf8');
  oneShotEval(source, path.resolve(entry));
} else if (!process.stdin.isTTY) {
  process.stdin.setEncoding('utf8');
  let source = '';
  process.stdin.on('data', (data) => {
    source += data;
  });
  process.stdin.once('end', () => {
    oneShotEval(source, process.cwd());
  });
} else {
  process.stdout.write(`${packageJson.name} v${packageJson.version}
Please report bugs to ${packageJson.bugs.url}
`);
  repl.start({
    prompt: '> ',
    eval: (cmd, context, filename, callback) => {
      try {
        const result = realm.evaluateScript(cmd, { specifier: process.cwd() });
        callback(null, result);
      } catch (e) {
        callback(e, null);
      }
    },
    preview: false,
    completer: () => [],
    writer: (o) => {
      if (o instanceof Value || o instanceof Completion) {
        return inspect(o, realm);
      }
      return util.inspect(o);
    },
  });
}
