#!/usr/bin/env node

import { start } from 'node:repl';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format as _format, inspect as _inspect, parseArgs } from 'node:util';
import packageJson from '../package.json' with { type: 'json' }; // eslint-disable-line import/order
import { setSurroundingAgent, FEATURES, inspect, Value, CreateBuiltinFunction, CreateDataProperty, OrdinaryObjectCreate, Type, Completion, AbruptCompletion, Throw, ObjectValue, JSStringValue } from '#self';
import { createRealm, createAgent } from './test262_realm.mts';

const help = `
engine262 v${packageJson.version}

Usage:

    engine262 [options]
    engine262 [options] [input file]
    engine262 [input file]

Options:

    -h, --help      Show help (this screen)
    -m, --module    Evaluate contents of input-file as a module.
    --features=...  A comma separated list of features.
    --features=all  Enable all features.
    --list-features List available features.
    --inspector     [TODO]: Attach an inspector.
`;

const argv = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  strict: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    module: { type: 'boolean', short: 'm' },
    features: { type: 'string' },
    'list-features': { type: 'boolean' },
    inspector: { type: 'boolean' },
  },
});

if (argv.values.help) {
  process.stdout.write(help);
  process.exit(0);
} else if (argv.values['list-features']) {
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
  const log = (f: string, n: string, u: string) => {
    process.stdout.write(`${f.padEnd(flagLength, ' ')} ${n.padEnd(nameLength, ' ')} ${u}\n`);
  };
  log('flag', 'name', 'url');
  log('----', '----', '---');
  FEATURES.forEach((f) => {
    log(f.flag, f.name, f.url);
  });
  process.exit(0);
}

let features: string[];
if (argv.values.features === 'all') {
  features = FEATURES.map((f) => f.flag);
} else if (argv.values.features) {
  features = argv.values.features.split(',');
} else {
  features = [];
}

const agent = createAgent({ features });
setSurroundingAgent(agent);

const { realm, resolverCache } = createRealm({ printCompatMode: true });
realm.scope(() => {
  const console = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%'] as ObjectValue);
  CreateDataProperty(realm.GlobalObject, Value('console'), console);

  const format = (args: readonly Value[]) => args.map((a, i) => {
    if (i === 0 && Type(a) === 'String') {
      return (a as JSStringValue).stringValue();
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
    process.stderr.write(`${_format(...args)}\n`);
    return Value.undefined;
  }, 1, Value('debug'), []);
  CreateDataProperty(console, Value('debug'), debug);
});

if (argv.values.inspector) {
  throw new Error('TODO: Attach an inspector');
}

function oneShotEval(source: string, filename: string) {
  function Q<T>(value: T | AbruptCompletion): T {
    if (value instanceof AbruptCompletion) {
      throw value;
    }
    return value as T;
  }
  realm.scope(() => {
    try {
      if (argv.values.module || filename.endsWith('.mjs')) {
        const module = Q(realm.createSourceTextModule(filename, source));
        resolverCache.set(filename, module);
        const load = Q(module.LoadRequestedModules());
        if (load.PromiseState === 'rejected') {
          Q(Throw(load.PromiseResult!, 'Raw', load.PromiseResult!));
        } else if (load.PromiseState === 'pending') {
          throw new Error('Internal error: .LoadRequestedModules() returned a pending promise');
        }
        Q(module.Link());
        const evaluate = Q(module.Evaluate());
        if (evaluate.PromiseState === 'rejected') {
          Q(Throw(evaluate.PromiseResult!, 'Raw', evaluate.PromiseResult!));
        }
      } else {
        Q(realm.evaluateScript(source, { specifier: filename }));
      }
    } catch (e) {
      if (e instanceof AbruptCompletion) {
        const inspected = inspect(e as AbruptCompletion);
        process.stderr.write(`${inspected}\n`);
        process.exit(1);
      } else {
        throw e;
      }
    }
  });
}

if (argv.positionals[0]) {
  const source = readFileSync(argv.positionals[0], 'utf8');
  oneShotEval(source, resolve(argv.positionals[0]));
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
  start({
    prompt: '> ',
    eval: (cmd, _context, _filename, callback) => {
      try {
        const result = realm.evaluateScript(cmd, { specifier: '(engine262)' });
        callback(null, result);
      } catch (e) {
        callback(e as Error, null);
      }
    },
    preview: false,
    completer: () => [],
    writer: (o) => realm.scope(() => {
      if (o instanceof Value || o instanceof Completion) {
        return inspect(o as Value | Completion);
      }
      return _inspect(o);
    }),
  });
}
