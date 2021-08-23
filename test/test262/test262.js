'use strict';

try {
  require('@snek/source-map-support/register');
} catch {}

const path = require('path');
const fs = require('fs');
const util = require('util');
const glob = require('glob');

const TEST262 = process.env.TEST262 || path.resolve(__dirname, 'test262');

// How many PASS results can each worker accumulate before reporting them
// back to the supervisor. Reduces the amount of IPC.
const CHUNK_SIZE = 20;

// How many tasks can each worker have in-flight. No more tasks will be
// sent to a worker until it reports back some results.
const MAX_PENDING = 10 + CHUNK_SIZE; // must be at least CHUNK_SIZE

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

class EventSemaphore {
  constructor() {
    this._promise = undefined;
    this._resolve = undefined;
  }
  // Get a promise that will resolve with the next signal()
  reset() {
    if (!this._resolve) {
      this._promise = new Promise((res) => {
        this._resolve = res;
      });
    }
    return this._promise;
  }
  // Wake up whoever's awaiting the promise from reset()
  signal() {
    if (this._resolve) {
      this._resolve();
      this._resolve = undefined;
    }
  }
}

if (!process.send) {
  supervisorProcess();
} else {
  workerProcess();
}

async function supervisorProcess() {
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

  const longRunningQueue = [];
  const testQueue = [];
  const totalQueued = () => longRunningQueue.length + testQueue.length;
  const canQueueMore = new EventSemaphore();
  let doneQueueing = false;

  const createWorker = () => {
    const c = childProcess.fork(__filename);
    let doneSendingWork = false;
    let numLongRunning = 0;
    let numPending = 0;
    const sendBatchFrom = (queue) => {
      const limit = Math.min(
        Math.ceil((0.75 * queue.length) / NUM_WORKERS),
        MAX_PENDING - numPending,
      );
      for (let i = 0; i < limit && numLongRunning < 1; i += 1) {
        const test = queue.shift();
        numLongRunning += test.slow ? 1 : 0;
        numPending += 1;
        c.send(test);
      }
      if (totalQueued() < CHUNK_SIZE * NUM_WORKERS) {
        canQueueMore.signal();
      }
    };
    const checkWorkComplete = () => {
      if (!doneQueueing
        || doneSendingWork
        || numPending >= CHUNK_SIZE
        || numLongRunning > 0) {
        return;
      }
      if (longRunningQueue.length === 0 && testQueue.length === 0) {
        doneSendingWork = true;
        c.send('DONE');
      } else {
        // When we get to the last remaining tests, we send fewer than
        // CHUNK_SIZE in order to more evenly distribute the remaining
        // ones. The PING message tells the worker to report any PASSes
        // it collected, so that we can send more work.
        c.send('PING');
      }
    };
    c.on('message', (message) => {
      switch (message.status) {
        case 'PASS':
          numPending -= message.count;
          pass(message.count);
          break;
        case 'FAIL':
          numPending -= 1;
          fail(`${message.file}\n${message.description}`, message.error);
          break;
        case 'SKIP':
          numPending -= 1;
          skip();
          break;
        default:
          throw new RangeError(JSON.stringify(message));
      }
      // count may be zero if this is response to PING
      if (message.slow && message.count !== 0) {
        // every slow test is reported individually
        numLongRunning -= 1;
      }
      if (!doneSendingWork && numPending < MAX_PENDING) {
        sendBatchFrom(testQueue);
        sendBatchFrom(longRunningQueue);
        checkWorkComplete(); // make sure worker is not stuck
      }
    });
    c.on('exit', (code) => {
      if (code !== 0) {
        process.exit(1);
      }
    });
    return {
      process: c,
      checkWorkComplete,
      send(test) {
        if (test.slow) {
          longRunningQueue.push(test);
          sendBatchFrom(longRunningQueue);
        } else {
          testQueue.push(test);
          sendBatchFrom(testQueue);
        }
      },
    };
  };

  const workers = Array.from({ length: NUM_WORKERS }, () => createWorker());

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

    if (test.slow && !RUN_SLOW_TESTS) {
      skip();
    } else {
      workers[workerIndex].send(test);
      workerIndex += 1;
      if (workerIndex >= workers.length) {
        workerIndex = 0;
      }
    }
  };

  async function* findTestFiles() {
    const deferred = [];

    for await (const file of readdir(path.join(TEST262, override || 'test'))) {
      if (/annexB|intl402|_FIXTURE/.test(file)) {
        continue;
      }

      const fileRelative = path.relative(TEST262, file);
      const item = {
        file,
        fileRelative,
        slow: slowlist.has(fileRelative),
      };

      if (item.slow) {
        deferred.push(item);
      } else {
        yield item;
      }
    }

    process.stdout.write(`\n\nFound ${deferred.length} slow test sources\n\n`);
    yield* deferred;
  }

  async function scheduleTests() {
    for await (const { file, fileRelative, slow } of findTestFiles()) {
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
        file: fileRelative,
        slow,
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

      if (totalQueued() > MAX_PENDING * NUM_WORKERS) {
        await canQueueMore.reset();
      }
    }

    // make sure no worker is stuck
    doneQueueing = true;
    workers.forEach((w) => w.checkWorkComplete());
  }

  scheduleTests();
}

async function workerProcess() {
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
  const flushAtLeast = (threshold, slow) => {
    if (passChunk >= threshold || slow) {
      const result = { status: 'PASS', count: passChunk, slow };
      process.send(result, handleSendError);
      passChunk = 0;
    }
  };

  process.on('message', (test) => {
    if (test === 'PING') {
      // force sending a message even with zero PASSes accumulated
      flushAtLeast(0, false);
      return;
    }
    if (test === 'DONE') {
      flushAtLeast(1, false);
      process.disconnect();
      return;
    }
    if (test.slow) {
      // flush accumulated PASSes before starting this slow test
      flushAtLeast(1, false);
    }
    let result;
    try {
      result = run(test);
    } catch (e) {
      result = { status: 'FAIL', error: util.inspect(e) };
    }
    if (result.status === 'PASS') {
      passChunk += 1;
      flushAtLeast(CHUNK_SIZE, test.slow);
    } else {
      result.description = test.attrs.description;
      result.file = test.file;
      result.slow = test.slow;
      process.send(result, handleSendError);
    }
  });
}
