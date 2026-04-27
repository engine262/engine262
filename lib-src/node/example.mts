/* eslint-disable no-console */
import { NodeWebsocketInspector } from './inspector.mts';
import { fileSystemModuleLoader } from './module.mts';
import {
  Agent, composeModuleLoaders, CreateBuiltinFunction, createBuiltinModuleLoader, EnsureCompletion, inspect, ManagedRealm, ModuleCache, ModuleEnvironmentRecord, PerformPromiseThen, setSurroundingAgent, surroundingAgent, SyntheticModuleRecord, ThrowCompletion, ToString, unwrapCompletion, Value, ValueOfNormalCompletion, type Arguments, type PlainEvaluator,
  type ValueCompletion,
} from '#self';
import { createConsole } from '#self/inspector';

// Agent is the running environment.
const agent = new Agent({
  hostHooks: {
    HostLoadImportedModule: composeModuleLoaders([
      fileSystemModuleLoader,
      createBuiltinModuleLoader({
        builtinModules: new Map([[{ Specifier: 'builtin', Attributes: [] }, (realm) => {
          const env = new ModuleEnvironmentRecord(Value.null);
          const module = new SyntheticModuleRecord({
            Environment: env,
            ExportNames: [Value('foo')],
            EvaluationSteps() {
              // Create built-in function
              const foo = CreateBuiltinFunction.from(function* foo(value = Value.undefined) {
                console.log('Native function foo called with argument:', inspect(yield* ToString(value)));
              }, 'foo');
              unwrapCompletion(module.SetSyntheticExport(Value('foo'), foo));
              console.log('Builtin module evaluated');
            },
            HostDefined: {},
            Namespace: undefined,
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
  realm.scope(() => {
    if (value instanceof ThrowCompletion) {
      console.error('Error: ', inspect(value.Value));
    } else {
      console.log('Result:', inspect(ValueOfNormalCompletion(value)));
    }
  });
}

// Run a script and skip debugger infra (get the result synchronously).
{
  console.log('--------- evaluateScriptSkipDebugger ---------');
  const result = EnsureCompletion(realm.evaluateScriptSkipDebugger(`
    console.log('Hello from engine262!');
    console.log('2 + 2 =', 2 + 2);
  `, { specifier: 'example.mts' }));
  printResult(result);
}

inspector.attachAgent(surroundingAgent, [realm]);
// Run a script with debugger support
{
  let completion;
  // the evaluation may be sync or async.
  console.log('--------- evaluateScript ---------');
  realm.evaluateScript(`
    function f() { debugger; return 1; }
    f();
  `, { specifier: 'vm://1' }, (result) => {
    completion = result;
    printResult(result);
  });
  // the evaluation will not start by default
  if (!completion) {
    // start the evaluation
    surroundingAgent.resumeEvaluate();
    // resume from the debugger;
    surroundingAgent.resumeEvaluate();
  }
}

// Run a module
{
  let completion;
  console.log('--------- evaluateModule ---------');
  realm.evaluateModule(`
    import { foo } from "builtin";
    foo({ toString() { return "X" } });
  `, undefined, (result) => {
    completion = result;
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
  if (!completion) {
    agent.resumeEvaluate();
  }
}
inspector.stop();
