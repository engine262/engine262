#!/usr/bin/env node

'use strict';

const repl = require('repl');
const fs = require('fs');
const path = require('path');
const util = require('util');
const packageJson = require('../package.json'); // eslint-disable-line import/order
const {
  setSurroundingAgent,

  FEATURES,
  inspect,

  Value,

  CreateBuiltinFunction,
  CreateDataProperty,
  OrdinaryObjectCreate,
  Type,

  Completion,
  AbruptCompletion,
  Throw,
} = require('..');
const snekparse = require('./snekparse');
const { createRealm, createAgent } = require('./test262_realm');

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
  let nameLength = 0;
  let flagLength = 0;
  FEATURES.forEach((f) => {
    if (f.name.length > nameLength) {
      nameLength = f.name.length;
    }
    if (f.flag.length > flagLength) {
      flagLength = f.flag.length;
    }
  });
  const log = (f, n, u) => {
    process.stdout.write(`${f.padEnd(flagLength, ' ')} ${n.padEnd(nameLength, ' ')} ${u}\n`);
  };
  log('flag', 'name', 'url');
  log('----', '----', '---');
  FEATURES.forEach((f) => {
    log(f.flag, f.name, f.url);
  });
  process.exit(0);
}

let features;
if (argv.features === 'all') {
  features = FEATURES.map((f) => f.flag);
} else if (argv.features) {
  features = argv.features.split(',');
} else {
  features = [];
}

const agent = createAgent({ features });
setSurroundingAgent(agent);

const { realm, resolverCache } = createRealm({ printCompatMode: true });
realm.scope(() => {
  const console = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
  CreateDataProperty(realm.GlobalObject, Value('console'), console);

  const format = (args) => args.map((a, i) => {
    if (i === 0 && Type(a) === 'String') {
      return a.stringValue();
    }
    return inspect(a);
  }).join(' ');

  const log = CreateBuiltinFunction((args) => {
    process.stdout.write(`${format(args)}\n`);
    return Value.undefined;
  }, 1, Value('log'), []);
  CreateDataProperty(console, Value('log'), log);

  const error = CreateBuiltinFunction((args) => {
    process.stderr.write(`${format(args)}\n`);
    return Value.undefined;
  }, 1, Value('error'), []);
  CreateDataProperty(console, Value('error'), error);

  const debug = CreateBuiltinFunction((args) => {
    process.stderr.write(`${util.format(...args)}\n`);
    return Value.undefined;
  }, 1, Value('debug'), []);
  CreateDataProperty(console, Value('debug'), debug);
});

if (argv.inspector) {
  const inspector = require('../inspector');
  inspector.attachRealm(realm);
}

function oneShotEval(source, filename) {
  realm.scope(() => {
    let result;
    if (argv.m || argv.module || filename.endsWith('.mjs')) {
      result = realm.createSourceTextModule(filename, source);
      if (!(result instanceof AbruptCompletion)) {
        const module = result;
        resolverCache.set(filename, result);
        result = module.LoadRequestedModules();
        if (!(result instanceof AbruptCompletion)) {
          if (result.PromiseState === 'rejected') {
            result = Throw(result.PromiseResult);
          } else if (result.PromiseState === 'pending') {
            throw new Error('Internal error: .LoadRequestedModules() returned a pending promise');
          }
        }
        if (!(result instanceof AbruptCompletion)) {
          result = module.Link();
        }
        if (!(result instanceof AbruptCompletion)) {
          result = module.Evaluate();
        }
        if (!(result instanceof AbruptCompletion)) {
          if (result.PromiseState === 'rejected') {
            result = Throw(result.PromiseResult);
          }
        }
      }
    } else {
      result = realm.evaluateScript(source, { specifier: filename });
    }
    if (result instanceof AbruptCompletion) {
      const inspected = inspect(result);
      process.stderr.write(`${inspected}\n`);
      process.exit(1);
    }
  });
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
        const result = realm.evaluateScript(cmd, { specifier: '(engine262)' });
        callback(null, result);
      } catch (e) {
        callback(e, null);
      }
    },
    preview: false,
    completer: () => [],
    writer: (o) => realm.scope(() => {
      if (o instanceof Value || o instanceof Completion) {
        return inspect(o);
      }
      return util.inspect(o);
    }),
  });
}
