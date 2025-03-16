import type Protocol from 'devtools-protocol';
import { InspectorContext } from './context.mts';
import * as impl from './methods.mts';
import type { DebuggerContext, DebuggerPreference, DevtoolEvents } from './types.mts';
import type { Arguments, ManagedRealm } from '#self';

const ignoreNamespaces = ['Network'];
const ignoreMethods: string[] = [];

export type { DebuggerPreference } from './types.mts';
export { createConsole, createInternals } from './utils.mts';

export abstract class Inspector {
  protected abstract send(data: object): void;

  readonly preference: DebuggerPreference = { preview: false, previewDebug: false };

  #contexts: InspectorContext[] = [];

  attachRealm(realm: ManagedRealm) {
    this.#contexts.push(new InspectorContext(realm));
    realm.HostDefined.attachingInspector = this;
  }

  protected onMessage(id: unknown, methodArg: string, params: unknown): void {
    if (ignoreMethods.includes(methodArg)) {
      return;
    }
    const [namespace, method] = methodArg.split('.');
    if (ignoreNamespaces.includes(namespace)) {
      return;
    }
    if (!(namespace in impl)) {
      // eslint-disable-next-line no-console
      console.error(`Unknown namespace requested: ${namespace}`);
      return;
    }
    const ns = (impl as Record<string, object>)[namespace];
    if (!(method in ns)) {
      // eslint-disable-next-line no-console
      console.error(`Unknown method requested: ${namespace}.${method}`);
      return;
    }

    const f = (ns as Record<string, (args: unknown, context: DebuggerContext) => unknown>)[method];
    new Promise((resolve) => {
      resolve(f(params, this.#context));
    }).then((result = {}) => {
      this.send({ id, result });
    });
  }

  sendEvent: DevtoolEvents = Object.create(new Proxy({}, {
    get: (_, key: string) => {
      const f = (params: Record<string, unknown>) => {
        this.send({ method: key, params });
      };
      Object.defineProperty(this.sendEvent, key, { value: f });
      return f;
    },
  }));

  console(realm: ManagedRealm, type: Protocol.Protocol.Runtime.ConsoleAPICalledEventType, args: Arguments) {
    const context = this.#contexts.findIndex((c) => c.realm === realm);
    this.sendEvent['Runtime.consoleAPICalled']({
      type,
      // @ts-expect-error
      args: args.map((x) => this.#contexts[context].toRemoteObject(x, { generatePreview: true })),
      executionContextId: context,
      timestamp: Date.now(),
    });
  }

  #context: DebuggerContext = {
    sendEvent: this.sendEvent,
    preference: this.preference,
    getContext: (id = 0) => this.#contexts.at(id)!,
  };
}
