#!/usr/bin/env node

import { start } from 'node:repl';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format as _format, inspect as _inspect, parseArgs } from 'node:util';
import packageJson from '../../package.json' with { type: 'json' };
import { createConsole } from '../inspector/utils.mts';
import {
  setSurroundingAgent, FEATURES, inspect, Value, Completion, AbruptCompletion,
  type Arguments,
  evalQ,
  Agent,
  ManagedRealm,
  Throw,
  skipDebugger,
  type ValueCompletion,
  createTest262Intrinsics,
  ToString,
} from '#self';

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
    --no-test262    Do not expose $ and $262 for test262.
    --no-inspector  Do not attach an inspector.
    --no-preview    Do not enable preview in the inspector.
`;

const argv = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  allowNegative: true,
  strict: true,
  options: {
    'help': { type: 'boolean', short: 'h' },
    'module': { type: 'boolean', short: 'm' },
    'features': { type: 'string' },
    'list-features': { type: 'boolean' },
    'inspector': { type: 'boolean' },
    'preview': { type: 'boolean', default: true },
    'test262': { type: 'boolean', default: true },
    // hidden options
    'preview-debug': { type: 'boolean' },
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

const agent = new Agent({ features });
setSurroundingAgent(agent);

const realm = new ManagedRealm({});
// Define console.log
{
  const format = (args: Arguments) => evalQ(function* format(Q) {
    const str = [];
    for (const arg of args) {
      str.push(Q(yield* ToString(arg)).stringValue());
    }
    return str.join(' ');
  });
  createConsole(realm, {
    log: (args) => {
      process.stdout.write(`${format(args)}\n`);
    },
    error: (args) => {
      process.stderr.write(`${format(args)}\n`);
    },
    debug: (args) => {
      process.stderr.write(`${_format(...args)}\n`);
    },
  });
}
if (argv.values.test262) {
  createTest262Intrinsics(realm, argv.values.test262);
}

if (argv.values.inspector !== false) {
  let has_ws = false;
  try {
    await import('ws');
    has_ws = true;
  } catch {
    if (argv.values.inspector === true) {
      process.stderr.write('--inspector requires the "ws" package to be installed.\n');
      process.exit(1);
    }
  }
  if (has_ws) {
    // @ts-ignore
    const { NodeWebsocketInspector } = await import('./inspector.mts');
    const inspect = await NodeWebsocketInspector.new();
    inspect.attachRealm(realm, 'Main Realm');
    inspect.preference.preview = argv.values.preview;
    inspect.preference.previewDebug = argv.values['preview-debug'] || false;
  }
}

function oneShotEval(source: string, filename: string) {
  realm.scope(() => {
    const completion = evalQ((Q) => {
      if (argv.values.module || filename.endsWith('.mjs')) {
        const module = Q(realm.createSourceTextModule(filename, source));
        realm.HostDefined.resolverCache?.set(filename, module);
        const load = Q(module.LoadRequestedModules());
        if (load.PromiseState === 'rejected') {
          Q(Throw(load.PromiseResult!, 'Raw', load.PromiseResult!));
        } else if (load.PromiseState === 'pending') {
          throw new Error('Internal error: .LoadRequestedModules() returned a pending promise');
        }
        Q(module.Link());
        const evaluate = Q(skipDebugger(module.Evaluate()));
        if (evaluate.PromiseState === 'rejected') {
          Q(Throw(evaluate.PromiseResult!, 'Raw', evaluate.PromiseResult!));
        }
      } else {
        Q(realm.evaluateScript(source, { specifier: filename }));
      }
    });
    if (completion instanceof AbruptCompletion) {
      const inspected = inspect(completion);
      process.stderr.write(`${inspected}\n`);
      process.exit(1);
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
        return inspect(o as Value | ValueCompletion);
      }
      return _inspect(o);
    }),
  });
}
