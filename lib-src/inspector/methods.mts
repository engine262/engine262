import type {
  DebuggerNamespace, HeapProfilerNamespace, ProfilerNamespace, RuntimeNamespace,
} from './types.mts';
import {
  Call, NormalCompletion, ObjectValue, ThrowCompletion, Value, type FunctionObject,
} from '#self';

export const Debugger: DebuggerNamespace = {
  enable(_req) {
    return { debuggerId: 'debugger.0' };
  },
  setAsyncCallStackDepth() { },
  setBlackboxPatterns() { },
  setPauseOnExceptions() { },
  setBlackboxExecutionContexts() { },
  setBreakpointByUrl() {
    return { breakpointId: '0', locations: [] };
  },
};
export const Profiler: ProfilerNamespace = {
  enable() { },
};
export const Runtime: RuntimeNamespace = {
  discardConsoleEntries() { },
  enable() { },
  compileScript() {
    return { scriptId: 'script.0' };
  },
  callFunctionOn(options, { getContext }) {
    const context = getContext(options.executionContextId);
    const { Value: F } = context.realm.evaluateScript(`(${options.functionDeclaration})`) as NormalCompletion<FunctionObject>;
    const thisValue = options.objectId
      ? context.getObject(options.objectId)!
      : Value.undefined;
    const args = options.arguments?.map((a) => {
      if ('value' in a) {
        return Value(a.value);
      }
      if (a.objectId) {
        return context.getObject(a.objectId)!;
      }
      if ('unserializableValue' in a) {
        throw new RangeError();
      }
      return Value.undefined;
    });
    const r = Call(F, thisValue, args || []);
    // @ts-expect-error
    return context.createEvaluationResult(r, options);
  },
  evaluate(options, { preference, getContext }) {
    if (options.awaitPromise || (!preference.preview && options.throwOnSideEffect)) {
      return {
        result: { type: 'undefined' },
        exceptionDetails: {
          text: 'unsupported', lineNumber: 0, columnNumber: 0, exceptionId: 0,
        },
      };
    }

    const context = getContext(options.contextId);
    // TODO: introduce devtool scoping
    const finalSource = options.throwOnSideEffect ? `{\n${options.expression}}\n` : options.expression;
    const r = context.realm.evaluateScript(finalSource, { inspectorPreview: options.throwOnSideEffect });
    // @ts-expect-error
    return context.createEvaluationResult(r, options);
  },
  getExceptionDetails(req, { getContext }) {
    const context = getContext();
    const object = context.getObject(req.errorObjectId)!;
    if (object instanceof ObjectValue) {
      return {
        // @ts-expect-error
        exceptionDetails: context.createExceptionDetails(ThrowCompletion(object), {}),
      };
    }
    return {
      exceptionDetails: {
        text: 'unsupported', lineNumber: 0, columnNumber: 0, exceptionId: 0,
      },
    };
  },
  getHeapUsage() {
    return {
      usedSize: 0, totalSize: 0, backingStorageSize: 0, embedderHeapUsedSize: 0,
    };
  },
  getIsolateId() {
    return { id: 'isolate.0' };
  },
  getProperties(options, { getContext }) {
    const context = getContext();
    const object = context.getObject(options.objectId)!;
    // @ts-expect-error
    return context.getProperties(object, options);
  },
  globalLexicalScopeNames({ executionContextId }, { getContext }) {
    const context = getContext(executionContextId);
    const envRec = context.realm.GlobalEnv;
    const names = Array.from(envRec.DeclarativeRecord.bindings.keys(), (v) => v.stringValue());
    return { names };
  },
  releaseObject(req, { getContext }) {
    getContext().releaseObject(req.objectId);
  },
  releaseObjectGroup({ objectGroup }, { getContext }) {
    getContext().releaseObjectGroup(objectGroup);
  },
  runIfWaitingForDebugger(_, ctx) {
    ctx.sendEvent['Runtime.executionContextCreated']({
      context: {
        id: 0,
        origin: 'eval',
        name: 'top',
        uniqueId: '',
      },
    });
  },
};
export const HeapProfiler: HeapProfilerNamespace = {
  enable() { },
  collectGarbage() { },
};
