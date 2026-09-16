import type Protocol from 'devtools-protocol';
import type { Inspector } from './index.mts';
import {
  CreateBuiltinFunction, CreateDataProperty, DefinePropertyOrThrow, Descriptor, OrdinaryObjectCreate, surroundingAgent, ThrowCompletion, Value, type Arguments, type ManagedRealm,
  type PlainEvaluator,
  type PlainCompletion,
  isEvaluator,
  X,
} from '#self';

export const consoleMethods = [
  'log',
  'debug',
  'info',
  'error',
  'warning',
  'dir',
  'dirxml',
  'table',
  'trace',
  'clear',
  'startGroup',
  'startGroupCollapsed',
  'endGroup',
  'assert',
  'profile',
  'profileEnd',
  'count',
  'timeEnd',
] as const;
export type ConsoleMethod = typeof consoleMethods[number];
export function createConsole(
  realm: ManagedRealm,
  defaultBehaviour: Partial<Record<ConsoleMethod, (args: Arguments) => void | PlainCompletion<void> | PlainEvaluator<void>>> & { default?: (method: ConsoleMethod, args: Arguments) => void | PlainCompletion<void> | PlainEvaluator<void> },
) {
  const pop = realm.pushTopContext();
  const console = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
  X(DefinePropertyOrThrow(
    realm.GlobalObject,
    'console',
    Descriptor({
      Configurable: true,
      Enumerable: false,
      Writable: true,
      Value: console,
    }),
  ));
  consoleMethods.forEach((method) => {
    const f = CreateBuiltinFunction(
      function* Console(args): PlainEvaluator<Value> {
        if (surroundingAgent.debugger_isPreviewing) {
          return Value.undefined;
        }

        let completion;
        if (defaultBehaviour[method]) {
          completion = defaultBehaviour[method](args);
        } else if (defaultBehaviour.default) {
          completion = defaultBehaviour.default(method, args);
        }

        if (completion) {
          if (isEvaluator(completion)) {
            completion = yield* completion;
          }
          // Do not use Q(host) here. A host may return something invalid like ReturnCompletion.
          if (completion instanceof ThrowCompletion) {
            return completion;
          }
        }
        if (realm.HostDefined.attachingInspector) {
          (realm.HostDefined.attachingInspector as Inspector).console(realm, method as Protocol.Protocol.Runtime.ConsoleAPICalledEventType, args);
        }
        return Value.undefined;
      },
      1,
      Value(method),
      [],
    );
    X(CreateDataProperty(console, Value(method), f));
  });
  pop?.();
}
