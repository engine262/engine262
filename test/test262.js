'use strict';

/* eslint-disable no-inner-declarations */

require('@snek/source-map-support/register');
const path = require('path');
const fs = require('fs');

const CI = !!process.env.CONTINUOUS_INTEGRATION;
const override = process.argv[2];

const ANSI = CI ? {
  reset: '',
  red: '',
  green: '',
  yellow: '',
  blue: '',
} : {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
};

process.on('unhandledRejection', (reason) => {
  require('fs').writeSync(0, `\n${require('util').inspect(reason)}\n`);
  process.exit(1);
});

if (!process.send) {
  // supervisor

  const os = require('os');
  const childProcess = require('child_process');
  const readline = require('readline');
  const TestStream = require('test262-stream');
  const minimatch = require('minimatch');

  const NUM_WORKERS = process.env.NUM_WORKERS
    ? Number.parseInt(process.env.NUM_WORKERS, 10)
    : Math.round(os.cpus().length * 0.75);

  let skipped = 0;
  let passed = 0;
  let failed = 0;
  let total = 0;

  const start = Date.now();
  const handledPerSecLast5 = [];
  const pad = (n, l, c = '0') => n.toString().padStart(l, c);
  const average = (array) => (array.reduce((a, b) => a + b, 0) / array.length) || 0;
  const printStatusLine = () => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;

    const time = `${pad(min, 2)}:${pad(sec, 2)}`;
    const completed = `${ANSI.blue}:${pad(total, 5, ' ')}${ANSI.reset}`;
    const p = `${ANSI.green}+${pad(passed, 5, ' ')}${ANSI.reset}`;
    const f = `${ANSI.red}-${pad(failed, 5, ' ')}${ANSI.reset}`;
    const s = `${ANSI.yellow}»${pad(skipped, 5, ' ')}${ANSI.reset}`;

    const line = `[${time}|${completed}|${p}|${f}|${s}] (${average(handledPerSecLast5).toFixed(2)}/s)`;

    if (!CI) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
    process.stdout.write(`${line}${CI ? '\n' : ''}`);
  };

  let handledPerSecCounter = 0;
  const workers = Array.from({ length: NUM_WORKERS }, (_, i) => {
    const c = childProcess.fork(__filename);
    c.on('message', ({ file, status, error }) => {
      handledPerSecCounter += 1;
      switch (status) {
        case 'PASS':
          passed += 1;
          break;
        case 'FAIL':
          failed += 1;
          process.stderr.write(`\nFAILURE! ${file}\n${error}\n`);
          break;
        case 'SKIP':
          skipped += 1;
          break;
        default:
          break;
      }
    });
    c.on('exit', (code) => {
      if (code !== 0) {
        printStatusLine();
        process.exit(1);
      }
      workers[i] = undefined;
      if (workers.every((w) => w === undefined)) {
        printStatusLine();
        process.exit(0);
      }
    });
    return c;
  });

  const readList = (name) => {
    const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
    return source.split('\n').filter((l) => l && !l.startsWith('//'));
  };
  const skiplist = readList('skiplist').map((t) => `test/${t}`);
  const features = readList('features');

  const stream = new TestStream(path.resolve(__dirname, 'test262'), {
    paths: [override || 'test'],
    omitRuntime: true,
  });

  let workerIndex = 0;
  stream.on('data', (test) => {
    total += 1;

    if (/annexB|intl402/.test(test.file)
      || (test.attrs.features && test.attrs.features.some((feature) => features.includes(feature)))
      || /\b(reg ?exp?)\b/i.test(test.attrs.description) || /\b(reg ?exp?)\b/.test(test.contents)
      || test.attrs.includes.includes('nativeFunctionMatcher.js')
      || skiplist.find((t) => minimatch(test.file, t))) {
      skipped += 1;
      return;
    }

    workers[workerIndex].send(test, () => 0);
    workerIndex += 1;
    if (workerIndex >= workers.length) {
      workerIndex = 0;
    }
  });

  stream.on('end', () => {
    workers.forEach((w) => {
      w.send('DONE');
    });
  });

  setInterval(() => {
    handledPerSecLast5.unshift(handledPerSecCounter);
    handledPerSecCounter = 0;
    if (handledPerSecLast5.length > 5) {
      handledPerSecLast5.length = 5;
    }
  }, 1000).unref();

  printStatusLine();
  setInterval(() => {
    printStatusLine();
  }, CI ? 5000 : 500).unref();
} else {
  // worker

  const {
    Agent, Realm, Value,
    FEATURES, Abstract,
    Object: APIObject,
    Throw,
    AbruptCompletion,
    inspect,
  } = require('..');

  const agent = new Agent({
    features: FEATURES.map((f) => f.name),
  });
  agent.enter();

  const createRealm = () => {
    const resolverCache = new Map();
    const trackedPromises = new Set();
    const realm = new Realm({
      promiseRejectionTracker(promise, operation) {
        switch (operation) {
          case 'reject':
            trackedPromises.add(promise);
            break;
          case 'handle':
            trackedPromises.delete(promise);
            break;
          default:
            break;
        }
      },
      resolveImportedModule(referencingScriptOrModule, specifier) {
        try {
          const base = path.dirname(referencingScriptOrModule.specifier);
          const resolved = path.resolve(base, specifier);
          if (resolverCache.has(resolved)) {
            return resolverCache.get(resolved);
          }
          const source = fs.readFileSync(resolved, 'utf8');
          const m = realm.createSourceTextModule(resolved, source);
          resolverCache.set(resolved, m);
          return m;
        } catch (e) {
          return Throw(realm, e.name, e.message);
        }
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
    Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'), new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));
    Abstract.CreateDataProperty($262, new Value(realm, 'detachArrayBuffer'), new Value(realm, ([arrayBuffer = Value.undefined]) => Abstract.DetachArrayBuffer(arrayBuffer)));

    Abstract.CreateDataProperty(realm.global, new Value(realm, '$262'), $262);

    $262.realm = realm;
    $262.trackedPromises = trackedPromises;
    $262.evalScript = (...args) => realm.evaluateScript(...args);
    $262.resolverCache = resolverCache;

    return $262;
  };

  const isError = (realm, type, value) => {
    if (Abstract.Type(value) !== 'Object') {
      return false;
    }
    const proto = value.Prototype;
    if (!proto || Abstract.Type(proto) !== 'Object') {
      return false;
    }
    const ctorDesc = proto.properties.get(new Value(realm, 'constructor'));
    if (!ctorDesc || !Abstract.IsDataDescriptor(ctorDesc)) {
      return false;
    }
    const ctor = ctorDesc.Value;
    if (Abstract.Type(ctor) !== 'Object' || Abstract.IsCallable(ctor) !== Value.true) {
      return false;
    }
    const namePropDesc = ctor.properties.get(new Value(realm, 'name'));
    if (!namePropDesc || !Abstract.IsDataDescriptor(namePropDesc)) {
      return false;
    }
    const nameProp = namePropDesc.Value;
    return Abstract.Type(nameProp) === 'String' && nameProp.stringValue() === type;
  };

  const includeCache = {};

  const run = ({ file, contents, attrs }) => {
    const specifier = path.resolve(__dirname, 'test262', file);
    const $262 = createRealm();
    let asyncPromise;
    let timeout;
    if (attrs.flags.async) {
      asyncPromise = new Promise((resolve, reject) => {
        timeout = setTimeout(() => {
          const failure = [...$262.trackedPromises][0];
          if (failure) {
            resolve({ status: 'FAIL', error: inspect(failure.PromiseResult, $262.realm) });
          } else {
            reject(new Error('timeout'));
          }
        }, 2500);
        $262.handlePrint = (m) => {
          if (m.stringValue && m.stringValue() === 'Test262:AsyncTestComplete') {
            resolve({ status: 'PASS' });
          } else {
            resolve({ status: 'FAIL', error: inspect(m, $262.realm) });
          }
          $262.handlePrint = undefined;
        };
      });
    }

    attrs.includes.unshift('assert.js', 'sta.js');
    if (attrs.flags.async) {
      attrs.includes.unshift('doneprintHandle.js');
    }
    attrs.includes.forEach((include) => {
      const p = path.resolve(__dirname, `./test262/harness/${include}`);
      const source = includeCache[include] || fs.readFileSync(p, 'utf8');
      $262.evalScript(source, { specifier: p });
    });
    let completion;
    if (attrs.flags.module) {
      completion = $262.realm.createSourceTextModule(specifier, contents);
      if (!(completion instanceof AbruptCompletion)) {
        const module = completion;
        $262.resolverCache.set(specifier, module);
        completion = module.Link();
        if (!(completion instanceof AbruptCompletion)) {
          completion = module.Evaluate();
          if (!(completion instanceof AbruptCompletion)) {
            if (completion.PromiseState === 'rejected') {
              completion = Throw($262.realm, completion.PromiseResult);
            }
          }
        }
      }
    } else {
      completion = $262.evalScript(contents, { specifier });
    }

    if (completion instanceof AbruptCompletion) {
      clearTimeout(timeout);
      if (attrs.negative && isError($262.realm, attrs.negative.type, completion.Value)) {
        return { status: 'PASS' };
      } else {
        return { status: 'FAIL', error: inspect(completion, $262.realm) };
      }
    }

    if (asyncPromise !== undefined) {
      return asyncPromise;
    }

    clearTimeout(timeout);

    if (attrs.negative) {
      return { status: 'FAIL', error: `Expected ${attrs.negative.type} during ${attrs.negative.phase}` };
    } else {
      return { status: 'PASS' };
    }
  };

  let p = Promise.resolve();
  process.on('message', (test) => {
    if (test === 'DONE') {
      p = p.then(() => process.exit(0));
    } else {
      p = p
        .then(() => run(test))
        .catch((e) => {
          process.send({ file: test.file, status: 'FAIL', error: e.stack || e });
          process.exit(1);
        })
        .then((r) => process.send({ file: test.file, ...r }));
    }
  });
}
