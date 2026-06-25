/* eslint-disable no-console */
import { NodeWebsocketInspector } from './inspector.mts';
import { fileSystemModuleLoader } from './module.mts';
import {
  Agent, composeModuleLoaders, CreateBuiltinFunction, createBuiltinModuleLoader, EnsureCompletion, inspect, ManagedRealm, ModuleCache, ModuleEnvironmentRecord, PerformPromiseThen, setSurroundingAgent, surroundingAgent, SyntheticModuleRecord, ThrowCompletion, ToString, X, Value, ValueOfNormalCompletion, type Arguments, type PlainEvaluator,
  type ValueCompletion,
  CreateNonEnumerableDataPropertyOrThrow,
  Throw,
  IsCallable,
  type Job,
  GetActiveScriptOrModule,
  Call,
  NumberValue,
} from '#self';
import { createConsole } from '#self/inspector';

// Agent is the running environment.
const agent = new Agent({
  uncaughtExceptionTrackers: new Set([(error) => {
    console.error('Uncaught exception:', inspect(error));
  }]),
  hostHooks: {
    HostLoadImportedModule: composeModuleLoaders([
      fileSystemModuleLoader,
      createBuiltinModuleLoader({
        builtinModules: new Map([[{ Specifier: 'builtin', Attributes: [] }, (realm) => {
          const env = new ModuleEnvironmentRecord(null);
          const module = new SyntheticModuleRecord({
            Environment: env,
            ExportNames: [Value('foo')],
            EvaluationSteps() {
              // Create built-in function
              const foo = CreateBuiltinFunction.from(function* foo(value = Value.undefined) {
                console.log('Native function foo called with argument:', inspect(yield* ToString(value)));
              }, 'foo');
              X(module.SetSyntheticExport(Value('foo'), foo));
              console.log('Builtin module evaluated');
            },
            HostDefined: {},
            Namespace: undefined,
            ModuleSource: undefined,
            Realm: realm,
          });
          return module;
        }]]),
      }),
    ]),
  },
});
// Only one agent can be active at a time.
setSurroundingAgent(agent);

// A Realm is a separate global environment.
// In Web browsers, each iframe has its own Realm and they may interact with each other.
const realm = new ManagedRealm({ resolverCache: new ModuleCache(), name: 'My Realm', specifier: process.cwd() });

// Define console.log
{
  const format = (function* format(args: Arguments): PlainEvaluator<string> {
    const str = [];
    for (const arg of args.values()) {
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

// Create a new inspector (devtools console)
const inspector = await NodeWebsocketInspector.new();

function printResult(value: ValueCompletion) {
  const pop = realm.pushTopContext();
  if (value instanceof ThrowCompletion) {
    console.error('Error: ', inspect(value.Value));
  } else {
    console.log('Result:', inspect(ValueOfNormalCompletion(value)));
  }
  pop?.();
}

// Run a script and skip debugger infra (get the result synchronously).
{
  console.log('--------- evaluateScriptSkipDebugger ---------');
  const result = EnsureCompletion(realm.evaluateScriptSkipDebugger(`
    console.log('Hello from engine262!');
    console.log('2 + 2 =', 2 + 2);
  `, { specifier: 'example.mjs' }));
  printResult(result);
}

// Run the jobQueue (Promise/other tasks).
{
  console.log('--------- jobQueue ---------');
  const result = EnsureCompletion(realm.evaluateScriptSkipDebugger(`
    Promise.resolve('Hello from Promise!').then(console.log);
  `, { specifier: 'example2.mjs' }));

  // define an async built-in function
  const pop = realm.pushTopContext();
  const sleep = CreateBuiltinFunction.from(function* sleep(ms = Value.undefined, callback = Value.undefined) {
    if (!(ms instanceof NumberValue)) return Throw.TypeError('First argument must be a number');
    if (!IsCallable(callback)) return Throw.TypeError('Second argument must be a function');
    const job: Job = {
      queueName: 'setTimeout',
      callerRealm: surroundingAgent.currentRealmRecord,
      callerScriptOrModule: GetActiveScriptOrModule(),
      job: function* setTimeoutResolve() {
        return yield* Call(callback, Value.undefined, []);
      },
    };
    surroundingAgent.eventLoop.enqueueAsync('timers', job, (enqueue) => {
      setTimeout(enqueue, ms.value);
    });
    return Value.undefined;
  }, 'sleep');
  X(CreateNonEnumerableDataPropertyOrThrow(realm.GlobalObject, Value('sleep'), sleep));
  pop?.();

  const result2 = realm.evaluateScriptSkipDebugger(`
    sleep(500, () => console.log('Hello from sleep!'));
  `, { specifier: 'example3.mjs' });
  printResult(result);
  printResult(result2);
}

inspector.attachAgent(surroundingAgent, [realm]);
// Run a script with debugger support
// the evaluation may be sync or async.
console.log('--------- evaluateScript ---------');
realm.evaluateScript(`
  function f() { debugger; return 1; }
  f();
`, { specifier: 'vm://1' }, (result) => {
  printResult(result);
});
// resume from the debugger;
surroundingAgent.resumeEvaluate();

// Run a module
console.log('--------- evaluateModule ---------');
realm.evaluateModule(`
  import { foo } from "builtin";
  foo({ toString() { return "X" } });
`, undefined, (result) => {
  if (result instanceof ThrowCompletion) {
    console.error('Module evaluate error: ', inspect(result.Value));
  } else {
    PerformPromiseThen(
      ValueOfNormalCompletion(result),
      CreateBuiltinFunction.from(() => {
        console.log('Module evaluated successfully');
      }),
      CreateBuiltinFunction.from((error = Value.undefined) => {
        console.error('Module evaluation error:', inspect(error));
      }),
    );
  }
});
inspector.stop();
