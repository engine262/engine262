'use strict';

/* eslint-disable no-inner-declarations */

require('@snek/source-map-support/register');
const path = require('path');
const fs = require('fs');
const util = require('util');

if (!process.send) {
  // supervisor

  const childProcess = require('child_process');
  const TestStream = require('test262-stream');
  const glob = require('glob');

  const {
    pass,
    fail,
    skip,
    total,
    CPU_COUNT,
  } = require('../base');

  const override = process.argv.find((e, i) => i > 1 && !e.startsWith('-'));
  const NUM_WORKERS = process.env.NUM_WORKERS
    ? Number.parseInt(process.env.NUM_WORKERS, 10)
    : Math.round(CPU_COUNT * 0.75);
  const RUN_LONG = process.argv.includes('--run-long');

  const createWorker = () => {
    const c = childProcess.fork(__filename);
    c.on('message', ({ description, status, error }) => {
      switch (status) {
        case 'PASS':
          pass();
          break;
        case 'FAIL':
          fail(description, error);
          break;
        case 'SKIP':
          skip();
          break;
        default:
          break;
      }
    });
    c.on('exit', (code) => {
      if (code !== 0) {
        process.exit(1);
      }
    });
    return c;
  };

  const workers = Array.from({ length: NUM_WORKERS }, () => createWorker());
  let longRunningWorker;
  if (RUN_LONG) {
    longRunningWorker = createWorker();
  }

  const readList = (name) => {
    const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
    return source.split('\n').filter((l) => l && !l.startsWith('//'));
  };
  const readListPaths = (name) => readList(name)
    .flatMap((t) => glob.sync(path.resolve(__dirname, 'test262', 'test', t)))
    .map((f) => path.relative(path.resolve(__dirname, 'test262'), f));

  const features = readList('features');
  const longlist = readListPaths('longlist');
  const skiplist = readListPaths('skiplist');

  const stream = new TestStream(path.resolve(__dirname, 'test262'), {
    paths: [override || 'test'],
    omitRuntime: true,
  });

  let workerIndex = 0;
  stream.on('data', (test) => {
    total();

    if (/annexB|intl402/.test(test.file)
      || (test.attrs.features && test.attrs.features.some((feature) => features.includes(feature)))
      || test.attrs.includes.includes('nativeFunctionMatcher.js')
      || skiplist.includes(test.file)) {
      skip();
      return;
    }

    if (longlist.includes(test.file)) {
      if (RUN_LONG) {
        longRunningWorker.send(test, () => 0);
      } else {
        skip();
      }
    } else {
      workers[workerIndex].send(test, () => 0);
      workerIndex += 1;
      if (workerIndex >= workers.length) {
        workerIndex = 0;
      }
    }
  });

  stream.on('end', () => {
    workers.forEach((w) => {
      w.send('DONE');
      if (RUN_LONG) {
        longRunningWorker.send('DONE');
      }
    });
  });
} else {
  // worker

  const {
    Agent, Value,
    FEATURES, Abstract,
    Throw,
    AbruptCompletion,
    inspect,
  } = require('../..');
  const { createRealm } = require('../../bin/test262_realm');

  const agent = new Agent({
    features: FEATURES.map((f) => f.name),
  });
  agent.enter();

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

  const run = (test) => {
    const { file, contents, attrs } = test;
    const specifier = path.resolve(__dirname, 'test262', file);
    const {
      realm, trackedPromises,
      resolverCache, setPrintHandle,
    } = createRealm({ file });
    let asyncPromise;
    let timeout;
    if (attrs.flags.async) {
      asyncPromise = new Promise((resolve) => {
        timeout = setTimeout(() => {
          const failure = [...trackedPromises][0];
          if (failure) {
            resolve({ status: 'FAIL', error: inspect(failure.PromiseResult, realm) });
          } else {
            resolve({ status: 'FAIL', error: 'test timed out' });
          }
        }, 2500);
        setPrintHandle((m) => {
          if (m.stringValue && m.stringValue() === 'Test262:AsyncTestComplete') {
            resolve({ status: 'PASS' });
          } else {
            resolve({ status: 'FAIL', error: m.stringValue ? m.stringValue() : inspect(m, realm) });
          }
          setPrintHandle(undefined);
        });
      });
    }

    attrs.includes.unshift('assert.js', 'sta.js');
    if (attrs.flags.async) {
      attrs.includes.unshift('doneprintHandle.js');
    }

    for (const include of attrs.includes) {
      if (includeCache[include] === undefined) {
        const p = path.resolve(__dirname, `./test262/harness/${include}`);
        includeCache[include] = {
          source: fs.readFileSync(p, 'utf8'),
          specifier: p,
        };
      }
      const entry = includeCache[include];
      const completion = realm.evaluateScript(entry.source, { specifier: entry.specifier });
      if (completion instanceof AbruptCompletion) {
        clearTimeout(timeout);
        return { status: 'FAIL', error: inspect(completion, realm) };
      }
    }

    {
      const completion = realm.evaluateScript(`
var Test262Error = class Test262Error extends Error {};

function $DONE(error) {
  if (error) {
    if (typeof error === 'object' && error !== null && 'stack' in error) {
      __consolePrintHandle__('Test262:AsyncTestFailure:' + error.stack);
    } else {
      __consolePrintHandle__('Test262:AsyncTestFailure:Test262Error: ' + error);
    }
  } else {
    __consolePrintHandle__('Test262:AsyncTestComplete');
  }
}`.trim());
      if (completion instanceof AbruptCompletion) {
        clearTimeout(timeout);
        return { status: 'FAIL', error: inspect(completion, realm) };
      }
    }

    let completion;
    if (attrs.flags.module) {
      completion = realm.createSourceTextModule(specifier, contents);
      if (!(completion instanceof AbruptCompletion)) {
        const module = completion;
        resolverCache.set(specifier, module);
        completion = module.Link();
        if (!(completion instanceof AbruptCompletion)) {
          completion = module.Evaluate();
          if (!(completion instanceof AbruptCompletion)) {
            if (completion.PromiseState === 'rejected') {
              completion = Throw(realm, completion.PromiseResult);
            }
          }
        }
      }
    } else {
      completion = realm.evaluateScript(contents, { specifier });
    }

    if (completion instanceof AbruptCompletion) {
      clearTimeout(timeout);
      if (attrs.negative && isError(realm, attrs.negative.type, completion.Value)) {
        return { status: 'PASS' };
      } else {
        return { status: 'FAIL', error: inspect(completion, realm) };
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
      const description = `${test.file}\n${test.attrs.description}`;
      p = p
        .then(() => run(test))
        .catch((e) => {
          process.send({ description, status: 'FAIL', error: util.inspect(e) });
          process.exit(1);
        })
        .then((r) => {
          process.send({ description, ...r }, (e) => {
            if (e) {
              process.exit(1);
            }
          });
        });
    }
  });
}
