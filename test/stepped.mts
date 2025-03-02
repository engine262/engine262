import { Worker } from 'node:worker_threads';
import fs from 'node:fs';
import path from 'node:path';
import { codeFrameColumns } from '@babel/code-frame';

const shared = new SharedArrayBuffer(4);
const shared32 = new Int32Array(shared);
const source = fs.readFileSync(process.argv[2], 'utf8');
const worker = new Worker(path.resolve(import.meta.dirname, './stepped-worker.mts'), {
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
