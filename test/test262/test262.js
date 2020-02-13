'use strict';

/* eslint-disable no-inner-declarations */

require('@snek/source-map-support/register');
const path = require('path');
const fs = require('fs');

const override = process.argv[2];

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
  } = require('../base.js');

  const NUM_WORKERS = process.env.NUM_WORKERS
    ? Number.parseInt(process.env.NUM_WORKERS, 10)
    : Math.round(CPU_COUNT * 0.75);

  const workers = Array.from({ length: NUM_WORKERS }, (_, i) => {
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
      workers[i] = undefined;
      if (workers.every((w) => w === undefined)) {
        process.exit();
      }
    });
    return c;
  });

  const readList = (name) => {
    const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
    return source.split('\n').filter((l) => l && !l.startsWith('//'));
  };
  const skiplist = readList('skiplist')
    .flatMap((t) => glob.sync(path.resolve(__dirname, 'test262', 'test', t)))
    .map((f) => path.relative(path.resolve(__dirname, 'test262'), f));
  const features = readList('features');

  const stream = new TestStream(path.resolve(__dirname, 'test262'), {
    paths: [override || 'test'],
    omitRuntime: true,
  });

  let workerIndex = 0;
  stream.on('data', (test) => {
    total();

    if (/annexB|intl402/.test(test.file)
      || (test.attrs.features && test.attrs.features.some((feature) => features.includes(feature)))
      || /\b(reg ?exp?)\b/i.test(test.attrs.description) || /\b(reg ?exp?)\b/.test(test.contents)
      || test.attrs.includes.includes('nativeFunctionMatcher.js')
      || skiplist.includes(test.file)) {
      skip();
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
} else {
  // worker

  const {
    Agent, Realm, Value,
    FEATURES, Abstract,
    Object: APIObject,
    Throw,
    AbruptCompletion,
    inspect,
  } = require('../..');

  const agent = new Agent({
    features: FEATURES.map((f) => f.name),
  });
  agent.enter();

  const createRealm = (test) => {
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
            throw new RangeError('promiseRejectionTracker', operation);
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
      } else {
        const formatted = args.map((a, i) => {
          if (i === 0 && Abstract.Type(a) === 'String') {
            return a.stringValue();
          }
          return inspect(a, realm);
        }).join(' ');
        console.log(test.file, formatted); // eslint-disable-line no-console
      }
      return Value.undefined;
    }));

    Abstract.CreateDataProperty($262, new Value(realm, 'global'), realm.global);
    Abstract.CreateDataProperty($262, new Value(realm, 'createRealm'), new Value(realm, () => createRealm(test)));
    Abstract.CreateDataProperty($262, new Value(realm, 'evalScript'), new Value(realm, ([sourceText]) => realm.evaluateScript(sourceText.stringValue())));
    Abstract.CreateDataProperty($262, new Value(realm, 'detachArrayBuffer'), new Value(realm, ([arrayBuffer = Value.undefined]) => Abstract.DetachArrayBuffer(arrayBuffer)));

    Abstract.CreateDataProperty($262, new Value(realm, 'gc'), new Value(realm, () => Value.undefined));

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

  const run = (test) => {
    agent.agent.jobQueue = [];

    const { file, contents, attrs } = test;
    const specifier = path.resolve(__dirname, 'test262', file);
    const $262 = createRealm({ file });
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
            resolve({ status: 'FAIL', error: m.stringValue ? m.stringValue() : inspect(m, $262.realm) });
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

    $262.evalScript(`
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
      const description = `${test.file}\n${test.attrs.description}`;
      p = p
        .then(() => run(test))
        .catch((e) => {
          process.send({ description, status: 'FAIL', error: e.stack || e });
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
