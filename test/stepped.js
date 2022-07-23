'use strict';

const {
  isMainThread, parentPort, workerData, Worker,
} = require('worker_threads');
const fs = require('fs');
// eslint-disable-next-line import/no-extraneous-dependencies
const { codeFrameColumns } = require('@babel/code-frame');

if (isMainThread) {
  const shared = new SharedArrayBuffer(4);
  const shared32 = new Int32Array(shared);
  const source = fs.readFileSync(process.argv[2], 'utf8');
  const worker = new Worker(__filename, {
    workerData: { shared, source },
  });
  process.stdin.on('data', () => {
    const old = Atomics.compareExchange(shared32, 0, 0, 1);
    if (old === 0) {
      Atomics.notify(shared32, 0, 1);
    }
  });
  worker.on('message', (data) => {
    const node = JSON.parse(data);
    const frame = codeFrameColumns(source, node.location, {
      highlightCode: true,
      message: node.type,
    });
    process.stdout.write(`${frame}\n\n\n`);
  });
  worker.on('exit', () => {
    process.exit(0);
  });
} else {
  const {
    Agent,
    setSurroundingAgent,
    ManagedRealm,
    AbruptCompletion,
    inspect,
  } = require('..');

  const shared32 = new Int32Array(workerData.shared);
  setSurroundingAgent(new Agent({
    onNodeEvaluation(node) {
      if (node.type === 'ExpressionStatement') {
        return;
      }
      parentPort.postMessage(JSON.stringify(node));
      Atomics.wait(shared32, 0, 0);
      Atomics.store(shared32, 0, 0);
    },
  }));

  const realm = new ManagedRealm();

  realm.scope(() => {
    const completion = realm.evaluateScript(workerData.source);
    if (completion instanceof AbruptCompletion) {
      process.stdout.write(`${inspect(completion, realm)}\n`);
    }
  });

  process.exit(0);
}
