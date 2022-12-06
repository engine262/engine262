'use strict';

const path = require('path');
const fs = require('fs');
const util = require('util');
const globby = require('globby');
const snekparse = require('../../bin/snekparse');

const TEST262 = process.env.TEST262 || path.resolve(__dirname, 'test262');
const TEST262_TESTS = path.join(TEST262, 'test');

const readList = (name) => {
  const source = fs.readFileSync(path.resolve(__dirname, name), 'utf8');
  return source.split('\n').filter((l) => l && !l.startsWith('#'));
};
const readListPaths = (name) => readList(name)
  .flatMap((t) => globby.sync(path.resolve(TEST262, 'test', t), { absolute: true }))
  .map((f) => path.relative(TEST262_TESTS, f));

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


  // Read everything in argv after node and this file.
  const ARGV = snekparse(process.argv.slice(2));
  if (ARGV.h || ARGV.help) {
    // eslint-disable-next-line prefer-template
    const usage = `
      Usage: node ${path.relative(process.cwd(), __filename)} [--run-slow-tests] [TEST-PATTERN]...
      Run test262 tests against engine262.

      TEST-PATTERN supports glob syntax, and is interpreted relative to
      the test262 "test" subdirectory or (if that fails for any pattern)
      relative to the working directory. If no patterns are specified,
      all tests are run.

      Environment variables:
        TEST262
          The test262 directory, which contains the "test" subdirectory.
          If empty, it defaults to the "test262" sibling of this file.
        NUM_WORKERS
          The count of child processes that should be created to run tests.
          If empty, it defaults to a reasonable value based on CPU count.

      Files:
        features
          Specifies handling of test262 features, notably which ones to skip.
        skiplist
          Includes patterns of test files to skip.
        slowlist
          Includes patterns of test files to skip in the absence of
          --run-slow-tests.
    `.slice(1);
    const indent = usage.match(/^\s*/)[0];
    process.stdout.write(
      `${usage.trimEnd().split('\n').map((line) => line.replace(indent, '')).join('\n')}\n`,
    );
    process.exit(64);
  }

  const childProcess = require('child_process');
  const YAML = require('js-yaml');
  const {
    pass,
    fail,
    skip,
    total,
    CPU_COUNT,
  } = require('../base');

  const NUM_WORKERS = process.env.NUM_WORKERS
    ? Number.parseInt(process.env.NUM_WORKERS, 10)
    : Math.round(CPU_COUNT * 0.75);
  const RUN_SLOW_TESTS = ARGV['run-slow-tests'];

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
    let files = [];
    if (ARGV.length === 0) {
      files = readdir(TEST262_TESTS);
    } else {
      // Interpret pattern arguments relative to the tests directory,
      // falling back on the working directory if there are no matches
      // or a non-glob pattern fails to match.
      for (const arg of ARGV) {
        const matches = globby.sync(arg, { cwd: TEST262_TESTS, absolute: true });
        if (matches.length === 0 && !globby.hasMagic(arg)) {
          files = [];
          break;
        }
        files.push(...matches);
      }
      if (files.length === 0) {
        const cwd = process.cwd();
        for (const arg of ARGV) {
          const matches = globby.sync(arg, { cwd, absolute: true });
          if (matches.length === 0 && !globby.hasMagic(arg)) {
            fs.accessSync(path.resolve(cwd, arg), fs.constants.R_OK);
          }
          files.push(...matches);
        }
      }
      files = new Set(files);
    }

    for await (const file of files) {
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
        file: path.relative(TEST262_TESTS, file),
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
    JSStringValue,
    ObjectValue,

    AbruptCompletion,
    Throw,
  } = require('../..');
  const { createRealm } = require('../../bin/test262_realm');

  const isError = (type, value) => {
    if (!(value instanceof ObjectValue)) {
      return false;
    }
    const proto = value.Prototype;
    if (!proto || !(proto instanceof ObjectValue)) {
      return false;
    }
    const ctorDesc = proto.properties.get(new Value('constructor'));
    if (!ctorDesc || !IsDataDescriptor(ctorDesc)) {
      return false;
    }
    const ctor = ctorDesc.Value;
    if (!(ctor instanceof ObjectValue) || IsCallable(ctor) !== Value.true) {
      return false;
    }
    const namePropDesc = ctor.properties.get(new Value('name'));
    if (!namePropDesc || !IsDataDescriptor(namePropDesc)) {
      return false;
    }
    const nameProp = namePropDesc.Value;
    return nameProp instanceof JSStringValue && nameProp.stringValue() === type;
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
          const p = path.resolve(TEST262, `harness/${include}`);
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

      const specifier = path.resolve(TEST262_TESTS, test.file);

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
