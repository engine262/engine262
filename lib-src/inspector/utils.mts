import type Protocol from 'devtools-protocol';
import { Inspector } from './index.mts';
import {
  CreateBuiltinFunction, CreateDataProperty, DefinePropertyOrThrow, Descriptor, NormalCompletion, OrdinaryObjectCreate, surroundingAgent, ThrowCompletion, skipDebugger, Value, type Arguments, type ManagedRealm,
} from '#self';

const consoleMethods = [
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
type ConsoleMethod = typeof consoleMethods[number];
export function createConsole(realm: ManagedRealm, defaultBehaviour: Partial<Record<ConsoleMethod, (args: Arguments) => void | NormalCompletion<void>>>) {
  realm.scope(() => {
    const console = OrdinaryObjectCreate(realm.Intrinsics['%Object.prototype%']);
    skipDebugger(DefinePropertyOrThrow(
      realm.GlobalObject,
      Value('console'),
      Descriptor({
        Configurable: Value.true,
        Enumerable: Value.false,
        Writable: Value.true,
        Value: console,
      }),
    ));
    consoleMethods.forEach((method) => {
      const f = CreateBuiltinFunction(
        (args) => {
          if (surroundingAgent.debugger_isPreviewing) {
            return Value.undefined;
          }
          if (defaultBehaviour[method]) {
            const completion = (defaultBehaviour[method](args));
            if (completion instanceof ThrowCompletion) {
              return completion;
            }
          }
          if (realm.HostDefined.attachingInspector instanceof Inspector) {
            realm.HostDefined.attachingInspector.console(realm, method as Protocol.Protocol.Runtime.ConsoleAPICalledEventType, args);
          }
          return Value.undefined;
        },
        1,
        Value(method),
        [],
      );
      skipDebugger(CreateDataProperty(console, Value(method), f));
    });
  });
}
