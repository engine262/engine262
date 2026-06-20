import type { Protocol } from 'devtools-protocol';
import { InspectorContext } from './context.mts';
import * as impl from './methods.mts';
import type { DebuggerContext, DebuggerPreference, DevtoolEvents } from './types.mts';
import { getParsedEvent } from './internal-utils.mts';
import type {
  Agent, Arguments, HostPromiseRejectionTracker, ManagedRealm, Realm, Value,
} from '#self';

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

  #unhandledExceptionIds = new WeakMap<Value, number>();

  attachAgent(agent: Agent, priorRealms: ManagedRealm[]) {
    const oldOnDebugger = agent.hostDefinedOptions.onDebugger;
    agent.hostDefinedOptions.onDebugger = (reason) => {
      oldOnDebugger?.(reason);
      const pausedEvent: Protocol.Debugger.PausedEvent = {
        reason: reason?.reason ?? 'debugCommand',
        callFrames: this.#context.getDebuggerCallFrame(),
      };
      if (reason?.hitBreakpoints) {
        pausedEvent.hitBreakpoints = [...reason.hitBreakpoints];
      }
      this.sendEvent['Debugger.paused'](pausedEvent);
    };

    agent.hostDefinedOptions.hostHooks ??= {};
    agent.hostDefinedOptions.hostHooks.HostPromiseRejectionTrackers ??= new Set();
    const tracker: HostPromiseRejectionTracker = (promise, operation) => {
      if (operation === 'reject') {
        const detail = this.#context.createExceptionDetails(promise, true);
        this.#unhandledExceptionIds.set(promise, detail.exceptionId);
        this.sendEvent['Runtime.exceptionThrown']({
          timestamp: Date.now(),
          exceptionDetails: detail,
        });
      } else {
        const id = this.#unhandledExceptionIds.get(promise);
        if (id) {
          this.sendEvent['Runtime.exceptionRevoked']({
            reason: 'Handler added to rejected promise',
            exceptionId: id,
          });
        }
      }
    };
    agent.hostDefinedOptions.hostHooks.HostPromiseRejectionTrackers.add(tracker);

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
        agent.hostDefinedOptions.hostHooks!.HostPromiseRejectionTrackers!.delete(tracker);
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
      this.sendEvent['Runtime.consoleAPICalled']({
        timestamp: Date.now(),
        type: 'warning',
        executionContextId: 0,
        args: [{
          type: 'string',
          value: `engine262 internal error: Namespace not implemented: ${namespace}.*`,
        }],
      });
      return;
    }
    const ns = (impl as Record<string, object>)[namespace];
    if (!(method in ns)) {
      this.sendEvent['Runtime.consoleAPICalled']({
        timestamp: Date.now(),
        type: 'warning',
        executionContextId: 0,
        args: [{
          type: 'string',
          value: `engine262 internal error: Method not implemented: ${namespace}.${method}`,
        }],
      });
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
        if (this.#debuggerAttached) {
          this.send({ method: key, params });
        }
      };
      Object.defineProperty(this.sendEvent, key, { value: f });
      return f;
    },
  }));

  console(realm: Realm, type: Protocol.Runtime.ConsoleAPICalledEventType, args: Arguments) {
    const context = this.#context.getRealm(realm as ManagedRealm);
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

  #debuggerAttached = false;

  onDebuggerDisconnect() {
    this.#debuggerAttached = false;
  }

  #onDebuggerConnected() {
    this.#context.realms.forEach((realm) => {
      if (realm) {
        this.sendEvent['Runtime.executionContextCreated']({
          context: realm.descriptor,
        });
      }
    });
    this.#agents.forEach(({ agent }) => {
      agent.parsedSources.forEach((script, id) => {
        const realmId = this.#context.getRealm(script.Realm as ManagedRealm)?.descriptor.id;
        if (realmId === undefined) {
          return;
        }
        this.sendEvent['Debugger.scriptParsed'](getParsedEvent(script, id, realmId));
      });
    });
  }

  #debugContext: DebuggerContext = {
    sendEvent: this.sendEvent,
    preference: this.preference,
    context: this.#context,
    onDebuggerConnect: () => {
      if (!this.#debuggerAttached) {
        this.#debuggerAttached = true;
        this.#onDebuggerConnected();
      }
    },
    onDebuggerDisconnect: () => {
      this.#debuggerAttached = false;
    },
  };
}
