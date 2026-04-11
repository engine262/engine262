#!/usr/bin/env node

import { start } from 'node:repl';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { format as _format, inspect as _inspect, parseArgs } from 'node:util';
// let's try if the following message on old node causes test failure on test262.fyi
// "ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time"
// import packageJson from '../../package.json' with { type: 'json' };
import { createRequire } from 'node:module';
import { createConsole } from '../inspector/utils.mts';
import type { NodeWebsocketInspector } from './inspector.mts';
import { loadImportedModule } from './module.mts';
import {
  setSurroundingAgent, FEATURES, inspect, Value, Completion, AbruptCompletion,
  type Arguments,
  evalQ,
  Agent,
  ManagedRealm,
  type ValueCompletion,
  createTest262Intrinsics,
  surroundingAgent,
  ThrowCompletion,
  ValueOfNormalCompletion,
  ScriptEvaluation,
  type PlainEvaluator,
  importBundledTest262Harness,
  boostTest262Harness,
  ModuleCache,
  NormalCompletion,
  PerformPromiseThen,
  CreateBuiltinFunction,
  runJobQueue,
} from '#self';

const packageJson = createRequire(import.meta.url)('../../package.json');
const help = `
engine262 v${packageJson.version}

Usage:

    engine262 [options]
    engine262 [options] [input file]
    engine262 [input file]

Options:

    -h, --help         Show help (this screen)
    -m, --module       Evaluate contents of input-file as a module.
    -e, --eval         Evaluate the given string.
    --features=...     A comma separated list of features.
    --features=all     Enable all features.
    --list-features    List available features.
    --no-test262       Do not expose $ and $262 for test262.
    --[no-]inspect     Do [not] attach an inspector.
    --no-preview       Do not enable preview in the inspector.
    --test262-harness  Import test262 harness files.
`;

const argv = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  allowNegative: true,
  strict: true,
  options: {
    'help': { type: 'boolean', short: 'h' },
    'eval': { type: 'string', short: 'e' },
    'module': { type: 'boolean', short: 'm' },
    'features': { type: 'string' },
    'list-features': { type: 'boolean' },
    'inspect': { type: 'boolean' },
    'test262': { type: 'boolean', default: true },
    'test262-harness': { type: 'boolean' },
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

const agent = new Agent({
  features,
  supportedImportAttributes: ['type'],
  loadImportedModule,
});
setSurroundingAgent(agent);

const realm = new ManagedRealm({ resolverCache: new ModuleCache(), name: 'repl', specifier: process.cwd() });
// Define console.log
{
  const format = (function* format(args: Arguments): PlainEvaluator<string> {
    const str = [];
    for (const arg of args.values()) {
      // TODO: inspect should return a PlainEvaluator so debugger can hook in.
      str.push(inspect(arg));
    }
    return str.join(' ');
  });
  createConsole(realm, {
    * log(args) {
      process.stdout.write(`${yield* format(args)}\n`);
    },
    * error(args) {
      process.stderr.write(`${yield* format(args)}\n`);
    },
    * debug(args) {
      process.stderr.write(`${yield* format(args)}\n`);
    },
  });
}

if (argv.values.test262) {
  // eslint-disable-next-line no-console
  createTest262Intrinsics(realm, argv.values.test262, console.log);
}

if (argv.values['test262-harness']) {
  importBundledTest262Harness(realm);
  boostTest262Harness(realm);
}

async function setupInspector(mode: 'file' | 'eval' | 'pipe' | 'repl') {
  const inspectArg = argv.values.inspect;
  if (mode !== 'repl' && !inspectArg) return undefined;
  if (inspectArg === false) return undefined;

  let has_ws = false;
  try {
    await import('ws');
    has_ws = true;
  } catch {
    if (inspectArg) {
      process.stderr.write('--inspect requires the "ws" package to be installed.\n');
      process.exit(1);
    }
  }
  if (!has_ws) return undefined;
  const { NodeWebsocketInspector } = await import('./inspector.mts');
  const inspector = await NodeWebsocketInspector.new();
  inspector.attachAgent(surroundingAgent, [realm]);
  inspector.preference.previewDebug = argv.values['preview-debug'] || false;
  process.stdout.write([
    `Inspector attached at 127.0.0.1:${inspector.port}${inspectArg ? '' : ', use --no-inspect to disable'}`,
    'Paste this URL into Chromium to open DevTools:',
    `    ${inspector.devtoolsFrontendUrl}`,
    '\n',
  ].join('\n'));
  return inspector;
}

function oneShotEval(inspector: NodeWebsocketInspector | undefined, source: string, filename: string) {
  realm.scope(() => {
    const onErrorCallback = CreateBuiltinFunction.from((result = Value.undefined) => {
      quit(ThrowCompletion(result));
    });
    const completion = evalQ((Q) => {
      if (argv.values.module || filename.endsWith('.mjs')) {
        const module = Q(realm.compileModule(source, { specifier: filename }));
        realm.HostDefined.resolverCache?.set(filename, 'js', module);

        const loadRequestedModules = module.LoadRequestedModules();
        PerformPromiseThen(loadRequestedModules, CreateBuiltinFunction.from(function* runModule() {
          const link = module.Link();
          if (link instanceof ThrowCompletion) return link;
          PerformPromiseThen(yield* module.Evaluate(), CreateBuiltinFunction.from(() => { }), onErrorCallback);
          return Value.undefined;
        }), onErrorCallback);
        runJobQueue();
      } else {
        Q(realm.evaluateScript(source, { specifier: filename }));
      }
    });
    quit(completion);
  });

  inspector?.stop();

  function quit(completion: ThrowCompletion<Value> | NormalCompletion<void>) {
    if (completion instanceof AbruptCompletion) {
      const inspected = inspect(completion);
      process.stderr.write(`${inspected}\n`);
      process.exit(1);
    }
  }
}

if (argv.positionals[0]) {
  const inspector = await setupInspector('file');
  const source = readFileSync(argv.positionals[0], 'utf8');
  oneShotEval(inspector, source, resolve(argv.positionals[0]));
} else if (!process.stdin.isTTY) {
  const inspector = await setupInspector('pipe');
  process.stdin.setEncoding('utf8');
  let source = '';
  process.stdin.on('data', (data) => {
    source += data;
  });
  process.stdin.once('end', () => {
    oneShotEval(inspector, source, process.cwd());
  });
} else if (argv.values.eval) {
  const inspector = await setupInspector('eval');
  oneShotEval(inspector, argv.values.eval, process.cwd());
} else {
  const inspector = await setupInspector('repl');
  process.stdout.write(`Welcome to ${packageJson.name} v${String(packageJson.version).replace('0.0.1-', '')} Please report bugs to ${packageJson.bugs.url}
Type ".help" for more information.
`);
  const server = start({
    prompt: '> ',
    eval: (cmd, _context, _filename, callback) => {
      try {
        const script = realm.compileScript(cmd, {});
        if (script instanceof ThrowCompletion) {
          callback(null, script);
          return;
        }
        let c;
        surroundingAgent.evaluate(ScriptEvaluation(ValueOfNormalCompletion(script)), (completion) => {
          c = completion;
          callback(null, completion);
        });
        if (!c) {
          surroundingAgent.resumeEvaluate();
        }
      } catch (e) {
        callback(e as Error, null);
      }
    },
    preview: false,
    writer: (o) => realm.scope(() => {
      if (o instanceof Value || o instanceof Completion) {
        return inspect(o as Value | ValueCompletion);
      }
      return _inspect(o);
    }),
  });

  server.on('exit', () => inspector?.stop());
}
