import type { Protocol } from 'devtools-protocol';
import { InspectorContext } from './context.mts';
import * as impl from './methods.mts';
import type { DebuggerContext, DebuggerPreference, DevtoolEvents } from './types.mts';
import { getParsedEvent } from './internal-utils.mts';
import { Agent, type Arguments, type ManagedRealm } from '#self';

const ignoreNamespaces = ['Network'];
const ignoreMethods: string[] = [];

export type { DebuggerPreference } from './types.mts';
export { createConsole } from './utils.mts';

interface AgentRecord {
  readonly agent: Agent;
  onDetach(): void;
}
export abstract class Inspector {
  #context = new InspectorContext(this);

  #agents: AgentRecord[] = [];

  attachAgent(agent: Agent, priorRealms: ManagedRealm[]) {
    const oldOnDebugger = agent.hostDefinedOptions.onDebugger;
    agent.hostDefinedOptions.onDebugger = () => {
      oldOnDebugger?.();
      this.sendEvent['Debugger.paused']({
        reason: 'debugCommand',
        callFrames: this.#context.getDebuggerCallFrame(),
      });
    };

    const oldOnRealmCreated = agent.hostDefinedOptions.onRealmCreated;
    agent.hostDefinedOptions.onRealmCreated = (realm) => {
      oldOnRealmCreated?.(realm);
      this.#context.attachRealm(realm, agent);
    };

    const oldOnScriptParsed = agent.hostDefinedOptions.onScriptParsed;
    agent.hostDefinedOptions.onScriptParsed = (script, id) => {
      oldOnScriptParsed?.(script, id);
      const realmId = this.#context.getRealm(script.Realm as ManagedRealm)?.descriptor.id;
      if (realmId === undefined) {
        return;
      }
      this.sendEvent['Debugger.scriptParsed'](getParsedEvent(script, id, realmId));
    };
    this.#agents.push({
      agent,
      onDetach: () => {
        agent.hostDefinedOptions.onDebugger = oldOnDebugger;
        agent.hostDefinedOptions.onRealmCreated = oldOnRealmCreated;
        agent.hostDefinedOptions.onScriptParsed = oldOnScriptParsed;
        this.#agents = this.#agents.filter((x) => x.agent !== agent);
      },
    });
    priorRealms.forEach((realm) => {
      this.#context.attachRealm(realm, agent);
    });
  }

  detachAgent(agent: Agent) {
    const record = this.#agents.find((x) => x.agent === agent);
    record?.onDetach();
    this.#context.detachAgent(agent);
  }

  protected abstract send(data: object): void;

  readonly preference: DebuggerPreference = { previewDebug: false };

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
      resolve(f(params, this.#debugContext));
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
    const context = this.#context.getRealm(realm);
    if (!context) {
      return;
    }
    this.sendEvent['Runtime.consoleAPICalled']({
      type,
      args: args.map((x) => this.#context.toRemoteObject(x, { })),
      executionContextId: context.descriptor.id,
      timestamp: Date.now(),
    });
  }

  #debugContext: DebuggerContext = {
    sendEvent: this.sendEvent,
    preference: this.preference,
    context: this.#context,
    onDebuggerAttached: () => {
      this.#context.realms.forEach((realm) => {
        if (realm) {
          this.sendEvent['Runtime.executionContextCreated']({
            context: realm.descriptor,
          });
        }
      });
    },
  };
}
