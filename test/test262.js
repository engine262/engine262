'use strict';

require('@snek/source-map-support/register');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const TestStream = require('test262-stream');
const minimatch = require('minimatch');

let engine262;
try {
  engine262 = require('..');
} catch (e) {
  require('v8').setFlagsFromString('--harmony-do-expressions');
  engine262 = require('..');
}
const {
  Object: APIObject,
  AbruptCompletion,
  Abstract,
  inspect,
  Realm,
  Value,
  initializeAgent,
} = engine262;

const override = process.argv[2];

let passed = 0;
let failed = 0;
let skipped = 0;
let total = 0;

const ansi = {
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  reset: '\u001b[0m',
};

const readList = (name) => {
  const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
  return source.split('\n').filter((l) => l && !l.startsWith('//'));
};
const skiplist = readList('skiplist').map((t) => `test/${t}`);
const features = readList('features');
const whitelist = readList('whitelist').map((t) => `test/${t}`);

const start = Date.now();

const pad = (n, l, c = '0') => n.toString().padStart(l, c);
function printProgress(test, log) {
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const min = Math.floor(elapsed / 60);
  const sec = elapsed % 60;

  const time = `${pad(min, 2)}:${pad(sec, 2)}`;

  const completed = `\u001b[34m:${pad(total, 5, ' ')}${ansi.reset}`;

  const p = `${ansi.green}+${pad(passed, 5, ' ')}${ansi.reset}`;

  const f = `${ansi.red}-${pad(failed, 5, ' ')}${ansi.reset}`;

  const s = `${ansi.yellow}»${pad(skipped, 5, ' ')}${ansi.reset}`;

  const line = `[${time}|${completed}|${p}|${f}|${s}]: ${test}`;

  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);

  if (line.length >= process.stdout.columns) {
    process.stdout.write(`${line.slice(0, -10)}...`);
  } else {
    process.stdout.write(line);
  }

  if (log) {
    console.log(''); // eslint-disable-line no-console
    console.log(...log); // eslint-disable-line no-console
  }
}

function createRealm() {
  const realm = new Realm({
    resolveImportedModule(referencingModule, specifier) {
      const resolved = path.resolve(path.dirname(referencingModule.specifier), specifier);
      if (resolved === $262.moduleEntry.specifier) {
        return $262.moduleEntry;
      }
      const source = fs.readFileSync(resolved, 'utf8');
      return realm.createSourceTextModule(resolved, source);
    },
  });

  const $262 = new APIObject(realm);
  realm.global.$262 = $262;

  Abstract.CreateDataProperty(realm.global, new Value(realm, 'print'), new Value(realm, (args) => {
    if ($262.handlePrint) {
      $262.handlePrint(...args);
    }
    return Value.undefined;
  }));

  Abstract.CreateDataProperty($262, new Value(realm, 'global'), realm.global);
  Abstract.CreateDataProperty($262, new Value(realm, 'createRealm'), new Value(realm, () => createRealm()));
  Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'),
    new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));
  Abstract.CreateDataProperty($262, new Value(realm, 'detachArrayBuffer'), new Value(realm, ([arrayBuffer]) => Abstract.DetachArrayBuffer(arrayBuffer)));

  Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);

  $262.realm = realm;
  $262.evalScript = (sourceText) => realm.evaluateScript(sourceText);

  return $262;
}

const PASS = Symbol('PASS');
const FAIL = Symbol('FAIL');
const SKIP = Symbol('SKIP');

async function run({ file, contents, attrs }) {
  if (!override) {
    if (!whitelist.find((t) => minimatch(file, t))
        || (attrs.features && !attrs.features.every((feature) => features.includes(feature)))
        || /\b(reg ?exp?)\b/i.test(attrs.description) || /\b(reg ?exp?)\b/.test(contents)
        || attrs.includes.includes('nativeFunctionMatcher.js')
        || skiplist.find((t) => minimatch(file, t))) {
      return { status: SKIP };
    }
  }

  const $262 = createRealm();
  let asyncPromise;
  let timeout;
  if (attrs.flags.async) {
    asyncPromise = new Promise((resolve, reject) => {
      const tracked = new Set();
      timeout = setTimeout(() => {
        const failure = [...tracked][0];
        if (failure) {
          resolve({ status: FAIL, error: inspect(failure.PromiseResult, $262.realm) });
        } else {
          reject(new Error('timeout'));
        }
      }, 2500);
      agentOpt.promiseRejectionTracker = (promise, operation) => {
        if (operation === 'reject') {
          tracked.add(promise);
        } else if (operation === 'handle') {
          tracked.remove(promise);
        }
      };
      $262.handlePrint = (m) => {
        if (m === new Value($262.realm, 'Test262:AsyncTestComplete')) {
          resolve({ status: PASS });
        } else {
          resolve({ status: FAIL, error: inspect(m, $262.realm) });
        }
        $262.handlePrint = undefined;
      };
    });
    asyncPromise.finally(() => {
      agentOpt.promiseRejectionTracker = undefined;
    });
  }

  let completion;
  if (attrs.flags.module) {
    completion = $262.realm.createSourceTextModule(file, contents);
    if (!(completion instanceof AbruptCompletion)) {
      const module = completion;
      $262.moduleEntry = module;
      completion = module.Instantiate();
      if (!(completion instanceof AbruptCompletion)) {
        completion = module.Evaluate();
      }
    }
  } else {
    completion = $262.evalScript(contents);
  }

  $262.moduleEntry = undefined;

  if (completion instanceof AbruptCompletion) {
    clearTimeout(timeout);
    if (attrs.negative) {
      return { status: PASS };
    } else {
      return { status: FAIL, error: inspect(completion, $262.realm) };
    }
  }

  if (asyncPromise !== undefined) {
    return asyncPromise;
  }

  clearTimeout(timeout);

  return { status: PASS };
}

const agentOpt = {
  promiseRejectionTracker: undefined,
};
initializeAgent(agentOpt);

const stream = new TestStream(path.resolve(__dirname, 'test262'), {
  paths: [override || 'test'],
});

(async () => {
  for await (const test of stream) {
    if (!override && test.file.includes('annexB')) {
      continue;
    }

    total += 1;
    printProgress(test.file);
    const { status, error } = await run(test);
    switch (status) {
      case PASS:
        passed += 1;
        break;
      case FAIL:
        failed += 1;
        printProgress(test.file, [error, '\n']);
        break;
      case SKIP:
        skipped += 1;
        break;
      default:
        break;
    }
  }

  printProgress('Done');
})().catch((e) => {
  console.error(''); // eslint-disable-line no-console
  console.error(e); // eslint-disable-line no-console
  process.exit();
});

process.on('exit', () => {
  if (passed + failed + skipped < total || failed > 0) {
    process.exitCode = 1;
  }
});
process.on('SIGINT', () => process.exit());
