/* eslint-disable no-console */
import {
  Agent, inspect, ManagedRealm, NormalCompletion, setSurroundingAgent, ThrowCompletion, type Arguments, type PlainEvaluator,
} from '#self';
import { createConsole } from '#self/inspector';

// Agent is the running environment.
const agent = new Agent({
});
// Only one agent can be active at a time.
setSurroundingAgent(agent);

// A Realm is a separate global environment.
// In Web browsers, each iframe has its own Realm and they may interact with each other.
const realm = new ManagedRealm({ resolverCache: new Map() });

// Define console.log
{
  const format = (function* format(args: Arguments): PlainEvaluator<string> {
    const str = [];
    for (const arg of args) {
      str.push(inspect(arg));
    }
    return str.join(' ');
  });
  createConsole(realm, {
    * log(args) {
      process.stdout.write(`${yield* format(args)}\n`);
    },
    * error(args) {
      process.stderr.write(`${yield* format(args)}\n`);
    },
    * debug(args) {
      process.stderr.write(`${yield* format(args)}\n`);
    },
    * default(method, args) {
      process.stdout.write(`[console.${method}] ${yield* format(args)}\n`);
    },
  });
}

// Do not forget to use realm.scope when running code.
realm.scope(() => {
  // Run ECMAScript code in the Realm.
  realm.evaluateScript(`
    console.log('Hello from engine262!');
    console.log('2 + 2 =', 2 + 2);
  `, { specifier: 'example.mts' });

  const result = realm.evaluateScript(`
    throw new Error('This is an example error');
  `, { specifier: 'example.mts' });
  if (result instanceof NormalCompletion) {
    console.log('No Error');
  } else if (result instanceof ThrowCompletion) {
    console.error('Caught error from evaluated script:', inspect(result.Value));
  }
});
