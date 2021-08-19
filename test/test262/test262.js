'use strict';

try {
  require('@snek/source-map-support/register');
} catch {}

const path = require('path');
const fs = require('fs');
const util = require('util');
const glob = require('glob');

const TEST262 = process.env.TEST262 || path.resolve(__dirname, 'test262');

const readList = (name) => {
  const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
  return source.split('\n').filter((l) => l && !l.startsWith('#'));
};
const readListPaths = (name) => readList(name)
  .flatMap((t) => glob.sync(path.resolve(TEST262, 'test', t)))
  .map((f) => path.relative(TEST262, f));

async function* readdir(dir) {
  for await (const dirent of await fs.promises.opendir(dir)) {
    const p = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readdir(p);
    } else {
      yield p;
    }
  }
}

const disabledFeatures = new Set();
const featureMap = Object.create(null);
readList('features')
  .forEach((f) => {
    if (f.startsWith('-')) {
      disabledFeatures.add(f.slice(1));
    }
    if (f.includes('=')) {
      const [k, v] = f.split('=');
      featureMap[k.trim()] = v.trim();
    }
  });

if (!process.send) {
  // supervisor

  const childProcess = require('child_process');
  const YAML = require('js-yaml');
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
  const RUN_SLOW_TESTS = process.argv.includes('--run-slow-tests');

  const createWorker = () => {
    const c = childProcess.fork(__filename);
    c.on('message', (message) => {
      switch (message.status) {
        case 'PASS':
          pass(message.count);
          break;
        case 'FAIL':
          fail(message.description, message.error);
          break;
        case 'SKIP':
          skip();
          break;
        default:
          throw new RangeError(JSON.stringify(message));
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
  if (RUN_SLOW_TESTS) {
    longRunningWorker = createWorker();
  }

  const slowlist = new Set(readListPaths('slowlist'));
  const skiplist = new Set(readListPaths('skiplist'));
  const isDisabled = (feature) => disabledFeatures.has(feature);

  let workerIndex = 0;
  const handleTest = (test) => {
    total();

    if (test.attrs.features?.some(isDisabled) || skiplist.has(test.file)) {
      skip();
      return;
    }

    if (slowlist.has(test.file)) {
      if (RUN_SLOW_TESTS) {
        longRunningWorker.send(test);
      } else {
        skip();
      }
    } else {
      workers[workerIndex].send(test);
      workerIndex += 1;
      if (workerIndex >= workers.length) {
        workerIndex = 0;
      }
    }
  };

  (async () => {
    for await (const file of readdir(path.join(TEST262, override || 'test'))) {
      if (/annexB|intl402|_FIXTURE/.test(file)) {
        continue;
      }

      const contents = await fs.promises.readFile(file, 'utf8');
      const yamlStart = contents.indexOf('/*---') + 5;
      const yamlEnd = contents.indexOf('---*/', yamlStart);
      const yaml = contents.slice(yamlStart, yamlEnd);
      const attrs = YAML.load(yaml);

      attrs.flags = (attrs.flags || []).reduce((acc, c) => {
        acc[c] = true;
        return acc;
      }, {});
      attrs.includes = attrs.includes || [];

      const test = {
        file: path.relative(TEST262, file),
        attrs,
        contents,
      };

      if (test.attrs.flags.module) {
        handleTest(test);
      } else {
        if (!test.attrs.flags.onlyStrict) {
          handleTest(test);
        }

        if (!test.attrs.flags.noStrict && !test.attrs.flags.raw) {
          test.contents = `'use strict';\n${test.contents}`;
          test.attrs.description += ' (Strict Mode)';
          handleTest(test);
        }
      }
    }

    workers.forEach((w) => {
      w.send('DONE');
    });
    if (RUN_SLOW_TESTS) {
      longRunningWorker.send('DONE');
    }
  })();
} else {
  // worker

  const {
    Agent,
    setSurroundingAgent,
    inspect,

    Value,

    IsCallable,
    IsDataDescriptor,
    Type,

    AbruptCompletion,
    Throw,
  } = require('../..');
  const { createRealm } = require('../../bin/test262_realm');

  const isError = (type, value) => {
    if (Type(value) !== 'Object') {
      return false;
    }
    const proto = value.Prototype;
    if (!proto || Type(proto) !== 'Object') {
      return false;
    }
    const ctorDesc = proto.properties.get(new Value('constructor'));
    if (!ctorDesc || !IsDataDescriptor(ctorDesc)) {
      return false;
    }
    const ctor = ctorDesc.Value;
    if (Type(ctor) !== 'Object' || IsCallable(ctor) !== Value.true) {
      return false;
    }
    const namePropDesc = ctor.properties.get(new Value('name'));
    if (!namePropDesc || !IsDataDescriptor(namePropDesc)) {
      return false;
    }
    const nameProp = namePropDesc.Value;
    return Type(nameProp) === 'String' && nameProp.stringValue() === type;
  };

  const includeCache = {};

  const run = (test) => {
    const features = [];
    if (test.attrs.features) {
      test.attrs.features.forEach((f) => {
        if (featureMap[f]) {
          features.push(featureMap[f]);
        }
      });
    }
    const agent = new Agent({
      features,
    });
    setSurroundingAgent(agent);

    const {
      realm, trackedPromises,
      resolverCache, setPrintHandle,
    } = createRealm({ file: test.file });
    const r = realm.scope(() => {
      test.attrs.includes.unshift('assert.js', 'sta.js');
      if (test.attrs.flags.async) {
        test.attrs.includes.unshift('doneprintHandle.js');
      }

      for (const include of test.attrs.includes) {
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
          return { status: 'FAIL', error: inspect(completion) };
        }
      }

      {
        const completion = realm.evaluateScript(`\
var Test262Error = class Test262Error extends Error {};
Test262Error.thrower = (...args) => {
  throw new Test262Error(...args);
};

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
}`);
        if (completion instanceof AbruptCompletion) {
          return { status: 'FAIL', error: inspect(completion) };
        }
      }

      let asyncResult;
      if (test.attrs.flags.async) {
        setPrintHandle((m) => {
          if (m.stringValue && m.stringValue() === 'Test262:AsyncTestComplete') {
            asyncResult = { status: 'PASS' };
          } else {
            asyncResult = { status: 'FAIL', error: m.stringValue ? m.stringValue() : inspect(m) };
          }
          setPrintHandle(undefined);
        });
      }

      const specifier = path.resolve(TEST262, test.file);

      let completion;
      if (test.attrs.flags.module) {
        completion = realm.createSourceTextModule(specifier, test.contents);
        if (!(completion instanceof AbruptCompletion)) {
          const module = completion;
          resolverCache.set(specifier, module);
          completion = module.Link();
          if (!(completion instanceof AbruptCompletion)) {
            completion = module.Evaluate();
          }
          if (!(completion instanceof AbruptCompletion)) {
            if (completion.PromiseState === 'rejected') {
              completion = Throw(completion.PromiseResult);
            }
          }
        }
      } else {
        completion = realm.evaluateScript(test.contents, { specifier });
      }

      if (completion instanceof AbruptCompletion) {
        if (test.attrs.negative && isError(test.attrs.negative.type, completion.Value)) {
          return { status: 'PASS' };
        } else {
          return { status: 'FAIL', error: inspect(completion) };
        }
      }

      if (test.attrs.flags.async) {
        if (!asyncResult) {
          throw new Error('missing async result');
        }
        return asyncResult;
      }

      if (trackedPromises.length > 0) {
        return { status: 'FAIL', error: inspect(trackedPromises[0]) };
      }

      if (test.attrs.negative) {
        return { status: 'FAIL', error: `Expected ${test.attrs.negative.type} during ${test.attrs.negative.phase}` };
      } else {
        return { status: 'PASS' };
      }
    });

    return r;
  };

  const handleSendError = (e) => {
    if (e) {
      process.exit(1);
    }
  };
  let passChunk = 0;
  process.on('message', (test) => {
    if (test === 'DONE') {
      if (passChunk > 0) {
        process.send({ status: 'PASS', count: passChunk }, handleSendError);
      }
      process.exit(0);
      return;
    }
    const description = `${test.file}\n${test.attrs.description}`;
    try {
      const r = run(test);
      if (r.status === 'PASS') {
        passChunk += 1;
        if (passChunk > 20) {
          process.send({ status: 'PASS', count: passChunk }, handleSendError);
          passChunk = 0;
        }
      } else {
        process.send({ description, ...r }, handleSendError);
      }
    } catch (e) {
      process.send({ description, status: 'FAIL', error: util.inspect(e) }, handleSendError);
    }
  });
}
