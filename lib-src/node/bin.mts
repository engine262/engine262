#!/usr/bin/env node

import { start } from 'node:repl';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  format as _format, inspect as _inspect, parseArgs, styleText,
} from 'node:util';
// let's try if the following message on old node causes test failure on test262.fyi
// "ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time"
// import packageJson from '../../package.json' with { type: 'json' };
import { createRequire } from 'node:module';
import { createConsole } from '../inspector/utils.mts';
import type { NodeWebsocketInspector } from './inspector.mts';
import { fileSystemModuleLoader } from './module.mts';
import {
  setSurroundingAgent, FEATURES, inspect, Value,
  type Arguments,
  Agent,
  ManagedRealm,
  createTest262Intrinsics,
  surroundingAgent,
  ThrowCompletion,
  ValueOfNormalCompletion,
  ScriptEvaluation,
  type PlainEvaluator,
  importBundledTest262Harness,
  boostTest262Harness,
  ModuleCache,
  PerformPromiseThen,
  CreateBuiltinFunction,
  runJobQueue,
  composeModuleLoaders,
  Descriptor,
  isFunctionObject,
  Throw,
  ToNumber,
  R,
  Call,
  GetActiveScriptOrModule,
  type PlainCompletion,
  NormalCompletion,
  type PromiseObject,
} from '#self';

const packageJson = createRequire(import.meta.url)('../../package.json');
const help = () => `
engine262 v${packageJson.version}

Usage:

    engine262 [options]
    engine262 [options] [input file]
    engine262 [input file]

Options:
  ${((str) => {
    const options = [
      ['-h, --help', 'Show help'],
      ['-m, --module', 'Evaluate contents of input-file as a module.'],
      ['-e, --eval', 'Evaluate the given string. (can be used with --module)'],
      ['--features=...', 'A comma separated list of features.'],
      ['-a, --features=all', 'Enable all features.'],
      ['--no-test262', 'Do not expose $ and $262 for test262.'],
      ['--[no-]inspect', 'Do [not] attach an inspector.'],
      ['--no-preview', 'Do not enable preview in the inspector.'],
      ['-t, --test262-harness', 'Import test262 harness files.'],
    ];
    const maxOptionLength = options.reduce((max, [flag]) => Math.max(max, flag.length), 0);
    options.forEach(([flag, description]) => {
      str += `    ${styleText('green', flag.padEnd(maxOptionLength))}  ${description}\n`;
    });
    return str;
  })('\n')}
Features:
  ${((str) => {
    const supportColor = styleText('red', 'test') !== 'test';
    function link(text: string, url: string) {
      if (!supportColor || !url) return text;
      const OSC = '\u001B]';
      const BEL = '\u0007';
      return `${OSC}8;;${url}${BEL}${text}${OSC}8;;${BEL}`;
    }

    let maxFlagLength = 0;
    for (const f of FEATURES) {
      if (f.flag.length > maxFlagLength) maxFlagLength = f.flag.length;
    }
    FEATURES.forEach((f) => {
      str += `    ${styleText('redBright', f.flag.padEnd(maxFlagLength))}  ${link(f.name, f.url)}\n`;
    });
    return str;
  })('\n')}
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
    'features-all': { type: 'boolean', short: 'a' },
    'inspect': { type: 'boolean' },
    'test262': { type: 'boolean', default: true },
    'test262-harness': { type: 'boolean', short: 't' },
    // hidden options
    'preview-debug': { type: 'boolean' },
  },
});

if (argv.values.help) {
  process.stdout.write(help());
  process.exit(0);
}

let features: string[];
if (argv.values.features === 'all' || argv.values['features-all']) {
  features = FEATURES.map((f) => f.flag);
} else if (argv.values.features) {
  features = argv.values.features.split(',');
} else {
  features = [];
}

// exit code 1 if at least 1 unhandled rejection in the end.
let unhandledExceptionCount = 0;
process.on('exit', () => {
  if (unhandledExceptionCount > 0) process.exitCode = 1;
});
const unhandledRejectionPendingLog = new Set<PromiseObject>();

const agent = new Agent({
  features,
  supportedImportAttributes: ['type'],
  hostHooks: {
    HostLoadImportedModule: composeModuleLoaders([fileSystemModuleLoader]),
    HostPromiseRejectionTrackers: new Set([(promise, operation) => {
      if (operation === 'reject') {
        unhandledExceptionCount += 1;
        unhandledRejectionPendingLog.add(promise);
        const realm = surroundingAgent.currentRealmRecord as ManagedRealm;
        setTimeout(() => {
          if (!unhandledRejectionPendingLog.has(promise)) return;
          unhandledRejectionPendingLog.delete(promise);
          realm.scope(() => {
            const err = inspect(promise.PromiseResult!);
            process.stderr.write(`Unhandled promise rejection: ${err}\n`);
          });
        }, 10);
      } else if (operation === 'handle') {
        unhandledExceptionCount -= 1;
        unhandledRejectionPendingLog.delete(promise);
      }
    }]),
  },
  uncaughtExceptionTrackers: new Set([(error) => {
    unhandledExceptionCount += 1;
    const err = inspect(error);
    process.stderr.write(`Uncaught exception: ${err}\n`);
  }]),
});
setSurroundingAgent(agent);

const realm = new ManagedRealm({ resolverCache: new ModuleCache(), name: 'repl', specifier: process.cwd() });
realm.scope(() => {
  realm.GlobalObject.properties.set('setTimeout', Descriptor({
    Value: CreateBuiltinFunction.from(function* timeout(f = Value.undefined, time = Value.undefined) {
      if (!isFunctionObject(f)) return Throw.TypeError('setTimeout($1, ...) should be a function', f);
      const delay = yield* ToNumber(time);
      if (delay instanceof ThrowCompletion) return delay;
      const delayTime = R(ValueOfNormalCompletion(delay));

      const job = {
        queueName: 'setTimeout resolve',
        job: () => Call(f, Value.undefined, []),
        callerRealm: surroundingAgent.runningExecutionContext.Realm,
        callerScriptOrModule: GetActiveScriptOrModule(),
      };
      setTimeout(() => {
        surroundingAgent.jobQueue.push(job);
        runJobQueue();
      }, delayTime);
      return Value.undefined;
    }),
  }));
});

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
    if (argv.values.module || filename.endsWith('.mjs')) {
      realm.evaluateModule(source, filename, (promise) => {
        if (promise instanceof ThrowCompletion) {
          handleException(promise);
          return;
        }
        PerformPromiseThen(ValueOfNormalCompletion(promise), Value.null, CreateBuiltinFunction.from((error = Value.undefined) => {
          handleException(ThrowCompletion(error));
        }));
        runJobQueue();
      });
    } else {
      let completion;
      realm.evaluateScript(source, { specifier: filename }, (c) => {
        completion = c;
        handleException(completion);
      });
      if (!completion) surroundingAgent.resumeEvaluate();
      runJobQueue();
    }
  });

  inspector?.stop();

  function handleException(completion: PlainCompletion<void | Value>) {
    if (completion instanceof ThrowCompletion) {
      const inspected = inspect(completion);
      process.stderr.write(`${inspected}\n`);
      unhandledExceptionCount += 1;
    }
  }
}

if (argv.positionals[0]) {
  const inspector = await setupInspector('file');
  const source = readFileSync(argv.positionals[0], 'utf8');
  oneShotEval(inspector, source, resolve(argv.positionals[0]));
} else if (argv.values.eval) {
  const inspector = await setupInspector('eval');
  oneShotEval(inspector, argv.values.eval, '<eval>');
} else if (!process.stdin.isTTY) {
  const inspector = await setupInspector('pipe');
  process.stdin.setEncoding('utf8');
  let source = '';
  process.stdin.on('data', (data) => {
    source += data;
  });
  process.stdin.once('end', () => {
    oneShotEval(inspector, source, '<pipe>');
  });
} else {
  const inspector = await setupInspector('repl');
  process.stdout.write(`Welcome to ${packageJson.name} v${String(packageJson.version).replace('0.0.1-', '')} Please report bugs to ${packageJson.bugs.url}\nType ".help" for more information.\n`);
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
      if (o instanceof ThrowCompletion) o = o.Value;
      if (o instanceof NormalCompletion && o.Value instanceof Value) o = o.Value;
      if (o instanceof Value) return o === Value.undefined ? '' : inspect(o);
      return _inspect(o);
    }),
  });

  server.on('exit', () => inspector?.stop());
}
