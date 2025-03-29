import type { DebuggerContext, DebuggerNamespace, RuntimeNamespace } from '../../lib/inspector/types.d.mts';
import { Inspector } from '#self/inspector';

export class TestInspector extends Inspector {
  messages: object[] = [];

  flush() {
    const old = this.messages;
    this.messages = [];
    return old;
  }

  onInspectorMessage?: (message: object) => void;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected override send(data: any): void {
    this.messages.push(data);
    if ('id' in data) {
      let meaningfulData = data;
      if (data.result) {
        meaningfulData = data.result;
        if (!data.result.exceptionDetails) {
          if (data.result.result && Object.keys(data.result).length <= 2) {
            meaningfulData = data.result.result;
          }
        }
      }
      this.#callbacks.at(data.id)?.resolve(meaningfulData);
    }
    this.onInspectorMessage?.(data);
  }

  protected override onMessage(id: number, method: string, params: object | void): void {
    super.onMessage(id, method, params);
    this.messages.push({ id, method, params });
  }

  debugger: {
    [T in keyof DebuggerNamespace]-?: (params: DebuggerNamespace[T] extends undefined | ((params: infer O, context: DebuggerContext) => unknown) ? O : void) => Promise<object>;
  };

  runtime: {
    [T in keyof RuntimeNamespace]-?: (params: RuntimeNamespace[T] extends undefined | ((params: infer O, context: DebuggerContext) => unknown) ? O : void) => Promise<object>;
  };

  #callbacks: PromiseWithResolvers<unknown>[] = [];

  constructor() {
    super();
    const object = (namespace: string) => Object.create(
      new Proxy({}, {
        get: (_, p, receiver) => {
          if (typeof p === 'symbol') {
            return undefined;
          }
          const f = (params: object) => {
            this.onMessage(this.#callbacks.length, `${namespace}.${p}`, params);
            const promise = Promise.withResolvers();
            this.#callbacks.push(promise);
            return promise.promise;
          };
          Reflect.defineProperty(receiver, p, { configurable: true, value: f });
          return f;
        },
      }),
    );
    this.runtime = object('Runtime');
    this.debugger = object('Debugger');
  }

  // helpers
  eval(expression: string) {
    return this.runtime.evaluate({
      expression,
      uniqueContextId: '0',
    });
  }

  perview(expression: string) {
    return this.runtime.evaluate({
      expression,
      uniqueContextId: '0',
      throwOnSideEffect: true,
    });
  }
}
