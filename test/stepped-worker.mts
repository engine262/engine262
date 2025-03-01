import { parentPort, workerData } from 'node:worker_threads';
import {
  Agent, setSurroundingAgent, ManagedRealm, AbruptCompletion, inspect,
} from '#self';

const shared32 = new Int32Array(workerData.shared);
setSurroundingAgent(new Agent({
  onNodeEvaluation(node) {
    if (node.type === 'ExpressionStatement') {
      return;
    }
    parentPort!.postMessage(JSON.stringify(node));
    Atomics.wait(shared32, 0, 0);
    Atomics.store(shared32, 0, 0);
  },
}));

const realm = new ManagedRealm();

realm.scope(() => {
  const completion = realm.evaluateScript(workerData.source);
  if (completion instanceof AbruptCompletion) {
    process.stdout.write(`${inspect(completion)}\n`);
  }
});

process.exit(0);
