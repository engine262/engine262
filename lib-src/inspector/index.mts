import type { Protocol } from 'devtools-protocol';
import { InspectorContext } from './context.mts';
import * as impl from './methods.mts';
import type { DebuggerContext, DebuggerPreference, DevtoolEvents } from './types.mts';
import { surroundingAgent, type Arguments, type ManagedRealm } from '#self';

const ignoreNamespaces = ['Network'];
const ignoreMethods: string[] = [];

export type { DebuggerPreference } from './types.mts';
export { createConsole, createInternals } from './utils.mts';

export abstract class Inspector {
  protected abstract send(data: object): void;

  readonly preference: DebuggerPreference = { preview: false, previewDebug: false };

  #contexts: [InspectorContext, Protocol.Runtime.ExecutionContextDescription][] = [];

  attachRealm(realm: ManagedRealm, name = 'engine262') {
    const id = this.#contexts.length;
    const desc: Protocol.Runtime.ExecutionContextDescription = {
      id,
      origin: 'vm://realm',
      name,
      uniqueId: '',
    };
    this.#contexts.push([new InspectorContext(realm), desc]);
    realm.HostDefined.attachingInspector = this;

    const oldOnDebugger = surroundingAgent.hostDefinedOptions.onDebugger;
    surroundingAgent.hostDefinedOptions.onDebugger = () => {
      this.sendEvent['Debugger.paused']({
        reason: 'debugCommand',
        callFrames: this.#context.getContext().getDebuggerCallFrame(),
      });
      oldOnDebugger?.();
    };

    this.#context.sendEvent['Runtime.executionContextCreated']({ context: desc });
  }

  #onDebuggerAttached() {
    for (const [, context] of this.#contexts) {
      this.sendEvent['Runtime.executionContextCreated']({ context });
    }
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

  console(realm: ManagedRealm, type: Protocol.Runtime.ConsoleAPICalledEventType, args: Arguments) {
    const context = this.#contexts.findIndex((c) => c[0].realm === realm);
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
    getContext: (id = 0) => this.#contexts.at(id)![0],
    onDebuggerAttached: this.#onDebuggerAttached.bind(this),
  };
}
