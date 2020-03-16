'use strict';

const { getContext } = require('./context');
const engine262 = require('..');

module.exports = {
  Debugger: {
    enable() {
      return { debuggerId: 'debugger.0' };
    },
    setAsyncCallStackDepth() {},
    setBlackboxPatterns() {},
    setPauseOnExceptions() {},
  },
  Profiler: {
    enable() {},
  },
  Runtime: {
    enable() {},
    compileScript() {
      return { scriptId: 'script.0' };
    },
    callFunctionOn(options) {
      const context = getContext(options.executionContextId);
      const { Value: F } = context.realm.evaluateScript(`(${options.functionDeclaration})`);
      const thisValue = options.objectId
        ? context.getObject(options.objectId)
        : engine262.Value.undefined;
      const args = options.arguments.map((a) => {
        if ('value' in a) {
          return new engine262.Value(context.realm, a.value);
        }
        if ('objectId' in a) {
          return context.getObject(a.objectId);
        }
        if ('unserializableValue' in a) {
          throw new RangeError();
        }
        return engine262.Value.undefined;
      });
      const r = engine262.Abstract.Call(F, thisValue, args);
      return context.createEvaluationResult(r, options);
    },
    evaluate(options) {
      if (options.throwOnSideEffect || options.awaitPromise) {
        return {
          exceptionDetails: {
            text: 'unsupported',
            lineNumber: 0,
            columnNumber: 0,
          },
        };
      }

      const context = getContext(options.contextId);
      const r = context.realm.evaluateScript(options.expression);
      return context.createEvaluationResult(r, options);
    },
    getHeapUsage() {
      return { usedSize: 0, totalSize: 0 };
    },
    getIsolateId() {
      return { id: 'isolate.0' };
    },
    getProperties(options) {
      const context = getContext();
      const object = context.getObject(options.objectId);

      const properties = context.getProperties(object, options);
      if (properties instanceof engine262.AbruptCompletion) {
        return context.createEvaluationResult(properties, options);
      }

      return { result: properties };
    },
    globalLexicalScopeNames({ executionContextId }) {
      const context = getContext(executionContextId);
      const envRec = context.realm.realm.GlobalEnv.EnvironmentRecord;
      const names = Map.prototype.keys.call(envRec.DeclarativeRecord.bindings);
      return {
        names: [...names],
      };
    },
    releaseObjectGroup({ objectGroup }) {
      getContext().releaseObjectGroup(objectGroup);
    },
    runIfWaitingForDebugger(params, ctx) {
      ctx.sendEvent('Runtime.executionContextCreated', {
        context: {
          id: '0',
          origin: 'file://',
          name: 'context.0',
          auxData: {},
        },
      });
    },
  },
  HeapProfiler: {
    enable() {},
    collectGarbage() {},
  },
};
